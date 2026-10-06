"""Find the YouTube video that best matches a Spotify track.

YouTube Music "song" results are the auto-generated album uploads, so they are
searched first and scored on title, artist and duration. Plain YouTube search
is only a last resort.
"""

import re
import threading
import unicodedata
from difflib import SequenceMatcher

import yt_dlp
from ytmusicapi import YTMusic

import store
from models import ResolveResponse, TrackMeta

ACCEPT_SCORE = 0.65

# words that mark a different version of the song; penalised unless the
# Spotify title has them too
VERSION_WORDS = (
    "karaoke", "instrumental", "cover", "slowed", "sped up", "speed up",
    "reverb", "nightcore", "8d", "live", "remix", "acoustic", "piano",
    "lofi", "lo-fi", "bass boosted", "mashup", "tribute", "originally performed",
)

_local = threading.local()


def _ytmusic() -> YTMusic:
    # YTMusic keeps a requests.Session, so give each worker thread its own
    if not hasattr(_local, "ytm"):
        _local.ytm = YTMusic()
    return _local.ytm


def _normalize(s: str) -> str:
    # strip accents but keep non-Latin scripts (CJK, Devanagari, ...) intact
    s = "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"\((feat|ft|with)\.? [^)]*\)|\[(feat|ft|with)\.? [^\]]*\]", " ", s)
    s = re.sub(r" - .*(remaster|version|edit|mono|stereo).*$", " ", s)
    s = re.sub(r"[^\w\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _similarity(a: str, b: str) -> float:
    a, b = _normalize(a), _normalize(b)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    ratio = SequenceMatcher(None, a, b).ratio()
    # "Song" vs "Song (Official Audio)" style containment is still a strong match
    if a in b or b in a:
        ratio = max(ratio, 0.85)
    return ratio


def _score(track: TrackMeta, title: str, artists: list[str], duration: int | None) -> float:
    title_score = _similarity(track.title, title)

    wanted = {_normalize(a) for a in track.artists}
    got = {_normalize(a) for a in artists}
    if wanted & got:
        artist_score = 1.0
    elif got:
        artist_score = max(_similarity(w, g) for w in wanted for g in got)
    else:
        # plain YouTube results have no artist field; check the title instead
        artist_score = 0.7 if any(w and w in _normalize(title) for w in wanted) else 0.0

    if track.durationMs and duration:
        diff = abs(track.durationMs / 1000 - duration)
        duration_score = 1.0 if diff <= 3 else max(0.0, 1 - (diff - 3) / 30)
    else:
        duration_score = 0.5

    penalty = 0.0
    src, cand = track.title.lower(), title.lower()
    for word in VERSION_WORDS:
        if word in cand and word not in src:
            penalty += 0.3

    return 0.45 * title_score + 0.3 * artist_score + 0.25 * duration_score - penalty


def _best_ytmusic(track: TrackMeta, query: str) -> tuple[str, str, float] | None:
    results = _ytmusic().search(query, filter="songs", limit=5)
    best = None
    for r in results[:5]:
        if not r.get("videoId"):
            continue
        artists = [a["name"] for a in r.get("artists") or []]
        score = _score(track, r.get("title", ""), artists, r.get("duration_seconds"))
        if best is None or score > best[2]:
            best = (r["videoId"], r.get("title", ""), score)
    return best


def _best_youtube(track: TrackMeta) -> tuple[str, str, float] | None:
    query = f"{track.title} {track.artists[0]} audio"
    opts = {"quiet": True, "no_warnings": True, "extract_flat": True, "skip_download": True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(f"ytsearch5:{query}", download=False)
    best = None
    for e in info.get("entries") or []:
        if not e.get("id"):
            continue
        channel = e.get("channel") or e.get("uploader") or ""
        score = _score(track, e.get("title", ""), [channel.removesuffix(" - Topic")], e.get("duration"))
        if best is None or score > best[2]:
            best = (e["id"], e.get("title", ""), score)
    return best


def cache_key(track: TrackMeta) -> str:
    if track.spotifyId:
        return f"sp:{track.spotifyId}"
    if track.isrc:
        return f"isrc:{track.isrc.upper()}"
    return f"q:{_normalize(track.title)}|{_normalize(track.artists[0])}|{(track.durationMs or 0) // 5000}"


def resolve(track: TrackMeta) -> ResolveResponse:
    """Blocking; call from a worker thread."""
    key = cache_key(track)
    cached = store.get_resolved(key)
    if cached:
        return ResolveResponse(videoId=cached[0], title=cached[1], score=cached[2], source="cache")

    candidates: list[tuple[tuple[str, str, float], str]] = []

    hit = _best_ytmusic(track, f"{track.title} {' '.join(track.artists[:2])}")
    if hit:
        candidates.append((hit, "ytmusic"))
    # ISRC search on YouTube Music is hit-and-miss, so only try it when the
    # text search didn't produce a confident match
    if (not hit or hit[2] < ACCEPT_SCORE) and track.isrc:
        isrc_hit = _best_ytmusic(track, track.isrc)
        if isrc_hit:
            candidates.append((isrc_hit, "isrc"))
    if not any(c[0][2] >= ACCEPT_SCORE for c in candidates):
        yt_hit = _best_youtube(track)
        if yt_hit:
            candidates.append((yt_hit, "youtube"))

    if not candidates:
        raise LookupError(f"No YouTube match for {track.title} - {track.artists[0]}")

    (video_id, title, score), source = max(candidates, key=lambda c: c[0][2])
    # only remember confident matches so a bad one gets retried next time
    if score >= ACCEPT_SCORE:
        store.put_resolved(key, video_id, title, score)
    return ResolveResponse(videoId=video_id, title=title, score=round(score, 3), source=source)

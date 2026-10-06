"""Write Spotify metadata into the downloaded file so every player shows it."""

from mutagen.id3 import (
    APIC, COMM, ID3, TALB, TCON, TDRC, TIT2, TPE1, TPE2, TPOS, TRCK, TSRC,
)
from mutagen.mp4 import MP4, MP4Cover, MP4FreeForm

from models import TrackMeta

ARTIST_SEP = ", "


def _cover_format(data: bytes) -> int:
    return MP4Cover.FORMAT_PNG if data[:8] == b"\x89PNG\r\n\x1a\n" else MP4Cover.FORMAT_JPEG


def _pair(n: int | None, total: int | None) -> str:
    if not n:
        return ""
    return f"{n}/{total}" if total else str(n)


def tag_m4a(path: str, meta: TrackMeta, cover: bytes | None) -> None:
    audio = MP4(path)
    if audio.tags is None:
        audio.add_tags()
    tags = audio.tags

    tags["\xa9nam"] = [meta.title]
    tags["\xa9ART"] = [ARTIST_SEP.join(meta.artists)]
    tags["aART"] = [ARTIST_SEP.join(meta.albumArtists or meta.artists[:1])]
    if meta.album:
        tags["\xa9alb"] = [meta.album]
    if meta.releaseDate:
        tags["\xa9day"] = [meta.releaseDate]
    if meta.trackNumber:
        tags["trkn"] = [(meta.trackNumber, meta.totalTracks or 0)]
    if meta.discNumber:
        tags["disk"] = [(meta.discNumber, 0)]
    if meta.genres:
        tags["\xa9gen"] = [meta.genres[0].title()]
    if meta.spotifyUrl:
        tags["\xa9cmt"] = [meta.spotifyUrl]
    # iTunes advisory rating: 1 = explicit
    tags["rtng"] = [1 if meta.explicit else 0]
    if meta.isrc:
        tags["----:com.apple.iTunes:ISRC"] = [MP4FreeForm(meta.isrc.encode())]
    if cover:
        tags["covr"] = [MP4Cover(cover, imageformat=_cover_format(cover))]
    audio.save()


def tag_mp3(path: str, meta: TrackMeta, cover: bytes | None) -> None:
    # a fresh tag replaces whatever ffmpeg wrote on save
    tags = ID3()

    tags.add(TIT2(encoding=3, text=meta.title))
    tags.add(TPE1(encoding=3, text=ARTIST_SEP.join(meta.artists)))
    tags.add(TPE2(encoding=3, text=ARTIST_SEP.join(meta.albumArtists or meta.artists[:1])))
    if meta.album:
        tags.add(TALB(encoding=3, text=meta.album))
    if meta.releaseDate:
        tags.add(TDRC(encoding=3, text=meta.releaseDate))
    if meta.trackNumber:
        tags.add(TRCK(encoding=3, text=_pair(meta.trackNumber, meta.totalTracks)))
    if meta.discNumber:
        tags.add(TPOS(encoding=3, text=str(meta.discNumber)))
    if meta.genres:
        tags.add(TCON(encoding=3, text=meta.genres[0].title()))
    if meta.isrc:
        tags.add(TSRC(encoding=3, text=meta.isrc))
    if meta.spotifyUrl:
        tags.add(COMM(encoding=3, lang="eng", desc="", text=meta.spotifyUrl))
    if cover:
        mime = "image/png" if _cover_format(cover) == MP4Cover.FORMAT_PNG else "image/jpeg"
        tags.add(APIC(encoding=3, mime=mime, type=3, desc="Cover", data=cover))
    # v2.3 has the widest player support (Windows Explorer, older car stereos)
    tags.save(path, v2_version=3)


def tag(path: str, meta: TrackMeta, cover: bytes | None) -> None:
    if path.endswith(".mp3"):
        tag_mp3(path, meta, cover)
    else:
        tag_m4a(path, meta, cover)

import asyncio
import hashlib
import os
import re
import shutil
import tempfile
import time
from contextlib import asynccontextmanager
from urllib.parse import quote, urlparse

import httpx
import yt_dlp
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

import downloader
import resolver
import settings
import tagger
from models import ResolveRequest, ResolveResponse, TrackMeta, TrackRequest

TMP_DIR = os.path.join(settings.DATA_DIR, "tmp")
COVER_HOSTS = (".scdn.co", ".spotifycdn.com")
MEDIA_TYPES = {"m4a": "audio/mp4", "mp3": "audio/mpeg"}
TOKEN_CACHE_TTL = 600

http: httpx.AsyncClient
download_slots = asyncio.Semaphore(settings.MAX_CONCURRENT_DOWNLOADS)
# sha256(token) -> expiry; avoids hitting Spotify on every request
valid_tokens: dict[str, float] = {}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global http
    # leftovers from a crash mid-download
    shutil.rmtree(TMP_DIR, ignore_errors=True)
    os.makedirs(TMP_DIR, exist_ok=True)
    http = httpx.AsyncClient(timeout=10, follow_redirects=True)
    yield
    await http.aclose()


app = FastAPI(title="spotinext", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["Content-Disposition", "Content-Length", "X-Video-Id"],
)


async def require_spotify_user(request: Request) -> None:
    if not settings.REQUIRE_SPOTIFY_AUTH:
        return
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(401, "Missing Spotify access token")
    key = hashlib.sha256(auth[7:].strip().encode()).hexdigest()

    now = time.time()
    if valid_tokens.get(key, 0) > now:
        return
    res = None
    for _ in range(2):
        try:
            res = await http.get("https://api.spotify.com/v1/me", headers={"Authorization": auth})
            break
        except httpx.TransportError:
            continue
    if res is None or res.status_code >= 500 or res.status_code == 429:
        raise HTTPException(503, "Couldn't verify the Spotify session, try again")
    if res.status_code != 200:
        raise HTTPException(401, "Invalid Spotify access token")

    if len(valid_tokens) > 10_000:
        for k in [k for k, exp in valid_tokens.items() if exp <= now]:
            del valid_tokens[k]
    valid_tokens[key] = now + TOKEN_CACHE_TTL


async def fetch_cover(url: str | None) -> bytes | None:
    if not url:
        return None
    parsed = urlparse(url)
    # only Spotify's image CDN, so this can't be used to make the server fetch arbitrary URLs
    if parsed.scheme != "https" or not (parsed.hostname or "").endswith(COVER_HOSTS):
        return None
    try:
        res = await http.get(url)
        res.raise_for_status()
        return res.content
    except httpx.HTTPError:
        return None


def _safe_filename(s: str) -> str:
    return re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", s).strip(" .")[:180] or "track"


def _content_disposition(track: TrackMeta, ext: str) -> str:
    name = _safe_filename(f"{', '.join(track.artists)} - {track.title}") + f".{ext}"
    ascii_name = name.encode("ascii", "replace").decode().replace("?", "_")
    return f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(name)}"


async def _resolve(track: TrackMeta) -> ResolveResponse:
    try:
        return await asyncio.to_thread(resolver.resolve, track)
    except LookupError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(502, f"YouTube search failed: {e}")


@app.get("/ping")
async def ping():
    return {"status": "ok"}


@app.post("/resolve", response_model=ResolveResponse, dependencies=[Depends(require_spotify_user)])
async def resolve(body: ResolveRequest):
    return await _resolve(body.track)


@app.post("/track", dependencies=[Depends(require_spotify_user)])
async def track(body: TrackRequest):
    video_id = body.videoId or (await _resolve(body.track)).videoId

    async with download_slots:
        workdir = tempfile.mkdtemp(dir=TMP_DIR)
        try:
            path, cover = await asyncio.gather(
                asyncio.to_thread(downloader.download, video_id, workdir, body.format),
                fetch_cover(body.track.coverUrl),
            )
            await asyncio.to_thread(tagger.tag, path, body.track, cover)
            with open(path, "rb") as f:
                data = f.read()
        except yt_dlp.utils.DownloadError as e:
            raise HTTPException(502, f"YouTube download failed: {e.msg or e}")
        except Exception as e:
            raise HTTPException(502, f"Download failed: {e}")
        finally:
            shutil.rmtree(workdir, ignore_errors=True)

    return Response(
        data,
        media_type=MEDIA_TYPES[body.format],
        headers={
            "Content-Disposition": _content_disposition(body.track, body.format),
            "X-Video-Id": video_id,
        },
    )

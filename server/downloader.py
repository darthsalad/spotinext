import os
import shutil

import yt_dlp

import settings

YTDLP_CACHE_DIR = os.path.join(settings.DATA_DIR, "yt-dlp")


def _opts(workdir: str, fmt: str) -> dict:
    opts: dict = {
        "outtmpl": os.path.join(workdir, "%(id)s.%(ext)s"),
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "noplaylist": True,
        # keep the solved player challenges between restarts (mount DATA_DIR in Docker)
        "cachedir": YTDLP_CACHE_DIR,
    }
    if settings.FORCE_IPV4:
        # stream URLs are bound to the requesting IP; rotating IPv6 privacy
        # addresses can make the download come from a different one (403)
        opts["source_address"] = "0.0.0.0"
    if settings.DENO_PATH:
        opts["js_runtimes"] = {"deno": {"path": settings.DENO_PATH}}

    if fmt == "mp3":
        opts["format"] = "bestaudio/best"
        # VBR V0: the source is ~130kbps AAC/Opus, so CBR 320 only adds size
        opts["postprocessors"] = [
            {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "0"}
        ]
    else:
        # itag 140 (AAC in m4a) exists for virtually every video, and needs only
        # a remux. The postprocessor is a no-op for it and only transcodes the
        # rare Opus-only video.
        opts["format"] = "bestaudio[ext=m4a]/bestaudio/best"
        opts["postprocessors"] = [{"key": "FFmpegExtractAudio", "preferredcodec": "m4a"}]
    return opts


def _clear(workdir: str) -> None:
    for name in os.listdir(workdir):
        path = os.path.join(workdir, name)
        shutil.rmtree(path) if os.path.isdir(path) else os.remove(path)


def download(video_id: str, workdir: str, fmt: str, attempts: int = 2) -> str:
    """Blocking; download one video's audio into workdir and return the file path."""
    url = f"https://www.youtube.com/watch?v={video_id}"
    for attempt in range(attempts):
        try:
            with yt_dlp.YoutubeDL(_opts(workdir, fmt)) as ydl:
                ydl.extract_info(url, download=True)
            break
        except yt_dlp.utils.DownloadError as e:
            # YouTube occasionally hands out a stream URL that 403s; a fresh
            # extraction gets a new one and almost always works
            if "403" not in str(e) or attempt == attempts - 1:
                raise
            _clear(workdir)

    files = [f for f in os.listdir(workdir) if f.endswith(f".{fmt}")]
    if not files:
        raise FileNotFoundError(f"yt-dlp produced no .{fmt} for {video_id}")
    return os.path.join(workdir, files[0])

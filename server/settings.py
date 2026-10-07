import os
import shutil
import sys


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _find_deno() -> str | None:
    # prefer one on PATH (Docker image), fall back to the pip-installed one in the venv
    found = shutil.which("deno")
    if found:
        return found
    candidate = os.path.join(os.path.dirname(sys.executable), "deno")
    return candidate if os.path.exists(candidate) else None


ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("ALLOWED_ORIGINS", "http://127.0.0.1:5173").split(",")
    if o.strip()
]
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(os.path.dirname(__file__), "data"))
MAX_CONCURRENT_DOWNLOADS = int(os.environ.get("MAX_CONCURRENT_DOWNLOADS", "3"))
# reject requests that don't carry a valid Spotify access token, so the server
# can't be used as a free public downloader
REQUIRE_SPOTIFY_AUTH = _env_bool("REQUIRE_SPOTIFY_AUTH", True)
# download from YouTube over IPv4; see downloader._opts
FORCE_IPV4 = _env_bool("FORCE_IPV4", True)
DENO_PATH = _find_deno()
# Netscape cookies.txt from a throwaway YouTube account; used only if it exists.
# In Docker, entrypoint.sh writes it from the YT_COOKIES secret.
YT_COOKIES_FILE = os.environ.get("YT_COOKIES_FILE") or os.path.join(DATA_DIR, "cookies.txt")

os.makedirs(DATA_DIR, exist_ok=True)

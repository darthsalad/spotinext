# SpotiNext - Spotify Music Downloader

See your Spotify stats and download what's playing, your top tracks or whole playlists, fully tagged with album art.

## How it works

```
web/     Vite + React SPA (static hosting)
         ├─ Spotify login (PKCE) and API calls straight from the browser
         └─ asks the server for audio, saves files / builds playlist zips itself
server/  FastAPI (stateless)
         ├─ POST /resolve  Spotify track → best YouTube Music match (cached in SQLite)
         └─ POST /track    download m4a/mp3 with yt-dlp, tag it, stream it back
```

- **Fast by default:** M4A (AAC) is YouTube's original audio, so it's only remuxed, never re-encoded. MP3 is optional and slower.
- **Tags come from Spotify:** title, artists, album artist, album, release date, track/disc number, genre, ISRC, explicit flag and 640px cover art.
- **Playlists:** on Chromium the files are written straight into a folder you pick. Other browsers get a `.zip`.
- **The server holds no job state.** The browser drives everything, so the server can be restarted or scaled freely.

## Setup

### Spotify app

Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and add the redirect URI `http://127.0.0.1:5173/`, plus your production URL when you deploy. Spotify only accepts `http://` redirect URIs on loopback IPs, so use `127.0.0.1`, not `localhost`.

### Server

Requires Python 3.11+ and `ffmpeg` on `PATH`.

```bash
cd server
python -m venv .venv
.venv/bin/pip install -r requirements-dev.txt   # includes deno for yt-dlp
cp .env.example .env
.venv/bin/uvicorn main:app --port 8080 --env-file .env --reload
```

### Web

```bash
cd web
bun install        # or npm install
cp .env.example .env   # set VITE_SPOTIFY_CLIENT_ID
bun run dev        # http://127.0.0.1:5173
```

### Docker (server)

```bash
cd server
docker build -t spotinext-server .
docker run -p 8080:8080 -v spotinext-data:/app/data \
  -e ALLOWED_ORIGINS=https://your-site.example spotinext-server
```

yt-dlp is unpinned on purpose, because YouTube breaks it regularly. Rebuild the image to pick up fixes.

## Environment variables

| Where | Variable | Purpose |
|---|---|---|
| web | `VITE_SPOTIFY_CLIENT_ID` | Spotify app client ID |
| web | `VITE_SERVER_URL` | Download server URL (default `http://127.0.0.1:8080`) |
| web | `VITE_SPOTIFY_REDIRECT_URI` | Optional; defaults to the page origin + `/` |
| server | `ALLOWED_ORIGINS` | Comma-separated origins allowed by CORS |
| server | `MAX_CONCURRENT_DOWNLOADS` | Parallel YouTube downloads (default 3) |
| server | `REQUIRE_SPOTIFY_AUTH` | Require a valid Spotify token on `/resolve` and `/track` (default true) |
| server | `FORCE_IPV4` | Download from YouTube over IPv4 (default true; avoids 403s from rotating IPv6 addresses) |
| server | `DATA_DIR` | Match cache and yt-dlp cache location (default `server/data`) |

## License

[MIT](https://choosealicense.com/licenses/mit/)

## Author

- [Piyush Mishra](https://github.com/darthsalad)

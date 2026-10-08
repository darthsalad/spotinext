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

## Deploying

### API on Fly.io

```bash
cd server
fly apps create spotinext-api                 # or change `app` in fly.toml
fly volumes create spotinext_data --region sin --size 1
fly deploy
fly certs add api.yourdomain.com              # then point a CNAME at spotinext-api.fly.dev
```

Set `ALLOWED_ORIGINS` in `fly.toml` to the site's origin. Redeploy (`fly deploy`) every so often to pick up the latest yt-dlp.

YouTube blocks most datacenter IPs. The image therefore runs a PO token provider ([bgutil](https://github.com/Brainicism/bgutil-ytdlp-pot-provider)) on `127.0.0.1:4416` and can use cookies from a **throwaway** YouTube account:

1. In a private browser window, log in to the throwaway account and open `https://www.youtube.com/robots.txt`.
2. Export youtube.com cookies in Netscape format (e.g. the "Get cookies.txt LOCALLY" extension), then close the window without logging out.
3. Store the file as a secret: `fly secrets set YT_COOKIES="$(base64 -w0 cookies.txt)"`, then delete the local file.

The account may get flagged, and the cookies need re-exporting when downloads start failing again.

### Site on Vercel

Set the project's root directory to `web` (Vercel detects Vite), then set these environment variables:

- `VITE_SPOTIFY_CLIENT_ID`
- `VITE_SERVER_URL=https://api.yourdomain.com` (or `https://spotinext-api.fly.dev`)

These are baked in at build time, so redeploy after changing them. Also add `https://<your-site>/` as a redirect URI in the Spotify dashboard.

### User activity in Vercel

Enable **Web Analytics** for the Vercel project and deploy the site. Custom events require a Pro or Enterprise plan; see [Vercel's analytics limits](https://vercel.com/docs/analytics/limits-and-pricing). In the project's **Analytics → Events** panel, click an event to see its properties and filter the overview. Events appear after users perform the actions on the deployed site.

| Events | What they measure / properties |
|---|---|
| `login_started`, `login_completed`, `login_failed` | Spotify authorization redirect, successful token exchange, or callback failure. `provider`; failures also include a categorical `reason`. Returning with an existing session and refreshing tokens do not count as logins. |
| `logout` | Session cleared, once per logged-in session. `reason`: `manual`, `session_expired`, or `refresh_failed`. |
| `track_download_started`, `track_download_completed`, `track_download_failed`, `track_download_cancelled` | Individual tracks, including each track in a bulk download. `track`: title and artists; `context`: source and format, e.g. `now_playing:m4a`, `top_tracks:mp3`, `playlist_track:m4a`, or `playlist_bulk:m4a`. |
| `playlist_opened` | Playlist browsing. `playlist_id`, `track_count`. |
| `playlists_show_more` | User expands the homepage playlist list. `visible_count` before expansion. |
| `playlist_download_started` | Download all clicked. `playlist_id`, `format`. |
| `playlist_download_completed`, `playlist_download_partial` | All tracks saved, or some tracks failed. `playlist_id`, `downloaded_tracks`. |
| `playlist_download_failed` | Playlist loading/saving failed, every track failed, or the playlist had no downloadable tracks. `playlist_id`, categorical `reason`. |
| `playlist_download_cancelled` | Folder picker dismissed, Cancel clicked, dialog closed, or homepage unmounted during a download. `playlist_id`, `stage`. |
| `preference_changed` | User changes format or theme. `preference`, `value`. |
| `stats_range_changed` | User changes the top tracks/artists time range. `range`. |
| `spotify_link_opened` | User opens a track, artist, or profile on Spotify. `type`, `source`. |

To see popular downloads, open `track_download_completed` and inspect the `track` breakdown; use `context` to compare download locations and formats. Compare started/completed/failed/cancelled events to understand outcomes. Folder completion means the file was written and closed; single-track and ZIP completion means the browser was given the file to save, since browser save-dialog outcomes aren't observable. Buffered ZIP tracks count as completed only when the ZIP is handed off, and as cancelled if the ZIP is abandoned.

Events use at most two flat properties and truncate strings to Vercel's 255-character limit. They omit tokens, authorization codes/state, account identifiers, playlist names, and raw error messages. Page views remain automatic; background polling, pre-resolving tracks, and unchanged preferences do not emit custom events. Analytics provides aggregate activity, rather than identifiable user histories, and blocked analytics scripts cannot interrupt downloads or authentication.

For local verification, run `cd web && bun test`. Vercel's development script also logs events in the browser console without adding them to production analytics.

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

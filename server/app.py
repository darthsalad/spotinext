import os
import re
import time
import uuid
import shutil
import tarfile
import tempfile
import threading
import logger
import metadata
import urllib.parse
import yt_dlp as youtube_dl
from concurrent.futures import ThreadPoolExecutor, as_completed
from flask_cors import CORS
from flask import (
    Flask,
    jsonify,
    request,
    after_this_request,
    make_response,
    send_file,
)


app = Flask(__name__)
CORS(
    app,
    resources={
        r"/*": {
            "origins": "*",
            "supports_credentials": True,
            "expose_headers": "*",
            "allow_headers": "*",
            "methods": ["GET", "POST", "OPTIONS"],
        }
    },
)

# job store: { job_id: { status, done, total, failed, tmpdir, archive_path } }
jobs: dict = {}
jobs_lock = threading.Lock()


def _safe_filename(s: str) -> str:
    return re.sub(r'[<>:"/\\|?*\x00-\x1f`]', "_", s).strip()


def _log(job_id: str, msg: str):
    prefix = f"[{job_id[:8]}]"
    print(f"{prefix} {msg}", flush=True)


def download_one(name: str, artist: str, dest_dir: str, job_id: str = "") -> str:
    """Download a single track to dest_dir. Returns the final mp3 path."""
    query = f"{name} {urllib.parse.unquote_plus(str(artist))} Official Audio"
    label = f"{name} — {artist}"

    _log(job_id, f"  ↓  Searching: {label}")
    t0 = time.time()

    track_dir = tempfile.mkdtemp(dir=dest_dir)
    try:
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": os.path.join(track_dir, "%(title)s.%(ext)s"),
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "320",
                }
            ],
            "logger": logger.MyLogger(),
            "progress_hooks": [logger.my_hook],
            "quiet": True,
            "no_warnings": True,
        }
        with youtube_dl.YoutubeDL(ydl_opts) as ydl:
            ydl.extract_info(f"ytsearch:{query}", download=True)

        mp3_files = [f for f in os.listdir(track_dir) if f.endswith(".mp3")]
        if not mp3_files:
            raise FileNotFoundError(f"yt-dlp produced no mp3 for: {label}")

        _log(job_id, f"  ⟳  Fetching metadata: {label}")
        final_name = f"{_safe_filename(name)} - {_safe_filename(artist)}.mp3"
        final_path = os.path.join(dest_dir, final_name)
        shutil.move(os.path.join(track_dir, mp3_files[0]), final_path)

        metadata.fetch_track_details(name, artist, final_path)

        elapsed = time.time() - t0
        _log(job_id, f"  ✓  Done ({elapsed:.1f}s): {label}")
        return final_path
    finally:
        shutil.rmtree(track_dir, ignore_errors=True)


def run_playlist_job(job_id: str, tracks: list):
    total = len(tracks)
    job_start = time.time()

    _log(job_id, f"━━ Starting: {total} tracks (5 parallel workers)")

    with jobs_lock:
        jobs[job_id]["status"] = "downloading"

    tmpdir = jobs[job_id]["tmpdir"]
    done_count = 0
    failed_list: list = []

    def worker(track):
        try:
            download_one(track["name"], track["artist"], tmpdir, job_id)
            return (track["name"], None)
        except Exception as e:
            _log(job_id, f"  ✗  Failed: {track['name']} — {e}")
            return (track["name"], str(e))

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(worker, t): t for t in tracks}
        for future in as_completed(futures):
            track_name, error = future.result()
            with jobs_lock:
                if error:
                    jobs[job_id]["failed"].append(track_name)
                    failed_list.append(track_name)
                jobs[job_id]["done"] += 1
                done_count = jobs[job_id]["done"]

            _log(
                job_id,
                f"  ▸  Progress: {done_count}/{total}"
                + (f"  (failed: {len(failed_list)})" if failed_list else ""),
            )

    _log(job_id, f"⟳  Compressing {done_count - len(failed_list)} tracks …")
    with jobs_lock:
        jobs[job_id]["status"] = "compressing"

    archive_path = os.path.join(tmpdir, "playlist.tar.gz")

    # compresslevel=1: fastest gzip (mp3 is already compressed; higher levels
    # give <2% extra reduction but take significantly longer to compress).
    with tarfile.open(archive_path, "w:gz", compresslevel=1) as tar:
        for f in sorted(os.listdir(tmpdir)):
            if f.endswith(".mp3"):
                tar.add(os.path.join(tmpdir, f), arcname=f)

    size_mb = os.path.getsize(archive_path) / (1024 * 1024)
    elapsed_total = time.time() - job_start
    _log(
        job_id,
        f"✓  Complete — {archive_path}  "
        f"{size_mb:.1f} MB  {elapsed_total:.1f}s  "
        f"({len(failed_list)} failed)",
    )

    with jobs_lock:
        jobs[job_id]["status"] = "complete"
        jobs[job_id]["archive_path"] = archive_path


@app.route("/", methods=["GET"])
def home():
    return "Hello World!"


@app.route("/ping", methods=["GET"])
def ping():
    return jsonify({"status": "ok", "jobs": len(jobs)}), 200


@app.route("/song", methods=["GET", "OPTIONS"])
def get_song_details():
    try:
        song_name = request.args.get("name")
        artist = request.args.get("artist")
        query = f"{song_name} {urllib.parse.unquote_plus(str(artist))} Official Audio"
        file_name = f"{song_name} - {artist} (Official Audio)"
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": file_name + ".%(ext)s",
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "320",
                }
            ],
            "logger": logger.MyLogger(),
            "progress_hooks": [logger.my_hook],
        }
        with youtube_dl.YoutubeDL(ydl_opts) as ydl:
            ydl.extract_info(f"ytsearch:{query}", download=True)

        metadata.fetch_track_details(song_name, artist, f"{file_name}.mp3")

        for file in os.listdir():
            if file.endswith(".mp3"):
                response = send_file(file, as_attachment=True)

                @after_this_request
                def end_action(response):
                    response.headers["Access-Control-Allow-Origin"] = "*"
                    response.headers["Access-Control-Allow-Credentials"] = "true"
                    return response

                response.headers["Access-Control-Allow-Origin"] = "*"
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Expose-Headers"] = (
                    "Content-Disposition"
                )
                return response, 200
        return jsonify({"message": "No MP3 File Found..."})

    except Exception as e:
        return make_response(jsonify({"message": e.__class__.__name__}), 500)


@app.route("/playlist", methods=["POST", "OPTIONS"])
def start_playlist_download():
    try:
        data = request.get_json()
        tracks = data.get("tracks", [])
        if not tracks:
            return make_response(jsonify({"message": "No tracks provided"}), 400)

        job_id = str(uuid.uuid4())
        tmpdir = tempfile.mkdtemp()

        with jobs_lock:
            jobs[job_id] = {
                "status": "pending",
                "done": 0,
                "total": len(tracks),
                "failed": [],
                "tmpdir": tmpdir,
                "archive_path": None,
            }

        thread = threading.Thread(
            target=run_playlist_job, args=(job_id, tracks), daemon=True
        )
        thread.start()

        _log(job_id, f"Job created for {len(tracks)} tracks")
        return jsonify({"job_id": job_id}), 202

    except Exception as e:
        return make_response(jsonify({"message": e.__class__.__name__}), 500)


@app.route("/playlist/<job_id>/status", methods=["GET"])
def playlist_status(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
    if not job:
        return make_response(jsonify({"message": "Job not found"}), 404)
    return jsonify(
        {
            "status": job["status"],
            "done": job["done"],
            "total": job["total"],
            "failed": job["failed"],
        }
    )


@app.route("/playlist/<job_id>/file", methods=["GET"])
def playlist_file(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
    if not job:
        return make_response(jsonify({"message": "Job not found"}), 404)
    if job["status"] != "complete":
        return make_response(jsonify({"message": "Job not complete yet"}), 409)

    archive_path = job["archive_path"]
    tmpdir = job["tmpdir"]

    def cleanup_after():
        shutil.rmtree(tmpdir, ignore_errors=True)
        with jobs_lock:
            jobs.pop(job_id, None)

    response = send_file(
        archive_path,
        as_attachment=True,
        download_name="playlist.tar.gz",
        mimetype="application/gzip",
    )

    @after_this_request
    def after(resp):
        threading.Thread(target=cleanup_after, daemon=True).start()
        return resp

    return response


@app.route("/cleanup", methods=["GET", "OPTIONS"])
def cleanup():
    try:
        for file in os.listdir():
            if file.endswith(".mp3") or file.endswith(".webm") or file.endswith(".jpg"):
                os.remove(file)
        return make_response(jsonify({"message": "Cleanup Successful"}), 200)
    except Exception as e:
        print(e)
        return make_response(jsonify({"message": e.__class__.__name__}), 500)


if __name__ == "__main__":
    app.run(debug=True, port=8080, host="0.0.0.0", load_dotenv=True, threaded=True)

import os
import requests
import urllib.parse
import yt_dlp as youtube_dl
from flask_cors import CORS
from dotenv import load_dotenv
from flask import Flask, send_file, Response, jsonify, request

load_dotenv()
key = os.environ.get("YT_DATA_API")

app = Flask(__name__)
CORS(app)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin')
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

@app.route("/song", methods=["GET"])
def get_song_details():
    song_name = request.args.get("name")
    artist = request.args.get("artist")
    url = "https://www.googleapis.com/youtube/v3/search"
    response = requests.get(
        url,
        params={
            "part": "snippet",
            "q": f"{song_name} {urllib.parse.unquote_plus(artist)} Official Audio",
            "key": key,
            "type": "video",
            "maxResults": 1,
        },
    )

    json_data = response.json()
    video_id = json_data["items"][0]["id"]["videoId"]

    class MyLogger(object):
        def debug(self, msg):
            pass

        def warning(self, msg):
            pass

        def error(self, msg):
            print(msg)

    def my_hook(d):
        if d["status"] == "finished":
            print("Done downloading, now converting ...")

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": "%(title)s.%(ext)s",
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ],
        "logger": MyLogger(),
        "progress_hooks": [my_hook],
    }

    with youtube_dl.YoutubeDL(ydl_opts) as ydl:
        ydl.download([f"https://www.youtube.com/watch?v={video_id}"])

    for file in os.listdir():
        if file.endswith(".mp3"):
            return send_file(file, as_attachment=True)


@app.route("/cleanup", methods=["GET"])
def cleanup():
    for file in os.listdir():
        if file.endswith(".mp3") or file.endswith(".webm"):
            os.remove(file)

    return jsonify({"message": "Cleanup successful"}), 200

if __name__ == "__main__":
    app.run(debug=True, port=8080)

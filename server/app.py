import os
import requests
import urllib.parse
import yt_dlp as youtube_dl
from dotenv import load_dotenv
from flask import Flask, send_file, jsonify, request, after_this_request

load_dotenv()
key = os.environ.get("YT_DATA_API")

app = Flask(__name__)
app.config["CORS_HEADERS"] = "Content-Type"
app.config["Access-Control-Allow-Origin"] = "https://spotinext.vercel.app"
app.config["Access-Control-Allow-Credentials"] = "true"

@app.after_request
def apply_caching(response):
    response.headers["Access-Control-Allow-Origin"] = "https://spotinext.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    return response
        

@app.route("/", methods=["GET"])
def home():
    return "Hello World!"


@app.route("/song", methods=["GET"]) # type: ignore
def get_song_details():
    song_name = request.args.get("name")
    artist = request.args.get("artist")
    url = "https://www.googleapis.com/youtube/v3/search"
    response = requests.get(
        url,
        params={
            "part": "snippet",
            "q": f"{song_name} {urllib.parse.unquote_plus(str(artist))} Official Audio",
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
            response = send_file(file, as_attachment=True)
            @after_this_request
            def end_action(response):
                @response.call_on_close
                def cleanup():
                    try:
                        os.remove(file)
                        print("removed file")
                    except Exception as e:
                        print(e)
            return response


# @app.route("/cleanup", methods=["GET"])
# def cleanup():
#     for file in os.listdir():
#         if file.endswith(".mp3") or file.endswith(".webm"):
#             os.remove(file)

#     response = jsonify({"message": "Cleanup successful"})
#     response.headers.add("Access-Control-Allow-Origin", "*")
#     response.headers.add("Access-Control-Allow-Credentials", "true")
#     response.headers.add("Access-Control-Allow-Headers", "*")
#     response.headers.add("Access-Control-Allow-Methods", "*")
#     return response


if __name__ == "__main__":
    app.run(debug=True, port=8080, host="0.0.0.0", load_dotenv=True)

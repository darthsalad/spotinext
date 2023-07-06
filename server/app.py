import os
import codecs
import requests
import urllib.parse
import yt_dlp as youtube_dl
from dotenv import load_dotenv
from flask_cors import CORS
from flask import Flask, jsonify, request, after_this_request, make_response

load_dotenv()
key = os.environ.get("YT_DATA_API")

app = Flask(__name__)
CORS(
    app,
    resources={
        r"/*": {
            "origins": "*",
            "supports_credentials": True,
            "expose_headers": "*",
            "allow_headers": "*",
            "methods": ["GET", "OPTIONS"],
        }
    },
)

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


@app.route("/", methods=["GET"])
def home():
    return "Hello World!"


@app.route("/song", methods=["GET", "OPTIONS"]) # type: ignore
def get_song_details():
    try:
        song_name = request.args.get("name")
        artist = request.args.get("artist")
        url = "https://www.googleapis.com/youtube/v3/search"
        res = requests.get(
            url,
            params={
                "part": "snippet",
                "q": f"{song_name} {urllib.parse.unquote_plus(str(artist))} Official Audio",
                "key": key,
                "type": "video",
                "maxResults": 1,
            },
        )

        json_data = res.json()
        print(json_data)
        video_id = json_data["items"][0]["id"]["videoId"]

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
                file_data = codecs.open(file, "rb").read()
                response = make_response()
                response.data = file_data
                @after_this_request
                def end_action(response):
                    @response.call_on_close
                    def cleanup():
                        try:
                            os.remove(file)
                            print("Deleted temp file.", file)
                        except Exception as e:
                            print(e)
                    response.headers["Access-Control-Allow-Origin"] = "*"
                    response.headers["Access-Control-Allow-Credentials"] = "true"
                    return response
                response.headers["Access-Control-Allow-Origin"] = "*"
                response.headers["Access-Control-Allow-Credentials"] = "true"
                return response, 200
            else:
                response = jsonify({"message": "No MP3 File Found..."})

    except Exception as e:
        print("Error", e)
        return make_response(jsonify({"message": "Something went wrong..."}), 500)

if __name__ == "__main__":
    app.run(debug=True, port=8080, host="0.0.0.0", load_dotenv=True)

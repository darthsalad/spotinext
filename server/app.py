import os
import urllib.parse
import yt_dlp as youtube_dl
from dotenv import load_dotenv
from flask_cors import CORS
from flask import Flask, jsonify, request, after_this_request, make_response, send_file

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
            "logger": MyLogger(),
            "progress_hooks": [my_hook],
        }

        with youtube_dl.YoutubeDL(ydl_opts) as ydl:
            ydl.extract_info(f"ytsearch:{query}", download=True)

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
                response.headers["Access-Control-Expose-Headers"] = "Content-Disposition"
                return response, 200
            else:
                response = jsonify({"message": "No MP3 File Found..."})

    except Exception as e:
        return make_response(jsonify({"message": e.__class__.__name__}), 500)
    
@app.route("/cleanup", methods=["GET", "OPTIONS"])
def cleanup():
    try:
        for file in os.listdir():
            if file.endswith(".mp3") or file.endswith(".webm"):
                os.remove(file)
        return make_response(jsonify({"message": "Cleanup Successful"}), 200)
    except Exception as e:
        print(e)
        return make_response(jsonify({"message": e.__class__.__name__}), 500)
        

if __name__ == "__main__":
    app.run(debug=True, port=8080, host="0.0.0.0", load_dotenv=True)

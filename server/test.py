import os
import requests
from dotenv import load_dotenv
import youtube_dl

load_dotenv()
key = os.environ.get("YT_DATA_API")

url = "https://www.googleapis.com/youtube/v3/search"
response = requests.get(
    url,
    params={
        "part": "snippet",
        "q": "Devin Kennedy Forget About You Official Audio",
        "key": key,
        "type": "video",
        "maxResults": 1,
    },
)

json_data=response.json()
print(f"Video ID: {json_data['items'][0]['id']['videoId']}")
video_id=json_data['items'][0]['id']['videoId']

class MyLogger(object):
    def debug(self, msg):
        pass

    def warning(self, msg):
        pass

    def error(self, msg):
        print(msg)


def my_hook(d):
    if d['status'] == 'finished':
        print('Done downloading, now converting ...')

ydl_opts = {
    'format': 'bestaudio/best',
    'outtmpl': '%(title)s.%(ext)s',
    'postprocessors': [{
        'key': 'FFmpegExtractAudio',
        'preferredcodec': 'mp3',
        'preferredquality': '192',
    }],
    'logger': MyLogger(),
    'progress_hooks': [my_hook],
}

with youtube_dl.YoutubeDL(ydl_opts) as ydl:
    ydl.download([f"https://www.youtube.com/watch?v={video_id}"])
    
for file in os.listdir():
    if file.endswith(".mp3"):
        os.remove(file)
        print("Removed downloaded song")

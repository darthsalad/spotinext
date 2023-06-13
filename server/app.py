import os
import requests
import youtube_dl
from dotenv import load_dotenv
from flask import Flask, request, response

load_dotenv()
key = os.environ.get("YT_DATA_API")

app = Flask(__name__)
app.config['CORS_HEADERS'] = 'Content-Type'
app.config['CORS_ORIGINS'] = ['http://localhost:3000']
app.config['CORS_METHODS'] = ['GET', 'POST']
app.config['Access-Control-Allow-Origin'] = '*'
app.config['Access-Control-Allow-Headers'] = '*'
app.config['Access-Control-Allow-Credentials'] = '*'

# dynamic video route with video id
@app.route('/song/<song_id>', methods=['GET'])
def get_song_details(song_id):
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
  
  
  
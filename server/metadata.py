import eyed3
import requests
from eyed3.id3.frames import ImageFrame

eyed3.log.setLevel("ERROR")  # Disable eyed3 warnings


def fetch_track_details(track: str, artist: str, file_name: str):
    try:
        LAST_FM_API_KEY = "7ccc42bd17069b036f137e4d6a8eb784"
        URL = f"https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key={LAST_FM_API_KEY}&artist={artist}&track={track}&format=json"
        response = requests.get(URL)
        print("Track Details Fetched Successfully...")
        data = response.json()["track"]

        audio = eyed3.load(file_name)
        if audio.tag is None:
            audio.initTag()
        audio.tag.title = data["name"]
        audio.tag.artist = data["artist"]["name"]
        audio.tag.album = data["album"]["title"]
        audio.tag.genre = ",".join([genre["name"] for genre in data["toptags"]["tag"]])
        audio.tag.release_date = data["wiki"]["published"].split(",")[0][-4:].strip()

        image = requests.get(data["album"]["image"][2]["#text"])
        with open(f"{file_name}.jpg", "wb") as f:
            f.write(image.content)

        audio.tag.images.set(
            ImageFrame.FRONT_COVER, open(f"{file_name}.jpg", "rb").read(), "image/jpeg"
        )
        audio.tag.save()
        print("Track Details Saved Successfully...")
    except Exception as e:
        print(e)
        pass

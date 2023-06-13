# Nextify - Spotify Music Downloader 

An easy to use Spotify music downloader web app and PWA built with `Next.js` and `Flask` along with `youtube-dl`.

## To-Do

- [ ] Spotify OAuth setup for user authentication
- [ ] Getting song details from current playing song of the user
- [ ] Downloading the Official Audio video from YouTube
- [ ] Converting the video to mp3
- [ ] Sending the mp3 via Flask
- [ ] Download the mp3 from the response 
- [ ] Deleting the temporary files(mp3) from the server

## Installation

- Clone the repo and `cd` into it 
- `cd` into the server directory and run the following commands:
 
```bash
# for bash
python -m venv ./venv
source ./venv/bin/activate

#for windows
python -m venv ./venv
.\venv\Scripts\Activate.ps1
```
- Check if the virtual environment got activated by running `which python` or `where python` for windows or ``pip -V`` for both which'll show the current active Python environment
- Install the dependencies by running:

```bash
pip install -r requirements.txt
```
- `cd` into the client directory and run the following commands for installing the client dependencies:

```bash
yarn install

# or if you use npm
npm install
```
- Ensure that you have `ffmpeg` installed on your system and added to the `PATH` environment variable, if not then run the following commands:

```bash
# for linux
sudo apt install ffmpeg

# for windows
winget install Gyan.FFmpeg
```

## Running the app

### Server
- `cd` into the server directory and run the following command:

```bash
python main.py
```

### Client
- `cd` into the root directory of the repo and run the following command:

```bash
# Development
yarn dev 

# or if you use npm
npm run dev

# Production
yarn build
yarn start

# or if you use npm
npm run build
npm start
```


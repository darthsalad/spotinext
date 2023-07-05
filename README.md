# SpotiNext - Spotify Music Downloader 

An easy to use Spotify music downloader web app and PWA built with `Next.js` and `Flask` using `Spotify API` and `yt-dl`.

## To-Do

- [x] UI Improvements
- [x] Spotify OAuth setup for user authentication
- [x] Getting song details from current playing song of the user
- [x] Downloading the Official Audio video from YouTube
- [x] Converting the video to mp3
- [x] Sending the mp3 via Flask
- [x] Download the mp3 from the response 
- [x] Deleting the temporary files(mp3) from the server
- [ ] Logout function - server actions
- [ ] Middleware for refresh_token & access_token

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

## Environment Variables
- Modify the `.env.example` file in the root directory and rename it to `.env` after updating the environment variables from your Spotify Developer Dashboard.
- For the `CODE_VERIFIER`, you can generate one using the following code:

```ts
function generateCodeVerifier(length: number) {
	let text = "";
	const possible =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

generateCodeVerifier(128);
```

- For the server directory, add an `.env` file with a single variable (Generate it from the [Google Developer Console](https://console.developers.google.com/):
```bash
# .env in /server
YT_DATA_API=your_youtube_data_api_key
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
# For Development
yarn dev 

# or if you use npm
npm run dev

# For Production
yarn build
yarn start

# or if you use npm
npm run build
npm start
```


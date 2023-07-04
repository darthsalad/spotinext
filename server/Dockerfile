FROM python:3.8.5-slim-buster

RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /usr/src/app

COPY . .

EXPOSE 5000

RUN pip install --no-cache-dir -r requirements.txt

CMD [ "python", "./app.py" ]
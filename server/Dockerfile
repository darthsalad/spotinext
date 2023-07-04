FROM ubuntu:20.04

RUN apt-get update && apt-get install -y \
    python3 \
    ffmpeg 

WORKDIR /usr/src/app

ENV YT_DATA_API AIzaSyAx4A4EgwdbBWmTlwdR7UIVcj6ms8GnoUY

COPY . .

EXPOSE 5000

RUN pip install --no-cache-dir -r requirements.txt

CMD [ "python", "./app.py" ]
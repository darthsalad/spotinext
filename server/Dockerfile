FROM ubuntu:18.04

RUN apt update && apt install -y \
    python \
    python-pip \
    ffmpeg 

WORKDIR /usr/src/app

ENV YT_DATA_API AIzaSyAx4A4EgwdbBWmTlwdR7UIVcj6ms8GnoUY

COPY . .

EXPOSE 5000

RUN pip install --no-cache-dir -r requirements.txt

CMD [ "python", "./app.py" ]
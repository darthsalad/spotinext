FROM ubuntu:20.04

ENV TZ=Asia/Kolkata \
    DEBIAN_FRONTEND=noninteractive \
    YT_DATA_API=AIzaSyAx4A4EgwdbBWmTlwdR7UIVcj6ms8GnoUY

RUN apt update && apt install -y \
    tzdata \
    python3 \
    python3-pip \
    ffmpeg 

WORKDIR /usr/src/app

COPY . .

EXPOSE 5000

RUN pip install --no-cache-dir -r requirements.txt

CMD [ "python", "./app.py" ]
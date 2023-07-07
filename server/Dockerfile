FROM python:3.8.5-slim-buster

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir -r requirements.txt

RUN apt-get update && \
  apt-get install -y ffmpeg && \
  rm -rf /var/lib/apt/lists/*

EXPOSE 8080

CMD ["python3", "./app.py"]
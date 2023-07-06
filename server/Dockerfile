FROM python:3.8.5-slim-buster

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir -r requirements.txt

RUN apt-get update && \
  apt-get install -y ffmpeg && \
  rm -rf /var/lib/apt/lists/*

EXPOSE 8080

ENV YT_DATA_API=AIzaSyAx4A4EgwdbBWmTlwdR7UIVcj6ms8GnoUY

# CMD ["flask", "run", "--host", "0.0.0.0", "--port", "8080", "--debug"]
CMD ["python3", "./app.py"]
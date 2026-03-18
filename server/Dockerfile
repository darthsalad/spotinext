FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && \
  apt-get install -y --no-install-recommends ffmpeg && \
  rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 8080

CMD ["python3", "./app.py"]

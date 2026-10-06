FROM denoland/deno:bin AS deno

FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && \
  apt-get install -y --no-install-recommends ffmpeg && \
  rm -rf /var/lib/apt/lists/*

# yt-dlp uses deno to solve YouTube's player JS challenges
COPY --from=deno /deno /usr/local/bin/deno

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd -m appuser && chown -R appuser /app

ENV DATA_DIR=/app/data
# yt-dlp keeps its cache under $HOME; keep it on the volume too
ENV HOME=/app/data/home
# mount a volume here to keep the match cache and yt-dlp's player cache across restarts
VOLUME /app/data

EXPOSE 8080

# one process: the server is stateless, downloads run in threads, and a single
# copy of yt-dlp in memory keeps the footprint small
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--proxy-headers", "--forwarded-allow-ips", "*"]

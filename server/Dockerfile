# syntax=docker/dockerfile:1
FROM denoland/deno:bin AS deno

# PO token provider (bgutil) for yt-dlp; runs on deno in the final image.
# Keep in sync with bgutil-ytdlp-pot-provider in requirements.txt
FROM node:22-bookworm-slim AS bgutil
ARG BGUTIL_VERSION=2.0.1
ADD https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git#${BGUTIL_VERSION} /src
WORKDIR /src/server
RUN npm ci --omit=dev --no-audit --no-fund

FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && \
  apt-get install -y --no-install-recommends ffmpeg && \
  rm -rf /var/lib/apt/lists/*

# yt-dlp uses deno to solve YouTube's player JS challenges
COPY --from=deno /deno /usr/local/bin/deno

COPY --from=bgutil /src/server /opt/bgutil
RUN cd /opt/bgutil && DENO_DIR=/opt/bgutil/.cache/deno deno cache src/main.ts

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd -m appuser && chown -R appuser /app /opt/bgutil

ENV DATA_DIR=/app/data
# setpriv keeps root's environment; deno caches under $HOME
ENV HOME=/home/appuser
# mount a volume here to keep the match cache and yt-dlp's player cache across restarts
VOLUME /app/data

EXPOSE 8080

# one process: the server is stateless, downloads run in threads, and a single
# copy of yt-dlp in memory keeps the footprint small
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--proxy-headers", "--forwarded-allow-ips", "*"]

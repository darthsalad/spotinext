#!/bin/sh
# Volumes (Fly, Docker named volumes) are mounted root-owned, so fix the data
# dir's ownership as root, then drop to the unprivileged user for the app.
set -e
mkdir -p "$DATA_DIR"

# YouTube cookies (Netscape cookies.txt), passed base64-encoded via the
# YT_COOKIES secret so they never live in the image or the repo
if [ -n "$YT_COOKIES" ]; then
	printf '%s' "$YT_COOKIES" | base64 -d > "$DATA_DIR/cookies.txt"
	chmod 600 "$DATA_DIR/cookies.txt"
fi

chown -R appuser:appuser "$DATA_DIR"

# PO token provider for yt-dlp; listens on 127.0.0.1:4416 only. Restarted if it dies.
if [ -d /opt/bgutil ]; then
	(
		cd /opt/bgutil
		while true; do
			DENO_DIR=/opt/bgutil/.cache/deno DENO_NO_UPDATE_CHECK=1 DENO_NO_PROMPT=1 \
				setpriv --reuid=appuser --regid=appuser --init-groups \
				deno run --allow-env --allow-net \
				--allow-ffi=/opt/bgutil/node_modules --allow-read=/opt/bgutil/node_modules \
				src/main.ts || true
			echo "bgutil provider exited, restarting" >&2
			sleep 2
		done
	) &
fi

exec env -u YT_COOKIES setpriv --reuid=appuser --regid=appuser --init-groups "$@"

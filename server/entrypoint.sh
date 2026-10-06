#!/bin/sh
# Volumes (Fly, Docker named volumes) are mounted root-owned, so fix the data
# dir's ownership as root, then drop to the unprivileged user for the app.
set -e
mkdir -p "$DATA_DIR"
chown -R appuser:appuser "$DATA_DIR"
exec setpriv --reuid=appuser --regid=appuser --init-groups "$@"

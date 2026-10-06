#!/bin/sh
# Regenerates the favicon, PWA icons and OG image in ../public from the sources
# here. Needs rsvg-convert and Chrome/Chromium (the OG image loads Google Fonts).
set -e
cd "$(dirname "$0")"
OUT=../public
CHROME=${CHROME:-$(command -v google-chrome-stable || command -v google-chrome || command -v chromium)}

cp icon.svg "$OUT/icon.svg"
for size in 32 180 192 256 384 512; do
	rsvg-convert -w $size -h $size icon.svg -o "$OUT/icon-${size}x${size}.png"
done
mv "$OUT/icon-32x32.png" "$OUT/favicon-32x32.png"
mv "$OUT/icon-180x180.png" "$OUT/apple-touch-icon.png"
rsvg-convert -w 512 -h 512 icon-maskable.svg -o "$OUT/maskable_icon.png"

profile=$(mktemp -d)
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
	--user-data-dir="$profile" --window-size=1200,630 --virtual-time-budget=8000 \
	--screenshot="$OUT/og-banner.png" "file://$PWD/og.html" 2>/dev/null
rm -rf "$profile"
echo "done"

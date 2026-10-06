import { useEffect, useState } from "react";

const FALLBACK = "#1ED760";
const cache = new Map<string, string>();

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) return [0, 0, l];
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
	return [h * 60, s, l];
}

/**
 * A vivid accent colour picked from the album art: hues are weighted by
 * saturation so a colourful detail beats a large grey background, then
 * clamped to a bright, saturated range so it works as a highlight on both themes.
 */
function extract(img: HTMLImageElement): string {
	const size = 32;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return FALLBACK;
	ctx.drawImage(img, 0, 0, size, size);
	const { data } = ctx.getImageData(0, 0, size, size);

	// 36 hue buckets of 10°
	const buckets = Array.from({ length: 36 }, () => ({ weight: 0, s: 0, l: 0 }));
	for (let i = 0; i < data.length; i += 4) {
		const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
		if (s < 0.2 || l < 0.12 || l > 0.92) continue;
		const b = buckets[Math.floor(h / 10) % 36];
		const w = s * s;
		b.weight += w;
		b.s += s * w;
		b.l += l * w;
	}
	const best = buckets.reduce((a, b, i) => (b.weight > buckets[a].weight ? i : a), 0);
	const b = buckets[best];
	if (b.weight < 1) return FALLBACK; // basically greyscale art

	const hue = best * 10 + 5;
	const sat = Math.min(0.9, Math.max(0.6, b.s / b.weight));
	const light = Math.min(0.66, Math.max(0.55, b.l / b.weight));
	return `hsl(${hue.toFixed(0)} ${(sat * 100).toFixed(0)}% ${(light * 100).toFixed(0)}%)`;
}

export function useAlbumColor(url: string | undefined) {
	const [color, setColor] = useState(() => (url && cache.get(url)) || FALLBACK);

	useEffect(() => {
		if (!url) return setColor(FALLBACK);
		const cached = cache.get(url);
		if (cached) return setColor(cached);

		let cancelled = false;
		const img = new Image();
		// i.scdn.co sends Access-Control-Allow-Origin: *, so the canvas isn't tainted
		img.crossOrigin = "anonymous";
		img.onload = () => {
			let c = FALLBACK;
			try {
				c = extract(img);
			} catch {}
			cache.set(url, c);
			if (!cancelled) setColor(c);
		};
		img.src = url;
		return () => {
			cancelled = true;
		};
	}, [url]);

	return color;
}

import { downloadZip } from "client-zip";
import { trackDownload } from "@/lib/analytics";
import { getAccessToken } from "@/lib/auth";
import type { Track } from "@/types/spotify";

const SERVER = ((import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://127.0.0.1:8080").replace(/\/$/, "");

export type Format = "m4a" | "mp3";

/** Mirrors server/models.py TrackMeta. */
export type TrackMeta = {
	spotifyId: string;
	title: string;
	artists: string[];
	album: string;
	albumArtists: string[];
	releaseDate?: string;
	trackNumber: number;
	totalTracks?: number;
	discNumber: number;
	durationMs: number;
	isrc?: string;
	explicit: boolean;
	coverUrl?: string;
	genres: string[];
	spotifyUrl: string;
};

export function toTrackMeta(track: Track, genres: string[] = []): TrackMeta {
	return {
		spotifyId: track.id,
		title: track.name,
		artists: track.artists.map((a) => a.name),
		album: track.album.name,
		albumArtists: track.album.artists.map((a) => a.name),
		releaseDate: track.album.release_date,
		trackNumber: track.track_number,
		totalTracks: track.album.total_tracks,
		discNumber: track.disc_number,
		durationMs: track.duration_ms,
		isrc: track.external_ids?.isrc,
		explicit: track.explicit,
		// images are sorted largest first (640px)
		coverUrl: track.album.images[0]?.url,
		genres,
		spotifyUrl: track.external_urls.spotify,
	};
}

export class DownloadError extends Error {}

async function post(path: string, body: unknown, signal?: AbortSignal) {
	const token = await getAccessToken();
	let res: Response;
	try {
		res = await fetch(`${SERVER}${path}`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
			body: JSON.stringify(body),
			signal,
		});
	} catch (e) {
		if ((e as Error).name === "AbortError") throw e;
		throw new DownloadError("Can't reach the download server");
	}
	if (!res.ok) {
		const data = await res.json().catch(() => null);
		const detail = typeof data?.detail === "string" ? data.detail : `Server error (${res.status})`;
		throw new DownloadError(detail);
	}
	return res;
}

export type Resolved = { videoId: string; title: string; score: number; source: string };

/** Find the matching YouTube video ahead of time so the download starts instantly. */
export async function resolveTrack(meta: TrackMeta, signal?: AbortSignal): Promise<Resolved> {
	return (await post("/resolve", { track: meta }, signal)).json();
}

function filenameFrom(res: Response, fallback: string) {
	const header = res.headers.get("Content-Disposition") ?? "";
	const star = header.match(/filename\*=UTF-8''([^;]+)/i);
	if (star) return decodeURIComponent(star[1]);
	const plain = header.match(/filename="([^"]+)"/i);
	return plain ? plain[1] : fallback;
}

export type FetchTrackOptions = {
	format: Format;
	videoId?: string;
	signal?: AbortSignal;
	/** 0..1 once the server starts sending; the server does all its work before that */
	onProgress?: (fraction: number) => void;
};

export async function fetchTrack(meta: TrackMeta, opts: FetchTrackOptions) {
	const res = await post("/track", { track: meta, videoId: opts.videoId, format: opts.format }, opts.signal);
	const filename = filenameFrom(res, `${meta.artists.join(", ")} - ${meta.title}.${opts.format}`);
	const total = Number(res.headers.get("Content-Length") ?? 0);

	if (!res.body || !total || !opts.onProgress) {
		return { blob: await res.blob(), filename };
	}
	const reader = res.body.getReader();
	const chunks: Uint8Array<ArrayBuffer>[] = [];
	let received = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
		received += value.length;
		opts.onProgress(received / total);
	}
	return { blob: new Blob(chunks, { type: res.headers.get("Content-Type") ?? undefined }), filename };
}

export function saveBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ── Playlists ────────────────────────────────────────────────────────────

type DirectoryHandle = {
	getDirectoryHandle(name: string, opts: { create: boolean }): Promise<DirectoryHandle>;
	getFileHandle(
		name: string,
		opts: { create: boolean }
	): Promise<{ createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }> }>;
};

declare global {
	interface Window {
		showDirectoryPicker?: (opts?: { mode?: "readwrite"; id?: string; startIn?: string }) => Promise<DirectoryHandle>;
	}
}

/** Where a playlist download goes: straight into a folder (Chromium) or a zip (everywhere else). */
export type SaveTarget = { kind: "folder"; dir: DirectoryHandle } | { kind: "zip" };

const safeName = (s: string) => s.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim() || "playlist";

/**
 * Must be the first thing awaited in a click handler: the folder picker
 * needs the user gesture. Returns null if the user cancelled the picker.
 */
export async function pickSaveTarget(folderName: string): Promise<SaveTarget | null> {
	if (!window.showDirectoryPicker) return { kind: "zip" };
	try {
		const root = await window.showDirectoryPicker({ mode: "readwrite", id: "spotinext", startIn: "music" });
		return { kind: "folder", dir: await root.getDirectoryHandle(safeName(folderName), { create: true }) };
	} catch (e) {
		if ((e as Error).name === "AbortError") return null;
		return { kind: "zip" };
	}
}

export type PlaylistProgress = { done: number; failed: string[]; total: number };

export async function downloadPlaylist(
	name: string,
	tracks: Track[],
	target: SaveTarget,
	opts: { format: Format; concurrency?: number; signal?: AbortSignal; onProgress: (p: PlaylistProgress) => void }
) {
	const progress: PlaylistProgress = { done: 0, failed: [], total: tracks.length };
	const zipped: { name: string; input: Blob }[] = [];
	const bufferedTracks: TrackMeta[] = [];
	const usedNames = new Set<string>();
	const uniqueName = (filename: string) => {
		let candidate = filename;
		for (let i = 2; usedNames.has(candidate.toLowerCase()); i++) {
			candidate = filename.replace(/(\.\w+)$/, ` (${i})$1`);
		}
		usedNames.add(candidate.toLowerCase());
		return candidate;
	};

	let next = 0;
	const worker = async () => {
		while (next < tracks.length) {
			if (opts.signal?.aborted) return;
			const track = tracks[next++];
			const meta = toTrackMeta(track);
			trackDownload("started", meta, opts.format, "playlist_bulk");
			try {
				const { blob, filename } = await fetchTrack(meta, {
					format: opts.format,
					signal: opts.signal,
				});
				const fileName = uniqueName(filename);
				if (target.kind === "folder") {
					const writable = await (await target.dir.getFileHandle(fileName, { create: true })).createWritable();
					await writable.write(blob);
					await writable.close();
					trackDownload("completed", meta, opts.format, "playlist_bulk");
				} else {
					zipped.push({ name: fileName, input: blob });
					bufferedTracks.push(meta);
				}
			} catch (e) {
				if ((e as Error).name === "AbortError" || opts.signal?.aborted) {
					trackDownload("cancelled", meta, opts.format, "playlist_bulk");
					return;
				}
				trackDownload("failed", meta, opts.format, "playlist_bulk");
				progress.failed.push(track.name);
			}
			progress.done++;
			opts.onProgress({ ...progress, failed: [...progress.failed] });
		}
	};
	await Promise.all(Array.from({ length: opts.concurrency ?? 3 }, worker));

	if (target.kind === "zip" && zipped.length) {
		let outcome: "completed" | "failed" | "cancelled" = "cancelled";
		try {
			if (!opts.signal?.aborted) {
				// stored, not deflated: audio doesn't compress, so this is just concatenation
				const zip = await downloadZip(zipped).blob();
				if (!opts.signal?.aborted) {
					saveBlob(zip, `${safeName(name)}.zip`);
					outcome = "completed";
				}
			}
		} catch (e) {
			outcome = opts.signal?.aborted ? "cancelled" : "failed";
			throw e;
		} finally {
			for (const meta of bufferedTracks) trackDownload(outcome, meta, opts.format, "playlist_bulk");
		}
	}
	return progress;
}

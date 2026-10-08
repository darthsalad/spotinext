import { inject, track } from "@vercel/analytics";
import type { Format, TrackMeta } from "@/lib/downloader";
import type { TimeRange } from "@/lib/spotify";

export type DownloadSource = "now_playing" | "top_tracks" | "playlist_track" | "playlist_bulk";
type TrackData = { track: string; context: string };
type PlaylistData = { playlist_id: string; format: Format };
type Events = {
	login_started: { provider: "spotify" };
	login_completed: { provider: "spotify" };
	login_failed: { provider: "spotify"; reason: "authorization" | "state_mismatch" | "token_exchange" };
	logout: { reason: "manual" | "session_expired" | "refresh_failed" };
	track_download_started: TrackData;
	track_download_completed: TrackData;
	track_download_failed: TrackData;
	track_download_cancelled: TrackData;
	playlist_opened: { playlist_id: string; track_count: number };
	playlists_show_more: { visible_count: number };
	playlist_download_started: PlaylistData;
	playlist_download_completed: { playlist_id: string; downloaded_tracks: number };
	playlist_download_partial: { playlist_id: string; downloaded_tracks: number };
	playlist_download_failed: { playlist_id: string; reason: "download_error" | "no_tracks_downloaded" | "empty_playlist" };
	playlist_download_cancelled: { playlist_id: string; stage: "folder_picker" | "download" };
	preference_changed: { preference: "format" | "theme"; value: string };
	stats_range_changed: { range: TimeRange };
	spotify_link_opened: { type: "track" | "artist" | "profile"; source: "now_playing" | "top_tracks" | "playlist_track" | "top_artists" | "account" };
};

/** Initialize before the OAuth exchange; its result happens before React mounts. */
export function initializeAnalytics() {
	inject({
		mode: import.meta.env.DEV ? "development" : "production",
		beforeSend: (event) => {
			const url = new URL(event.url);
			for (const key of ["code", "state", "error", "error_description"]) url.searchParams.delete(key);
			return { ...event, url: url.toString() };
		},
	});
}

/** Two flat properties at most (Vercel Pro); analytics must never interrupt an action. */
export function trackEvent<K extends keyof Events>(name: K, properties: Events[K]) {
	try {
		track(name, Object.fromEntries(Object.entries(properties).map(([key, value]) => [
			key, typeof value === "string" ? value.slice(0, 255) : value,
		])));
	} catch {
		// Actions still work if the analytics script is unavailable.
	}
}

export function trackDownload(
	phase: "started" | "completed" | "failed" | "cancelled",
	meta: TrackMeta,
	format: Format,
	source: DownloadSource
) {
	trackEvent(`track_download_${phase}`, {
		track: `${meta.title} — ${meta.artists.join(", ")}`,
		context: `${source}:${format}`,
	});
}

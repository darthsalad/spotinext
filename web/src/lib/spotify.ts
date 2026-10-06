import { AuthError, getAccessToken, logout } from "@/lib/auth";
import type { Artist, CurrentlyPlaying, Page, Playlist, Track, User } from "@/types/spotify";

const API = "https://api.spotify.com/v1";

export class ApiError extends Error {
	constructor(public status: number, message: string) {
		super(message);
	}
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api<T>(path: string, attempt = 0): Promise<T | null> {
	const token = await getAccessToken(attempt > 0);
	const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });

	if (res.status === 204) return null;
	if (res.status === 401 && attempt === 0) return api<T>(path, 1);
	if (res.status === 401) {
		logout();
		throw new AuthError("Session expired");
	}
	if (res.status === 429 && attempt < 3) {
		await sleep(Number(res.headers.get("Retry-After") ?? "1") * 1000);
		return api<T>(path, attempt + 1);
	}
	if (!res.ok) {
		const data = await res.json().catch(() => null);
		throw new ApiError(res.status, data?.error?.message ?? `Spotify request failed (${res.status})`);
	}
	return res.json() as Promise<T>;
}

export const getProfile = () => api<User>("/me") as Promise<User>;

export const getCurrentlyPlaying = () =>
	api<CurrentlyPlaying>("/me/player/currently-playing?additional_types=episode");

export const getArtist = (id: string) => api<Artist>(`/artists/${id}`) as Promise<Artist>;

export type TimeRange = "short_term" | "medium_term" | "long_term";

export const getTopArtists = (range: TimeRange, limit = 10) =>
	api<Page<Artist>>(`/me/top/artists?limit=${limit}&time_range=${range}`) as Promise<Page<Artist>>;

export const getTopTracks = (range: TimeRange, limit = 10) =>
	api<Page<Track>>(`/me/top/tracks?limit=${limit}&time_range=${range}`) as Promise<Page<Track>>;

export const getPlaylists = (offset = 0, limit = 50) =>
	api<Page<Playlist>>(`/me/playlists?limit=${limit}&offset=${offset}`) as Promise<Page<Playlist>>;

export const playlistTotal = (p: Playlist) => p.items?.total ?? p.tracks?.total ?? 0;

type PlaylistItem = { item?: Track | null; track?: Track | null };

/** One page of a playlist's tracks; skips local files, episodes and removed tracks. */
export async function getPlaylistTracks(id: string, offset = 0, limit = 50) {
	const page = (await api<Page<PlaylistItem>>(
		`/playlists/${id}/items?limit=${limit}&offset=${offset}&additional_types=track`
	)) as Page<PlaylistItem>;
	const tracks = page.items
		// `track` was renamed to `item` in February 2026; accept either
		.map((i) => i.item ?? i.track)
		.filter((t): t is Track => !!t && t.type === "track" && !t.is_local && !!t.id);
	return { tracks, total: page.total, nextOffset: page.next ? offset + limit : null };
}

/** All tracks of a playlist, following pagination. */
export async function getAllPlaylistTracks(id: string) {
	const all: Track[] = [];
	let offset: number | null = 0;
	while (offset !== null) {
		const page = await getPlaylistTracks(id, offset);
		all.push(...page.tracks);
		offset = page.nextOffset;
	}
	return all;
}

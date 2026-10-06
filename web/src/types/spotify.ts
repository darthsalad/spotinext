// Only the fields this app reads. Spotify's February 2026 Web API changes
// removed several fields for development-mode apps (user email/country/
// followers, artist followers/popularity), so those are optional here.

export type Image = { url: string; height: number | null; width: number | null };

export type SimplifiedArtist = {
	id: string;
	name: string;
	external_urls: { spotify: string };
};

export type Artist = SimplifiedArtist & {
	images: Image[];
	genres?: string[];
};

export type Album = {
	id: string;
	name: string;
	images: Image[];
	release_date?: string;
	total_tracks?: number;
	artists: SimplifiedArtist[];
};

export type Track = {
	type: "track";
	id: string;
	name: string;
	duration_ms: number;
	explicit: boolean;
	track_number: number;
	disc_number: number;
	is_local?: boolean;
	external_ids?: { isrc?: string };
	external_urls: { spotify: string };
	artists: SimplifiedArtist[];
	album: Album;
};

export type Episode = { type: "episode"; id: string; name: string };

export type CurrentlyPlaying = {
	is_playing: boolean;
	progress_ms: number | null;
	item: Track | Episode | null;
};

export type User = {
	id: string;
	display_name: string | null;
	images: Image[];
	external_urls: { spotify: string };
	email?: string;
	country?: string;
	followers?: { total: number };
};

export type Playlist = {
	id: string;
	name: string;
	description: string | null;
	images: Image[] | null;
	external_urls: { spotify: string };
	owner: { display_name: string | null };
	// renamed from `tracks` to `items` in February 2026
	items?: { total: number };
	tracks?: { total: number };
};

export type Page<T> = {
	items: T[];
	total: number;
	offset: number;
	limit: number;
	next: string | null;
};

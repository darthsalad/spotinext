type CacheEntry<T> = { data: T; timestamp: number };

export function getCache<T>(key: string): CacheEntry<T> | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		return JSON.parse(raw) as CacheEntry<T>;
	} catch {
		return null;
	}
}

export function setCache<T>(key: string, data: T): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
	} catch {}
}

export function clearCache(key: string): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.removeItem(key);
	} catch {}
}

// TTLs in milliseconds
export const CACHE_TTL = {
	playlists: 5 * 60 * 1000,   // 5 min
	stats:     60 * 60 * 1000,  // 1 hour
} as const;

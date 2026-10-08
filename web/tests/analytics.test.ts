import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { initializeAnalytics, trackDownload, trackEvent } from "../src/lib/analytics";
import type { Track } from "../src/types/spotify";

type Event = { name: string; data: Record<string, string | number> };
const events: Event[] = [];
const order: string[] = [];
const tokens = { accessToken: "test-access", refreshToken: "test-refresh", expiresAt: Date.now() + 3_600_000 };
const storage = () => {
	const data = new Map<string, string>();
	return {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => data.set(key, value),
		removeItem: (key: string) => data.delete(key),
		clear: () => data.clear(),
	};
};
const local = storage();
const session = storage();
const location = { href: "https://spotinext.test/", origin: "https://spotinext.test", assign: (url: string) => { location.href = url; } };
const browser = {
	location,
	history: { replaceState: (_data: unknown, _title: string, url: string) => { location.href = new URL(url, location.origin).href; } },
	va: (command: string, payload: unknown) => {
		if (command === "event") {
			const event = payload as Event;
			events.push(event);
			order.push(event.name);
		}
	},
};
let failSave = false;
const scripts: { src: string; dataset: Record<string, string> }[] = [];
const documentStub = {
	head: { querySelector: () => null, appendChild: (script: typeof scripts[number]) => scripts.push(script) },
	body: { appendChild: () => {} },
	createElement: () => ({
		dataset: {},
		click: () => { if (failSave) throw new Error("Save failed"); order.push("file_saved"); },
		remove: () => {},
	}),
};
const originalGlobals = new Map(["window", "document", "localStorage", "sessionStorage", "fetch"].map(
	(key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]
));
let auth: typeof import("../src/lib/auth");
let downloader: typeof import("../src/lib/downloader");

const makeTrack = (id: string): Track => ({
	id, name: `Song ${id}`, type: "track", is_local: false, explicit: false,
	duration_ms: 180_000, track_number: 1, disc_number: 1,
	artists: [{ id: "artist", name: "Artist", external_urls: { spotify: "https://open.spotify.com/artist/artist" } }],
	album: {
		id: "album", name: "Album", images: [], release_date: "2026-01-01", total_tracks: 2,
		artists: [{ id: "artist", name: "Artist", external_urls: { spotify: "https://open.spotify.com/artist/artist" } }],
	},
	external_urls: { spotify: `https://open.spotify.com/track/${id}` },
});
const tracks = [makeTrack("one"), makeTrack("two")];
const audioResponse = () => new Response("audio", { headers: { "Content-Type": "audio/mp4" } });
const folder = (close: () => Promise<void> = async () => {}) => ({
	kind: "folder" as const,
	dir: {
		getDirectoryHandle: async () => { throw new Error("unused"); },
		getFileHandle: async () => ({ createWritable: async () => ({ write: async () => {}, close }) }),
	},
});

beforeAll(async () => {
	for (const [key, value] of Object.entries({ window: browser, document: documentStub, localStorage: local, sessionStorage: session })) {
		Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
	}
	auth = await import("../src/lib/auth");
	downloader = await import("../src/lib/downloader");
});

beforeEach(() => {
	events.length = 0;
	order.length = 0;
	local.clear();
	session.clear();
	local.setItem("spotify_tokens", JSON.stringify(tokens));
	location.href = location.origin + "/";
	failSave = false;
	globalThis.fetch = (async () => audioResponse()) as typeof fetch;
});

afterAll(() => {
	for (const [key, descriptor] of originalGlobals) {
		if (descriptor) Object.defineProperty(globalThis, key, descriptor);
		else Reflect.deleteProperty(globalThis, key);
	}
});

describe("analytics payloads", () => {
	test("initializes a queue before React and redacts OAuth URL parameters", () => {
		const va = browser.va;
		Reflect.deleteProperty(browser, "va");
		initializeAnalytics();
		trackEvent("login_completed", { provider: "spotify" });
		const queue = (browser as unknown as { vaq: unknown[][] }).vaq;
		expect(queue[1]).toEqual(["event", { name: "login_completed", data: { provider: "spotify" }, options: undefined }]);
		const beforeSend = queue[0][1] as (event: { type: string; url: string }) => { url: string };
		expect(beforeSend({ type: "pageview", url: location.origin + "/?code=secret&state=secret&error=denied&error_description=secret&ref=home" }).url)
			.toBe(location.origin + "/?ref=home");
		expect(scripts.length).toBe(1);
		browser.va = va;
	});

	test("includes track and download context within Vercel limits", () => {
		trackDownload("started", { ...downloader.toTrackMeta(tracks[0]), title: "x".repeat(300) }, "mp3", "top_tracks");
		expect(events[0].data.track).toHaveLength(255);
		expect(events[0].data.context).toBe("top_tracks:mp3");
		expect(Object.keys(events[0].data)).toHaveLength(2);
	});

	test("unavailable or throwing analytics cannot interrupt an action", () => {
		const va = browser.va;
		browser.va = () => { throw new Error("Analytics unavailable"); };
		expect(() => trackEvent("logout", { reason: "manual" })).not.toThrow();
		Reflect.deleteProperty(browser, "va");
		expect(() => trackEvent("logout", { reason: "manual" })).not.toThrow();
		browser.va = va;
	});
});

describe("authentication events", () => {
	test("successful OAuth callback emits one login, never tokens or another login on reload", async () => {
		location.href = location.origin + "/?code=secret-code&state=expected";
		session.setItem("pkce_verifier", "secret-verifier");
		session.setItem("pkce_state", "expected");
		globalThis.fetch = (async () => Response.json({ access_token: "secret-access", refresh_token: "secret-refresh", expires_in: 3600 })) as typeof fetch;
		await auth.completeLoginFromUrl();
		await auth.completeLoginFromUrl();
		expect(events).toEqual([{ name: "login_completed", data: { provider: "spotify" } }]);
		expect(location.href).toBe(location.origin + "/");
		expect(session.getItem("pkce_verifier")).toBeNull();
	});

	test.each([
		["?error=access_denied&state=expected", "authorization"],
		["?code=secret&state=wrong", "state_mismatch"],
		["?code=secret&state=expected", "token_exchange"],
	])("callback failure %s emits only a categorical reason", async (query, reason) => {
		location.href = location.origin + "/" + query;
		session.setItem("pkce_verifier", "secret-verifier");
		session.setItem("pkce_state", "expected");
		globalThis.fetch = (async () => Response.json({ error_description: "sensitive error detail" }, { status: 400 })) as typeof fetch;
		await expect(auth.completeLoginFromUrl()).rejects.toBeInstanceOf(auth.AuthError);
		expect(events).toEqual([{ name: "login_failed", data: { provider: "spotify", reason } }]);
	});

	test("restoring a session and refreshing tokens do not emit login events", async () => {
		await auth.completeLoginFromUrl();
		globalThis.fetch = (async () => Response.json({ access_token: "refreshed", expires_in: 3600 })) as typeof fetch;
		await auth.getAccessToken(true);
		expect(events).toEqual([]);
	});

	test("manual logout emits once", () => {
		auth.logout();
		auth.logout();
		expect(events).toEqual([{ name: "logout", data: { reason: "manual" } }]);
	});

	test("failed refresh distinguishes automatic logout", async () => {
		globalThis.fetch = (async () => Response.json({ error: "invalid_grant" }, { status: 400 })) as typeof fetch;
		await expect(auth.getAccessToken(true)).rejects.toBeInstanceOf(auth.AuthError);
		auth.logout();
		expect(events).toEqual([{ name: "logout", data: { reason: "refresh_failed" } }]);
	});
});

describe("bulk track download outcomes", () => {
	test("folder completion follows closing each saved file", async () => {
		await downloader.downloadPlaylist("Private playlist", tracks, folder(async () => { order.push("file_closed"); }), {
			format: "m4a", concurrency: 1, onProgress: () => {},
		});
		expect(order).toEqual(["track_download_started", "file_closed", "track_download_completed", "track_download_started", "file_closed", "track_download_completed"]);
		expect(events[1].data).toEqual({ track: "Song one — Artist", context: "playlist_bulk:m4a" });
	});

	test("ZIP completion follows saving the ZIP, once for every track", async () => {
		await downloader.downloadPlaylist("Private playlist", tracks, { kind: "zip" }, {
			format: "mp3", concurrency: 1, onProgress: () => {},
		});
		expect(order).toEqual(["track_download_started", "track_download_started", "file_saved", "track_download_completed", "track_download_completed"]);
	});

	test("a failed track does not prevent successful tracks from being recorded", async () => {
		let requests = 0;
		globalThis.fetch = (async () => ++requests === 1 ? Response.json({ detail: "private error" }, { status: 500 }) : audioResponse()) as typeof fetch;
		const result = await downloader.downloadPlaylist("Private playlist", tracks, { kind: "zip" }, {
			format: "m4a", concurrency: 1, onProgress: () => {},
		});
		expect(result.failed).toEqual(["Song one"]);
		expect(events.map((e) => e.name)).toEqual(["track_download_started", "track_download_failed", "track_download_started", "track_download_completed"]);
		expect(JSON.stringify(events)).not.toContain("private");
	});

	test("cancelled ZIP buffers never count as completed or start remaining tracks", async () => {
		const controller = new AbortController();
		await downloader.downloadPlaylist("Private playlist", tracks, { kind: "zip" }, {
			format: "m4a", concurrency: 1, signal: controller.signal, onProgress: () => controller.abort(),
		});
		expect(order).toEqual(["track_download_started", "track_download_cancelled"]);
	});

	test("ZIP save failure marks all buffered tracks as failed", async () => {
		failSave = true;
		await expect(downloader.downloadPlaylist("Private playlist", tracks, { kind: "zip" }, {
			format: "m4a", concurrency: 1, onProgress: () => {},
		})).rejects.toThrow("Save failed");
		expect(events.map((e) => e.name)).toEqual(["track_download_started", "track_download_started", "track_download_failed", "track_download_failed"]);
	});

	test("folder save failure counts as failure after a successful fetch", async () => {
		const result = await downloader.downloadPlaylist("Private playlist", [tracks[0]], folder(async () => { throw new Error("Disk full"); }), {
			format: "m4a", onProgress: () => {},
		});
		expect(result.failed).toEqual(["Song one"]);
		expect(events.map((e) => e.name)).toEqual(["track_download_started", "track_download_failed"]);
	});
});

// Spotify Authorization Code + PKCE, entirely in the browser. PKCE needs no
// client secret, so no backend is involved in login or token refresh.

export const CLIENT_ID = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined) ?? "";
const REDIRECT_URI =
	(import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string | undefined) ?? `${window.location.origin}/`;
const SCOPES = [
	"user-read-currently-playing",
	"user-top-read",
	"playlist-read-private",
	"playlist-read-collaborative",
];

const TOKENS_KEY = "spotify_tokens";
const VERIFIER_KEY = "pkce_verifier";
const STATE_KEY = "pkce_state";

type Tokens = { accessToken: string; refreshToken: string; expiresAt: number };

export class AuthError extends Error {}

const listeners = new Set<() => void>();

function emit() {
	listeners.forEach((l) => l());
}

export function subscribeAuth(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function readTokens(): Tokens | null {
	try {
		const raw = localStorage.getItem(TOKENS_KEY);
		return raw ? (JSON.parse(raw) as Tokens) : null;
	} catch {
		return null;
	}
}

function writeTokens(tokens: Tokens | null) {
	try {
		if (tokens) localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
		else localStorage.removeItem(TOKENS_KEY);
	} catch {}
	emit();
}

export function isLoggedIn() {
	return readTokens() !== null;
}

function base64url(bytes: Uint8Array) {
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function randomString(byteLength: number) {
	return base64url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function login() {
	// a fresh verifier per login; a fixed one would defeat the point of PKCE
	const verifier = randomString(64);
	const state = randomString(16);
	sessionStorage.setItem(VERIFIER_KEY, verifier);
	sessionStorage.setItem(STATE_KEY, state);

	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
	const params = new URLSearchParams({
		response_type: "code",
		client_id: CLIENT_ID,
		scope: SCOPES.join(" "),
		redirect_uri: REDIRECT_URI,
		state,
		code_challenge_method: "S256",
		code_challenge: base64url(new Uint8Array(digest)),
	});
	window.location.assign(`https://accounts.spotify.com/authorize?${params}`);
}

async function requestTokens(body: Record<string, string>): Promise<Tokens> {
	const res = await fetch("https://accounts.spotify.com/api/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({ client_id: CLIENT_ID, ...body }),
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new AuthError(data.error_description ?? data.error ?? `Token request failed (${res.status})`);
	}
	const data = await res.json();
	return {
		accessToken: data.access_token,
		// Spotify may or may not rotate the refresh token
		refreshToken: data.refresh_token ?? body.refresh_token,
		expiresAt: Date.now() + data.expires_in * 1000,
	};
}

/** Finish the redirect back from Spotify, if this page load is one. */
export async function completeLoginFromUrl(): Promise<void> {
	const url = new URL(window.location.href);
	const code = url.searchParams.get("code");
	const error = url.searchParams.get("error");
	const state = url.searchParams.get("state");
	if (!code && !error) return;

	// strip the params so a reload doesn't try to reuse the one-time code
	url.searchParams.delete("code");
	url.searchParams.delete("error");
	url.searchParams.delete("state");
	window.history.replaceState(null, "", url.pathname + url.search + url.hash);

	const verifier = sessionStorage.getItem(VERIFIER_KEY);
	const expectedState = sessionStorage.getItem(STATE_KEY);
	sessionStorage.removeItem(VERIFIER_KEY);
	sessionStorage.removeItem(STATE_KEY);

	if (error) throw new AuthError(`Spotify login failed: ${error}`);
	if (!verifier || state !== expectedState) throw new AuthError("Login state mismatch, please try again.");

	writeTokens(
		await requestTokens({
			grant_type: "authorization_code",
			code: code!,
			redirect_uri: REDIRECT_URI,
			code_verifier: verifier,
		})
	);
}

let refreshing: Promise<Tokens> | null = null;

async function refresh(tokens: Tokens): Promise<Tokens> {
	// several queries can hit an expired token at once; refresh only once
	refreshing ??= requestTokens({ grant_type: "refresh_token", refresh_token: tokens.refreshToken })
		.then((fresh) => {
			writeTokens(fresh);
			return fresh;
		})
		.catch((e) => {
			writeTokens(null);
			throw e instanceof AuthError ? e : new AuthError(String(e));
		})
		.finally(() => {
			refreshing = null;
		});
	return refreshing;
}

export async function getAccessToken(forceRefresh = false): Promise<string> {
	const tokens = readTokens();
	if (!tokens) throw new AuthError("Not logged in");
	if (!forceRefresh && tokens.expiresAt - 60_000 > Date.now()) return tokens.accessToken;
	return (await refresh(tokens)).accessToken;
}

export function logout() {
	writeTokens(null);
}

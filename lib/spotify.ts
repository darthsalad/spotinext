export async function redirectToAuthCodeFlow(clientId: string) {
	// const verifier = generateCodeVerifier(128);
	const verifier = process.env.NEXT_PUBLIC_CODE_VERIFIER;
	const challenge = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(verifier)
	);
	const challengeBase64 = btoa(
		String.fromCharCode(...new Uint8Array(challenge))
	)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");

	const redirectUri = `${window.location.origin}/account`;
	const scopes = [
		"user-read-private",
		"user-read-email",
		"user-read-playback-state",
		"user-modify-playback-state",
		"user-read-currently-playing",
		"user-library-read",
		"user-library-modify",
		"playlist-read-private",
		"playlist-read-collaborative",
		"playlist-modify-public",
		"playlist-modify-private",
	];
	const state = "spotify_auth_state";
	const url = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(
		scopes.join(" ")
	)}&redirect_uri=${encodeURIComponent(
		redirectUri
	)}&state=${state}&code_challenge_method=S256&code_challenge=${challengeBase64}`;
	window.location.href = url;
}

// function generateCodeVerifier(length: number) {
// 	let text = "";
// 	const possible =
// 		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
// 	for (let i = 0; i < length; i++) {
// 		text += possible.charAt(Math.floor(Math.random() * possible.length));
// 	}
// 	return text;
// }

export async function getAccessToken(
	clientId: string,
	code: string
): Promise<{
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	scope: string;
}> {
	const verifier = process.env.NEXT_PUBLIC_CODE_VERIFIER;

	const params = new URLSearchParams();
	params.append("client_id", clientId);
	params.append("grant_type", "authorization_code");
	params.append("code", code);
	params.append("redirect_uri", "http://localhost:3000/account");
	params.append("code_verifier", verifier!);

	const response = await fetch("https://accounts.spotify.com/api/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: params,
	});
	if (!response.ok) {
		console.log(response.statusText);
	}
	const data = await response.json();
	return data;
}

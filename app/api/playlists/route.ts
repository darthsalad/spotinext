import { cookies } from "next/headers";
import { refreshAccessToken } from "@/lib/spotify";

export async function GET(req: Request) {
	const cookieStore = cookies();
	let tokenValue = cookieStore.get("access_token")?.value;

	if (!tokenValue) {
		const refreshToken = cookieStore.get("refresh_token")?.value;
		if (!refreshToken) {
			return new Response(JSON.stringify({ message: "No token found. Please login!" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}
		const tokens = await refreshAccessToken(refreshToken);
		if (!tokens) {
			return new Response(JSON.stringify({ message: "Session expired. Please login again." }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}
		const now = new Date();
		cookieStore.set("access_token", tokens.access_token, {
			httpOnly: true,
			sameSite: "strict",
			path: "/",
			expires: new Date(now.getTime() + tokens.expires_in * 1000),
		});
		cookieStore.set("refresh_token", tokens.refresh_token, {
			httpOnly: true,
			sameSite: "strict",
			path: "/",
			expires: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
		});
		tokenValue = tokens.access_token;
	}

	const { searchParams } = new URL(req.url);
	const offset = parseInt(searchParams.get("offset") ?? "0");

	const res = await fetch(`https://api.spotify.com/v1/me/playlists?limit=50&offset=${offset}`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${tokenValue}`,
		},
	});

	const data = await res.json();
	return new Response(
		JSON.stringify({
			items: data.items,
			total: data.total,
			nextOffset: data.next ? offset + 50 : null,
		}),
		{ status: res.ok ? 200 : res.status, headers: { "Content-Type": "application/json" } }
	);
}

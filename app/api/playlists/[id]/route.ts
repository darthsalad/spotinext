import { cookies } from "next/headers";
import { refreshAccessToken } from "@/lib/spotify";

export async function GET(req: Request, { params }: { params: { id: string } }) {
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
	const limit = 30;

	const res = await fetch(
		`https://api.spotify.com/v1/playlists/${params.id}/tracks?offset=${offset}&limit=${limit}&fields=total,next,items(track(id,name,artists(name),external_urls))`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${tokenValue}`,
			},
		}
	);

	if (!res.ok) {
		const data = await res.json();
		return new Response(JSON.stringify(data), {
			status: res.status,
			headers: { "Content-Type": "application/json" },
		});
	}

	const page = await res.json();
	const tracks = page.items
		.filter((item: any) => item.track !== null)
		.map((item: any) => ({
			id: item.track.id,
			name: item.track.name,
			artists: item.track.artists.map((a: any) => ({ name: a.name })),
			external_urls: item.track.external_urls,
		}));

	return new Response(
		JSON.stringify({
			tracks,
			total: page.total,
			nextOffset: page.next ? offset + limit : null,
		}),
		{ status: 200, headers: { "Content-Type": "application/json" } }
	);
}

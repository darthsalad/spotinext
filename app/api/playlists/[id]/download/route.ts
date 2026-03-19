import { cookies } from "next/headers";
import { refreshAccessToken } from "@/lib/spotify";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
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

	// Fetch all tracks from Spotify in batches of 50
	const allTracks: { name: string; artist: string }[] = [];
	let offset = 0;
	const limit = 50;

	while (true) {
		const res = await fetch(
			`https://api.spotify.com/v1/playlists/${params.id}/tracks?limit=${limit}&offset=${offset}&fields=total,next,items(track(name,artists(name)))`,
			{ headers: { Authorization: `Bearer ${tokenValue}` } }
		);
		if (!res.ok) {
			return new Response(JSON.stringify({ message: "Failed to fetch playlist tracks" }), {
				status: res.status,
				headers: { "Content-Type": "application/json" },
			});
		}
		const page = await res.json();
		for (const item of page.items) {
			if (!item.track) continue;
			allTracks.push({
				name: item.track.name,
				artist: item.track.artists.map((a: any) => a.name).join(", "),
			});
		}
		if (!page.next) break;
		offset += limit;
	}

	// Start the job on the Python server
	const serverUrl = process.env.SERVER_URL ?? process.env.NEXT_PUBLIC_SERVER_URL;
	const pythonRes = await fetch(`${serverUrl}/playlist`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ tracks: allTracks }),
	});

	if (!pythonRes.ok) {
		const text = await pythonRes.text();
		let err: unknown;
		try {
			err = JSON.parse(text);
		} catch {
			err = { message: `Download server error: ${pythonRes.status}` };
		}
		return new Response(JSON.stringify(err), {
			status: pythonRes.status,
			headers: { "Content-Type": "application/json" },
		});
	}

	const { job_id } = await pythonRes.json();
	return new Response(JSON.stringify({ job_id, total: allTracks.length }), {
		status: 202,
		headers: { "Content-Type": "application/json" },
	});
}

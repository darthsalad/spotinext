import { cookies } from "next/headers";

export async function GET(req: Request) {
	const cookieStore = cookies();
	const refresh_token = cookieStore.get("refresh_token")?.value;
	const expiry = cookieStore.get("expiry")?.value;
	const now = new Date();
	const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!;
	const secret = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET!;
	const buffer = Buffer.from(clientId + ":" + secret).toString("base64");

	if (expiry && refresh_token) {
		const expiryDate = new Date(expiry);
		if (expiryDate < now) {
			fetch("https://accounts.spotify.com/api/token", {
				method: "POST",
				headers: {
					Authorization: "Basic " + buffer,
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "refresh_token",
					refresh_token: refresh_token,
				}),
			})
				.then((res) => res.json())
				.then((data) => {
					console.log(data);
					return new Response(JSON.stringify(data), {
						status: 200,
						headers: {
							"Content-Type": "application/json",
						},
					});
				});
		}
	}
}

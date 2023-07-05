import { cookies } from "next/headers";

export async function GET(req: Request) {
	const cookieStore = cookies();
	const token = cookieStore.get("access_token");
	const now = new Date();
	if (token) {
		return new Response(JSON.stringify({ auth: true }), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		});
	} else {
		return new Response(JSON.stringify({ auth: false }), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}
}

export async function DELETE(req: Request) {
	const cookieStore = cookies();
	cookieStore.delete("access_token");
	cookieStore.delete("refresh_token");
	cookieStore.delete("code");

	return new Response(JSON.stringify({ message: "Logged out successfully!" }), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
		},
	});
}

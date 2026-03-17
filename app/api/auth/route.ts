import { cookies } from "next/headers";

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

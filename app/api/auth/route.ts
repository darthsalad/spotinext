import { cookies } from "next/headers";

export async function GET(req: Request) {
	const cookieStore = cookies();
	const token = cookieStore.get("access_token");
	const expiry = cookieStore.get("expiry");
	const now = new Date();
	if (expiry && token) {
		const expiryDate = new Date(Number(expiry.value));
		if (expiryDate > now) {
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
  } else {
    console.log("no expiry token");
    return new Response(JSON.stringify({ auth: false }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

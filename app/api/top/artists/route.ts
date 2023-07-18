import { cookies } from "next/headers";

export async function GET(req: Request) {
  const cookieStore = cookies();
  const accessToken = cookieStore.get("access_token");
  if (accessToken) {
    const res = await fetch(
			`https://api.spotify.com/v1/me/top/artists?limit=6&time_range=short_term`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken.value}`,
				},
				credentials: "include",
			}
		);
    if (!res.ok) {
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
    const response = await res.json();
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } else {
    return new Response(JSON.stringify({ message: "No token found. Please login!" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

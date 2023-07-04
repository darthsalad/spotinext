import { cookies } from "next/headers";

export async function GET(req: Request) {
  const cookieStore = cookies();
  const accessToken = cookieStore.get("access_token");
  if (accessToken) {
    const request = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken.value}`
      },
      credentials: "include",
    });
    const response = await request.json();
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } else {
    return new Response("Incorrent Token", {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
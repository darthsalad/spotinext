import { cookies } from "next/headers";

export async function POST(req: Request) {
  const cookieStore = cookies();
  const accessToken = cookieStore.get("access_token");
  if (accessToken) {
    const bodyStream = await req.body?.getReader().read(); 
    const bodyObj = new TextDecoder("utf-8").decode(bodyStream?.value);
    const id = JSON.parse(bodyObj).id;
    const res = await fetch(`https://api.spotify.com/v1/audio-features/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken.value}`,
      },
      credentials: "include",
    });
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
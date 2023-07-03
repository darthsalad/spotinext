import { cookies } from "next/headers";

export async function GET(req: Request) {
	const cookieStore = cookies();
  const token = cookieStore.get("access_token")?.value;
  
	const response = await fetch("https://api.spotify.com/v1/me", {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
  const data = await response.json();
  
	const profileData = {
		country: data.country,
		display_name: data.display_name,
		email: data.email,
		spotify_profile: data.external_urls?.spotify,
		followers: data.followers,
		id: data.id,
		images: data.images,
		type: data.type,
		uri: data.uri,
  };
  
  return new Response(JSON.stringify(profileData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    }
  });
}

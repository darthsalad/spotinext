export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { jobId: string } }) {
	const serverUrl = process.env.SERVER_URL ?? process.env.NEXT_PUBLIC_SERVER_URL;

	let res: Response;
	try {
		res = await fetch(`${serverUrl}/playlist/${params.jobId}/status`);
	} catch (e: any) {
		return new Response(JSON.stringify({ message: `Cannot reach download server: ${e.message}` }), {
			status: 503,
			headers: { "Content-Type": "application/json" },
		});
	}

	const text = await res.text();
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		data = { message: `Download server error: ${res.status}` };
	}
	return new Response(JSON.stringify(data), {
		status: res.status,
		headers: { "Content-Type": "application/json" },
	});
}

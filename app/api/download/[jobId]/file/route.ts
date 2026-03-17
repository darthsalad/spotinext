export async function GET(_req: Request, { params }: { params: { jobId: string } }) {
	const serverUrl = process.env.SERVER_URL ?? process.env.NEXT_PUBLIC_SERVER_URL;
	const res = await fetch(`${serverUrl}/playlist/${params.jobId}/file`);

	if (!res.ok) {
		const data = await res.json();
		return new Response(JSON.stringify(data), {
			status: res.status,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Stream the tar.gz directly to the client
	return new Response(res.body, {
		status: 200,
		headers: {
			"Content-Type": "application/gzip",
			"Content-Disposition": 'attachment; filename="playlist.tar.gz"',
		},
	});
}

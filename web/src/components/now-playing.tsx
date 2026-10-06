import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Equalizer, SpotifyIcon, Vinyl } from "@/components/decor";
import { DownloadCta } from "@/components/download-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlbumColor } from "@/hooks/use-album-color";
import { useTrackDownload } from "@/hooks/use-track-download";
import { resolveTrack, toTrackMeta } from "@/lib/downloader";
import { usePref } from "@/lib/prefs";
import { getArtist, getCurrentlyPlaying } from "@/lib/spotify";
import type { CurrentlyPlaying } from "@/types/spotify";

// Spotify has no push API for playback, so poll. React Query pauses this
// while the tab is hidden and refetches when it becomes visible again.
const POLL_MS = 4_000;

function nextPoll(data: CurrentlyPlaying | null | undefined) {
	const item = data?.item;
	if (!data?.is_playing || !item || item.type !== "track" || data.progress_ms == null) return POLL_MS;
	// catch the switch to the next song right as the current one ends
	const remaining = item.duration_ms - data.progress_ms;
	return Math.max(1_000, Math.min(POLL_MS, remaining + 800));
}

const formatTime = (ms: number) => {
	const s = Math.floor(ms / 1000);
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Advances the progress locally between polls so it moves smoothly. */
function LiveProgress({ progressMs, durationMs, playing, fetchedAt }: {
	progressMs: number;
	durationMs: number;
	playing: boolean;
	fetchedAt: number;
}) {
	const [now, setNow] = useState(Date.now);

	useEffect(() => {
		if (!playing) return;
		const id = setInterval(() => setNow(Date.now()), 500);
		return () => clearInterval(id);
	}, [playing]);

	const elapsed = playing ? Math.max(0, now - fetchedAt) : 0;
	const position = Math.min(durationMs, progressMs + elapsed);

	return (
		<div className="flex items-center gap-3 font-mono text-xs font-medium tabular-nums text-muted-foreground">
			<span className="w-9">{formatTime(position)}</span>
			<div
				role="progressbar"
				aria-label="Playback position"
				aria-valuemin={0}
				aria-valuemax={durationMs}
				aria-valuenow={position}
				className="h-3 flex-1 overflow-hidden rounded-full border-2 border-ink bg-muted"
			>
				<div
					className="h-full transition-[width] duration-500 ease-linear"
					style={{ width: `${(position / durationMs) * 100}%`, background: "var(--album)" }}
				/>
			</div>
			<span className="w-9 text-right">{formatTime(durationMs)}</span>
		</div>
	);
}

function Shell({ color, children }: { color: string; children: ReactNode }) {
	return (
		<section
			aria-label="Now playing"
			className="panel relative overflow-hidden p-5 shadow-brutal-album sm:p-8"
			style={{ "--album": color } as CSSProperties}
		>
			{/* soft glow in the album colour */}
			<div
				aria-hidden
				className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-25 blur-3xl transition-colors duration-700"
				style={{ background: color }}
			/>
			<div className="relative">{children}</div>
		</section>
	);
}

export function NowPlaying() {
	const { data, isLoading, dataUpdatedAt, refetch } = useQuery({
		queryKey: ["playing"],
		queryFn: getCurrentlyPlaying,
		refetchInterval: (query) => nextPoll(query.state.data),
	});

	// React Query refetches when the tab becomes visible, but not when the
	// window regains focus, e.g. coming back from the Spotify desktop app while
	// the browser stayed visible beside it.
	useEffect(() => {
		const onFocus = () => refetch();
		window.addEventListener("focus", onFocus);
		return () => window.removeEventListener("focus", onFocus);
	}, [refetch]);

	const item = data?.item ?? null;
	const track = item?.type === "track" ? item : null;
	const playing = !!data?.is_playing;
	const cover = track?.album.images[0]?.url;
	const color = useAlbumColor(cover);
	const [format] = usePref("format");

	// Look up the YouTube match (and genres for the tags) as soon as the song
	// shows up, so clicking download skips straight to the download.
	const { data: resolved, isFetching: resolving } = useQuery({
		queryKey: ["resolve", track?.id],
		queryFn: ({ signal }) => resolveTrack(toTrackMeta(track!), signal),
		enabled: !!track,
		staleTime: Infinity,
		retry: false,
	});
	const { data: artist } = useQuery({
		queryKey: ["artist", track?.artists[0]?.id],
		queryFn: () => getArtist(track!.artists[0].id),
		enabled: !!track?.artists[0]?.id,
		staleTime: Infinity,
	});
	const { state, download } = useTrackDownload();

	if (isLoading) {
		return (
			<Shell color={color}>
				<div className="flex flex-col gap-6 sm:flex-row sm:items-center">
					<Skeleton className="mx-auto h-48 w-48 rounded-lg sm:mx-0 sm:h-56 sm:w-56" />
					<div className="flex-1 space-y-3">
						<Skeleton className="h-6 w-32 rounded-full" />
						<Skeleton className="h-12 w-3/4" />
						<Skeleton className="h-5 w-1/2" />
						<Skeleton className="h-3 w-full rounded-full" />
						<Skeleton className="h-12 w-48 rounded-full" />
					</div>
				</div>
			</Shell>
		);
	}

	if (!track) {
		return (
			<Shell color={color}>
				<div className="flex flex-col items-center gap-6 py-4 text-center sm:flex-row sm:text-left">
					<Vinyl className="h-36 w-36 shrink-0" />
					<div>
						<span className="sticker bg-pop-yellow">
							<Equalizer playing={false} /> silence
						</span>
						<h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">{item ? item.name : "Nothing's spinning."}</h2>
						<p className="mt-2 text-muted-foreground">
							{item
								? "That's a podcast; only music tracks can be downloaded."
								: "Hit play on any device. This updates within a few seconds."}
						</p>
					</div>
				</div>
			</Shell>
		);
	}

	const year = track.album.release_date?.slice(0, 4);

	return (
		<Shell color={color}>
			<div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
				{/* cover with a record sliding out from behind it */}
				<div className="relative mx-auto h-48 w-48 shrink-0 sm:mx-0 sm:h-56 sm:w-56">
					<div
						className={`absolute inset-y-[6%] right-0 aspect-square transition-transform duration-700 ease-out ${
							playing ? "translate-x-[38%]" : "translate-x-[18%]"
						}`}
					>
						<Vinyl color={color} spinning={playing} className="h-full w-full" />
					</div>
					{cover ? (
						<img
							src={cover}
							alt={`${track.album.name} cover`}
							className="relative h-full w-full rounded-lg border-2 border-ink object-cover shadow-brutal"
						/>
					) : (
						<div className="relative h-full w-full rounded-lg border-2 border-ink bg-muted shadow-brutal" />
					)}
				</div>

				<div className="min-w-0 flex-1 pt-6 sm:pl-12 sm:pt-0">
					<div className="flex flex-wrap items-center gap-2">
						<span className="sticker -rotate-2" style={{ background: color }}>
							<Equalizer playing={playing} /> {playing ? "now playing" : "paused"}
						</span>
						{track.explicit && <span className="sticker rotate-1 bg-card text-foreground">explicit</span>}
					</div>

					<h1 className="mt-4 line-clamp-2 break-words text-4xl font-extrabold leading-[0.95] sm:text-5xl">
						<a
							href={track.external_urls.spotify}
							target="_blank"
							rel="noopener noreferrer"
							className="decoration-4 underline-offset-4 hover:underline"
						>
							{track.name}
						</a>
					</h1>
					<p className="mt-3 truncate text-lg font-semibold">
						{track.artists.map((a, i) => (
							<span key={a.id}>
								<a href={a.external_urls.spotify} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
									{a.name}
								</a>
								{i < track.artists.length - 1 && ", "}
							</span>
						))}
					</p>
					<p className="truncate text-sm text-muted-foreground">
						{track.album.name}
						{year && ` · ${year}`}
					</p>

					{data?.progress_ms != null && (
						<div className="mt-5">
							<LiveProgress
								progressMs={data.progress_ms}
								durationMs={track.duration_ms}
								playing={playing}
								fetchedAt={dataUpdatedAt}
							/>
						</div>
					)}

					<div className="mt-6 flex flex-wrap items-center gap-3">
						<DownloadCta
							state={state}
							format={format}
							onClick={() => download(toTrackMeta(track, artist?.genres ?? []), resolved?.videoId)}
						/>
						<a
							href={track.external_urls.spotify}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex h-12 items-center gap-2 rounded-full border-2 bg-card px-5 font-bold shadow-brutal-sm transition-transform hover:-translate-y-0.5"
						>
							<SpotifyIcon size={18} className="text-pop-green" /> Open
						</a>
						<span className="font-mono text-[11px] text-muted-foreground" aria-live="polite">
							{resolving ? "finding a match…" : resolved ? "● match ready" : ""}
						</span>
					</div>
				</div>
			</div>
		</Shell>
	);
}

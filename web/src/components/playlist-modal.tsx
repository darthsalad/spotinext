import { useInfiniteQuery } from "@tanstack/react-query";
import { Download, Loader2, Music2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TrackRow } from "@/components/track-row";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { trackEvent } from "@/lib/analytics";
import { downloadPlaylist, pickSaveTarget, type PlaylistProgress, type SaveTarget } from "@/lib/downloader";
import { getPref } from "@/lib/prefs";
import { getAllPlaylistTracks, getPlaylistTracks, playlistTotal } from "@/lib/spotify";
import type { Playlist } from "@/types/spotify";

type DownloadAllState =
	| { phase: "idle" }
	| { phase: "preparing"; target: SaveTarget["kind"] }
	| ({ phase: "downloading"; target: SaveTarget["kind"] } & PlaylistProgress)
	| ({ phase: "done" } & PlaylistProgress)
	| { phase: "error"; message: string };

export function PlaylistModal({ playlist, onClose }: { playlist: Playlist | null; onClose: () => void }) {
	const open = !!playlist;
	const sentinelRef = useRef<HTMLDivElement>(null);
	const abortRef = useRef<AbortController | null>(null);
	const [dl, setDl] = useState<DownloadAllState>({ phase: "idle" });
	const { toast } = useToast();

	const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
		queryKey: ["playlist-tracks", playlist?.id],
		queryFn: ({ pageParam }) => getPlaylistTracks(playlist!.id, pageParam),
		initialPageParam: 0,
		getNextPageParam: (last) => last.nextOffset ?? undefined,
		enabled: open,
		staleTime: 5 * 60_000,
	});
	const tracks = data?.pages.flatMap((p) => p.tracks) ?? [];

	// load the next page when the end of the list scrolls into view
	useEffect(() => {
		const el = sentinelRef.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
			},
			{ threshold: 0.1 }
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage, isLoading]);

	// closing the dialog cancels a running "Download all"
	useEffect(() => {
		if (open) return;
		abortRef.current?.abort();
		abortRef.current = null;
		setDl({ phase: "idle" });
	}, [open]);
	useEffect(() => () => abortRef.current?.abort(), []);

	const downloadAll = async () => {
		if (!playlist) return;
		const format = getPref("format");
		trackEvent("playlist_download_started", { playlist_id: playlist.id, format });
		// first await: the folder picker needs the click's user activation
		const target = await pickSaveTarget(playlist.name);
		if (!target) {
			trackEvent("playlist_download_cancelled", { playlist_id: playlist.id, stage: "folder_picker" });
			return;
		}

		const controller = new AbortController();
		abortRef.current = controller;
		setDl({ phase: "preparing", target: target.kind });
		try {
			const all = await getAllPlaylistTracks(playlist.id);
			if (controller.signal.aborted) return;
			setDl({ phase: "downloading", target: target.kind, done: 0, failed: [], total: all.length });

			const result = await downloadPlaylist(playlist.name, all, target, {
				format,
				signal: controller.signal,
				onProgress: (p) => setDl({ phase: "downloading", target: target.kind, ...p }),
			});
			if (controller.signal.aborted) return;
			const downloaded = result.done - result.failed.length;
			if (!result.total || !downloaded) {
				trackEvent("playlist_download_failed", {
					playlist_id: playlist.id,
					reason: result.total ? "no_tracks_downloaded" : "empty_playlist",
				});
			} else {
				trackEvent(result.failed.length ? "playlist_download_partial" : "playlist_download_completed", {
					playlist_id: playlist.id, downloaded_tracks: downloaded,
				});
			}
			setDl({ phase: "done", ...result });
			toast({
				title: `Downloaded ${result.done - result.failed.length} of ${result.total} tracks`,
				description: result.failed.length ? `Failed: ${result.failed.slice(0, 5).join(", ")}${result.failed.length > 5 ? "…" : ""}` : undefined,
				variant: result.failed.length === result.total ? "destructive" : "default",
			});
		} catch (e) {
			if (!controller.signal.aborted) {
				trackEvent("playlist_download_failed", { playlist_id: playlist.id, reason: "download_error" });
				setDl({ phase: "error", message: (e as Error).message });
			}
		} finally {
			if (controller.signal.aborted) {
				trackEvent("playlist_download_cancelled", { playlist_id: playlist.id, stage: "download" });
			}
			if (abortRef.current === controller) abortRef.current = null;
		}
	};

	const cancel = () => {
		abortRef.current?.abort();
		abortRef.current = null;
		setDl({ phase: "idle" });
	};

	const running = dl.phase === "preparing" || dl.phase === "downloading";
	const progress = dl.phase === "downloading" && dl.total ? (dl.done / dl.total) * 100 : dl.phase === "done" ? 100 : 0;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="flex max-h-[88vh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-xl p-0">
				<DialogHeader className="shrink-0 space-y-0 border-b-2 p-5 text-left sm:p-6">
					<div className="flex items-center gap-4 pr-8 sm:gap-5">
						{playlist?.images?.[0]?.url ? (
							<img
								src={playlist.images[0].url}
								alt=""
								className="h-24 w-24 shrink-0 rounded-lg border-2 border-ink object-cover shadow-brutal sm:h-28 sm:w-28"
							/>
						) : (
							<div className="grid h-24 w-24 shrink-0 place-items-center rounded-lg border-2 border-ink bg-muted shadow-brutal sm:h-28 sm:w-28">
								<Music2 size={36} className="text-muted-foreground" />
							</div>
						)}
						<div className="min-w-0">
							<span className="sticker -rotate-2 bg-pop-cyan">playlist</span>
							<DialogTitle className="mt-2 line-clamp-2 font-display text-2xl font-extrabold leading-tight sm:text-3xl">
								{playlist?.name}
							</DialogTitle>
							<DialogDescription className="mt-1 font-mono text-xs">
								{playlist && playlistTotal(playlist)} tracks &middot; by {playlist?.owner.display_name}
							</DialogDescription>
						</div>
					</div>

					<div className="mt-5 flex items-center gap-2">
						<button
							type="button"
							onClick={downloadAll}
							disabled={running || !!error}
							className="relative inline-flex h-11 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full border-2 border-ink bg-pop-green px-5 font-bold text-ink shadow-brutal transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-progress disabled:hover:translate-y-0 sm:flex-none sm:min-w-[14rem]"
						>
							{/* progress fill */}
							<span
								aria-hidden
								className="absolute inset-y-0 left-0 bg-pop-yellow transition-[width] duration-500"
								style={{ width: `${progress}%` }}
							/>
							<span className="relative flex items-center gap-2">
								{(dl.phase === "idle" || dl.phase === "done") && (
									<>
										<Download size={16} strokeWidth={2.5} />
										{dl.phase === "done" ? "Download again" : "Download all"}
									</>
								)}
								{dl.phase === "preparing" && (
									<>
										<Loader2 size={16} className="animate-spin" />
										Getting tracks…
									</>
								)}
								{dl.phase === "downloading" && (
									<>
										<Loader2 size={16} className="animate-spin" />
										<span className="font-mono tabular-nums">
											{dl.done} / {dl.total}
										</span>
									</>
								)}
								{dl.phase === "error" && (
									<>
										<Download size={16} strokeWidth={2.5} />
										Retry
									</>
								)}
							</span>
						</button>
						{running && (
							<Button variant="outline" size="icon" onClick={cancel} aria-label="Cancel download">
								<X size={16} />
							</Button>
						)}
					</div>

					<div className="mt-2 min-h-4 font-mono text-[11px] text-muted-foreground" aria-live="polite">
						{running && dl.target === "zip" && "A .zip is saved once every track is done."}
						{running && dl.target === "folder" && "Saving into the folder you picked."}
						{(dl.phase === "downloading" || dl.phase === "done") && dl.failed.length > 0 && (
							<span className="text-destructive"> {dl.failed.length} failed.</span>
						)}
						{dl.phase === "error" && <span className="text-destructive">{dl.message}</span>}
					</div>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4">
					{isLoading ? (
						<div className="space-y-4 p-2">
							{[...Array(8)].map((_, i) => (
								<div key={i} className="flex items-center gap-3">
									<Skeleton className="h-3 w-6" />
									<div className="flex-1 space-y-1.5">
										<Skeleton className="h-4 w-1/2" />
										<Skeleton className="h-3 w-1/3" />
									</div>
								</div>
							))}
						</div>
					) : error ? (
						<p className="p-2 text-sm text-destructive">Couldn't load this playlist: {(error as Error).message}</p>
					) : (
						<div className="space-y-0.5">
							{tracks.map((track, i) => (
								<TrackRow key={`${track.id}-${i}`} track={track} index={i} source="playlist_track" showArt />
							))}
							<div ref={sentinelRef} className="py-2">
								{isFetchingNextPage && (
									<div className="flex justify-center py-3">
										<Loader2 size={20} className="animate-spin text-muted-foreground" />
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

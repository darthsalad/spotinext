"use client";

import { PlaylistTrack, Playlist } from "@/types/playlists";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Download, Loader2, Music2 } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState } from "react";

type DownloadPhase =
	| { phase: "idle" }
	| { phase: "starting" }
	| { phase: "downloading"; done: number; total: number; failed: string[]; currentTrack: string }
	| { phase: "compressing"; done: number; total: number }
	| { phase: "complete" }
	| { phase: "error"; message: string };

interface Props {
	playlist: Playlist | null;
	open: boolean;
	onClose: () => void;
	onDownloadTrack: (name: string, artist: string) => void;
	server: string;
}

export default function PlaylistModal({ playlist, open, onClose, onDownloadTrack }: Props) {
	const sentinelRef = useRef<HTMLDivElement>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const [dlState, setDlState] = useState<DownloadPhase>({ phase: "idle" });
	const [jobId, setJobId] = useState<string | null>(null);

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
	} = useInfiniteQuery<{ tracks: PlaylistTrack[]; total: number; nextOffset: number | null }>(
		["playlist-tracks", playlist?.id],
		async ({ pageParam = 0 }) => {
			const res = await fetch(`/api/playlists/${playlist!.id}?offset=${pageParam}`, {
				credentials: "include",
			});
			if (!res.ok) throw new Error("Failed to fetch playlist tracks");
			return res.json();
		},
		{
			getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
			enabled: open && !!playlist?.id,
			staleTime: 5 * 60 * 1000,
		}
	);

	const allTracks = data?.pages.flatMap((p) => p.tracks) ?? [];

	// Auto-load next page when sentinel scrolls into view
	useEffect(() => {
		if (!sentinelRef.current) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ threshold: 0.1 }
		);
		observer.observe(sentinelRef.current);
		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	// Reset download state when modal closes
	useEffect(() => {
		if (!open) {
			if (intervalRef.current) clearInterval(intervalRef.current);
			intervalRef.current = null;
			setDlState({ phase: "idle" });
			setJobId(null);
		}
	}, [open]);

	// Poll job status when jobId is set
	useEffect(() => {
		if (!jobId) return;

		const poll = async () => {
			try {
				const res = await fetch(`/api/download/${jobId}/status`);
				if (!res.ok) {
					if (intervalRef.current) clearInterval(intervalRef.current);
					setDlState({ phase: "error", message: "Failed to check status" });
					return;
				}
				const data = await res.json();

				if (data.status === "downloading" || data.status === "pending") {
					setDlState({
						phase: "downloading",
						done: data.done,
						total: data.total,
						failed: data.failed ?? [],
						currentTrack: "",
					});
				} else if (data.status === "compressing") {
					setDlState({ phase: "compressing", done: data.done, total: data.total });
				} else if (data.status === "complete") {
					if (intervalRef.current) clearInterval(intervalRef.current);
					setDlState({ phase: "complete" });
					const link = document.createElement("a");
					link.href = `/api/download/${jobId}/file`;
					link.download = `${(playlist?.name ?? "playlist").replace(/\s+/g, "_")}.tar.gz`;
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					setTimeout(() => {
						setDlState({ phase: "idle" });
						setJobId(null);
					}, 2000);
				}
			} catch {
				if (intervalRef.current) clearInterval(intervalRef.current);
				setDlState({ phase: "error", message: "Connection lost" });
			}
		};

		poll();
		intervalRef.current = setInterval(poll, 1500);

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

	const handleDownloadAll = async () => {
		if (!playlist) return;
		setDlState({ phase: "starting" });
		try {
			const res = await fetch(`/api/playlists/${playlist.id}/download`, {
				method: "POST",
				credentials: "include",
			});
			if (!res.ok) {
				const err = await res.json();
				setDlState({ phase: "error", message: err.message ?? "Failed to start download" });
				return;
			}
			const { job_id, total } = await res.json();
			setJobId(job_id);
			setDlState({ phase: "downloading", done: 0, total, failed: [], currentTrack: "" });
		} catch (e: any) {
			setDlState({ phase: "error", message: e.message ?? "Unknown error" });
		}
	};

	const dlProgress =
		dlState.phase === "downloading" || dlState.phase === "compressing"
			? dlState.phase === "compressing"
				? 100
				: Math.round((dlState.done / dlState.total) * 100)
			: 0;

	const isDownloading =
		dlState.phase === "starting" ||
		dlState.phase === "downloading" ||
		dlState.phase === "compressing";

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="max-w-2xl w-full max-h-[80vh] flex flex-col p-0 gap-0 [&>button]:hidden">

				{/* Header */}
				<DialogHeader className="px-6 pt-6 pb-4 shrink-0">
					{/* Art — full width */}
					{playlist?.images[0]?.url ? (
						<img
							src={playlist.images[0].url}
							alt={playlist.name}
							className="w-full h-52 rounded-lg object-cover"
						/>
					) : (
						<div className="w-full h-52 rounded-lg bg-muted flex items-center justify-center">
							<Music2 size={48} className="text-muted-foreground" />
						</div>
					)}
					{/* Text + button below art */}
					<div className="flex items-center justify-between gap-3 mt-3">
						<div className="min-w-0">
							<DialogTitle className="text-xl leading-tight truncate">
								{playlist?.name}
							</DialogTitle>
							<p className="text-sm text-muted-foreground mt-0.5">
								{playlist?.tracks.total} songs &middot; {playlist?.owner.display_name}
							</p>
						</div>
						<Button
							className="rounded-lg bg-[#00db4d] text-black hover:bg-[#00db4d]/80 shrink-0 min-w-[130px]"
							onClick={handleDownloadAll}
							disabled={isDownloading}
							title={dlState.phase === "error" ? dlState.message : undefined}
						>
							{dlState.phase === "idle" && (
								<><Download size={15} className="mr-2" />Download All</>
							)}
							{dlState.phase === "starting" && (
								<><Loader2 size={15} className="mr-2 animate-spin" />Preparing…</>
							)}
							{dlState.phase === "downloading" && (
								<><Loader2 size={15} className="mr-2 animate-spin" />{dlState.done}&thinsp;/&thinsp;{dlState.total}</>
							)}
							{dlState.phase === "compressing" && (
								<><Loader2 size={15} className="mr-2 animate-spin" />Compressing…</>
							)}
							{dlState.phase === "complete" && (
								<>Done!</>
							)}
							{dlState.phase === "error" && (
								<><Download size={15} className="mr-2" />Retry</>
							)}
						</Button>
					</div>

					{/* Progress bar */}
					{(isDownloading || dlState.phase === "complete") && (
						<div className="mt-3 space-y-1.5">
							<div className="w-full bg-muted rounded-full h-1">
								<div
									className="bg-[#00db4d] h-1 rounded-full transition-all duration-500"
									style={{ width: dlState.phase === "complete" ? "100%" : `${dlProgress}%` }}
								/>
							</div>
							{dlState.phase === "downloading" && dlState.currentTrack && (
								<p className="text-xs text-muted-foreground truncate">
									↓ {dlState.currentTrack}
								</p>
							)}
							{dlState.phase === "downloading" && dlState.failed.length > 0 && (
								<p className="text-xs text-destructive">
									{dlState.failed.length} track(s) failed
								</p>
							)}
							{dlState.phase === "compressing" && (
								<p className="text-xs text-muted-foreground">Compressing archive…</p>
							)}
						</div>
					)}
				</DialogHeader>

				<div className="border-t" />

				{/* Track list */}
				<div className="overflow-y-auto flex-1 px-6 py-3">
					{isLoading ? (
						<div className="space-y-3">
							{[...Array(8)].map((_, i) => (
								<div key={i} className="flex items-center justify-between gap-3 py-1">
									<div className="flex-1 min-w-0">
										<Skeleton className="h-3.5 w-52" />
										<Skeleton className="h-3 w-32 mt-1.5" />
									</div>
									<Skeleton className="w-8 h-8 rounded-full shrink-0" />
								</div>
							))}
						</div>
					) : (
						<div className="space-y-0.5">
							{allTracks.map((track, idx) => (
								<div
									key={`${track.id}-${idx}`}
									className="flex items-center justify-between gap-3 py-2 px-2 rounded-lg hover:bg-muted/50 group"
								>
									<div className="flex items-center gap-3 min-w-0">
										<span className="text-xs text-muted-foreground w-5 text-right shrink-0">
											{idx + 1}
										</span>
										<div className="min-w-0">
											<p className="text-sm font-medium truncate">{track.name}</p>
											<p className="text-xs text-muted-foreground truncate">
												{track.artists.map((a) => a.name).join(", ")}
											</p>
										</div>
									</div>
									<Button
										size="icon"
										variant="ghost"
										className="rounded-full shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#00db4d]/20 hover:text-[#00db4d]"
										onClick={() =>
											onDownloadTrack(
												track.name,
												track.artists.map((a) => a.name).join(", ")
											)
										}
									>
										<Download size={14} />
									</Button>
								</div>
							))}

							{/* Sentinel for infinite scroll */}
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

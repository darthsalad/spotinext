import { DownloadButton } from "@/components/download-button";
import { useTrackDownload } from "@/hooks/use-track-download";
import { toTrackMeta } from "@/lib/downloader";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/spotify";

export function ExplicitBadge() {
	return (
		<span
			title="Explicit"
			aria-label="Explicit"
			className="inline-grid h-4 w-4 shrink-0 place-items-center rounded-[4px] bg-muted-foreground/80 font-mono text-[9px] font-bold text-background"
		>
			E
		</span>
	);
}

const formatDuration = (ms: number) => {
	const s = Math.round(ms / 1000);
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function TrackRow({ track, index, showArt = false, size = "md" }: {
	track: Track;
	index: number;
	showArt?: boolean;
	size?: "md" | "lg";
}) {
	const { state, download } = useTrackDownload();
	const pinned = state.phase !== "idle";

	return (
		<div className={cn(
				"group flex items-center gap-3 rounded-lg border-2 border-transparent p-2 transition-colors hover:border-border hover:bg-muted/40",
				size === "lg" && "gap-4 lg:px-3"
			)}>
			<span className="w-6 shrink-0 text-right font-mono text-xs font-bold tabular-nums text-muted-foreground">
				{String(index + 1).padStart(2, "0")}
			</span>
			{showArt && (
				<img
					src={track.album.images.at(-1)?.url ?? track.album.images[0]?.url}
					alt=""
					loading="lazy"
					className={cn("shrink-0 rounded-md border-2 border-ink object-cover", size === "lg" ? "h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16" : "h-11 w-11")}
				/>
			)}
			<div className="min-w-0 flex-1">
				<a
					href={track.external_urls.spotify}
					target="_blank"
					rel="noopener noreferrer"
					className={cn("block truncate font-semibold underline-offset-2 hover:underline", size === "lg" && "sm:text-[17px] lg:text-lg")}
				>
					{track.name}
				</a>
				<p className={cn("flex items-center gap-1.5 truncate text-sm text-muted-foreground", size === "lg" && "lg:text-[15px]")}>
					{track.explicit && <ExplicitBadge />}
					<span className="truncate">{track.artists.map((a) => a.name).join(", ")}</span>
				</p>
			</div>
			<span className="hidden shrink-0 font-mono text-xs tabular-nums text-muted-foreground sm:block">
				{formatDuration(track.duration_ms)}
			</span>
			<DownloadButton
				state={state}
				// always visible on touch screens; revealed on hover with a mouse
				className={cn(!pinned && "sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100")}
				onClick={() => download(toTrackMeta(track))}
			/>
		</div>
	);
}

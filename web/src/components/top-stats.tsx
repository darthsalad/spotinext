import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { popColor } from "@/components/decor";
import { SectionHeader } from "@/components/section-header";
import { TrackRow } from "@/components/track-row";
import { Skeleton } from "@/components/ui/skeleton";
import { getTopArtists, getTopTracks, type TimeRange } from "@/lib/spotify";
import { cn } from "@/lib/utils";

const RANGES: { value: TimeRange; label: string }[] = [
	{ value: "short_term", label: "4 weeks" },
	{ value: "medium_term", label: "6 months" },
	{ value: "long_term", label: "All time" },
];
const STALE = 60 * 60_000;

export function TopStats() {
	const [range, setRange] = useState<TimeRange>("short_term");
	const artists = useQuery({
		queryKey: ["top-artists", range],
		queryFn: () => getTopArtists(range),
		staleTime: STALE,
		placeholderData: keepPreviousData,
	});
	const tracks = useQuery({
		queryKey: ["top-tracks", range],
		queryFn: () => getTopTracks(range),
		staleTime: STALE,
		placeholderData: keepPreviousData,
	});

	return (
		<section aria-labelledby="top-heading">
			<SectionHeader id="top-heading" title="Your top" sticker={<span className="sticker rotate-3 bg-pop-pink">on repeat</span>}>
				<div role="tablist" aria-label="Time range" className="flex rounded-full border-2 bg-card p-1 shadow-brutal-sm">
					{RANGES.map((r) => (
						<button
							key={r.value}
							type="button"
							role="tab"
							aria-selected={range === r.value}
							onClick={() => setRange(r.value)}
							className={cn(
								"rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors",
								range === r.value ? "bg-ink text-white dark:bg-foreground dark:text-background" : "text-muted-foreground hover:text-foreground"
							)}
						>
							{r.label}
						</button>
					))}
				</div>
			</SectionHeader>

			<div className={cn("grid gap-8 transition-opacity lg:grid-cols-2", (artists.isPlaceholderData || tracks.isPlaceholderData) && "opacity-60")}>
				{/* artists */}
				<div className="panel p-5 sm:p-6">
					<h3 className="mb-4 text-xl font-extrabold">Artists</h3>
					<ol className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-2">
						{artists.isLoading
							? [...Array(6)].map((_, i) => (
									<li key={i}>
										<Skeleton className="aspect-square w-full rounded-lg" />
										<Skeleton className="mt-2 h-4 w-3/4" />
									</li>
								))
							: artists.data?.items.slice(0, 6).map((artist, i) => (
									<li key={artist.id}>
										<a href={artist.external_urls.spotify} target="_blank" rel="noopener noreferrer" className="group block">
											<div className="relative">
												<div
													className="aspect-square w-full rounded-lg border-2 border-ink bg-muted bg-cover bg-center shadow-brutal transition-transform group-hover:-translate-y-1 group-hover:rotate-1"
													style={artist.images[0] ? { backgroundImage: `url(${artist.images[0].url})` } : undefined}
												/>
												<span
													className={cn(
														"absolute -left-2 -top-2 grid h-8 w-8 place-items-center rounded-full border-2 border-ink font-mono text-xs font-bold text-ink shadow-brutal-sm",
														popColor(i),
														i % 2 ? "rotate-6" : "-rotate-6"
													)}
												>
													{i + 1}
												</span>
											</div>
											<p className="mt-3 truncate font-display font-bold leading-tight lg:text-lg">{artist.name}</p>
											<p className="truncate text-xs text-muted-foreground lg:text-sm">{artist.genres?.[0] ?? " "}</p>
										</a>
									</li>
								))}
					</ol>
				</div>

				{/* tracks */}
				<div className="panel flex flex-col p-3 sm:p-5">
					<h3 className="mb-2 px-2 text-xl font-extrabold">Tracks</h3>
					{/* rows share the panel height evenly, so the list fills the box */}
					<div className="grid flex-1 auto-rows-fr gap-0.5">
						{tracks.isLoading
							? [...Array(8)].map((_, i) => (
									<div key={i} className="flex items-center gap-3 p-2">
										<Skeleton className="h-12 w-12 rounded-md" />
										<div className="flex-1 space-y-1.5">
											<Skeleton className="h-4 w-1/2" />
											<Skeleton className="h-3 w-1/3" />
										</div>
									</div>
								))
							: tracks.data?.items.map((track, i) => <TrackRow key={track.id} track={track} index={i} showArt size="lg" />)}
					</div>
				</div>
			</div>
		</section>
	);
}

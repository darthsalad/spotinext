import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, Music2 } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { PlaylistModal } from "@/components/playlist-modal";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trackEvent } from "@/lib/analytics";
import { getPlaylists, playlistTotal } from "@/lib/spotify";
import type { Playlist } from "@/types/spotify";

// must match the grid-cols-* classes on the grid below
const BREAKPOINTS: [query: string, cols: number][] = [
	["(min-width: 1024px)", 5],
	["(min-width: 768px)", 4],
	["(min-width: 640px)", 3],
];

function subscribeResize(listener: () => void) {
	const lists = BREAKPOINTS.map(([q]) => window.matchMedia(q));
	lists.forEach((l) => l.addEventListener("change", listener));
	return () => lists.forEach((l) => l.removeEventListener("change", listener));
}

/** How many columns the playlist grid currently has. */
function useGridColumns() {
	return useSyncExternalStore(subscribeResize, () => BREAKPOINTS.find(([q]) => window.matchMedia(q).matches)?.[1] ?? 2);
}

export function Playlists() {
	const [selected, setSelected] = useState<Playlist | null>(null);
	// start with one row; each "Show more" adds two
	const [rows, setRows] = useState(1);
	const cols = useGridColumns();
	const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
		queryKey: ["playlists"],
		queryFn: ({ pageParam }) => getPlaylists(pageParam),
		initialPageParam: 0,
		getNextPageParam: (last) => (last.next ? last.offset + last.limit : undefined),
		staleTime: 5 * 60_000,
	});
	const playlists = data?.pages.flatMap((p) => p.items).filter(Boolean) ?? [];
	const total = data?.pages[0]?.total;
	const visibleCount = rows * cols;
	const visible = playlists.slice(0, visibleCount);
	const hasMore = visibleCount < playlists.length || !!hasNextPage;

	// fetch the next page from Spotify once the visible rows run past what's loaded
	useEffect(() => {
		if (visibleCount > playlists.length && hasNextPage && !isFetchingNextPage) fetchNextPage();
	}, [visibleCount, playlists.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

	return (
		<section aria-labelledby="playlists-heading">
			<SectionHeader
				id="playlists-heading"
				title="Playlists"
				sticker={total != null && <span className="sticker -rotate-3 bg-pop-cyan">{total}</span>}
			/>
			<div className="grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-6 md:grid-cols-4 lg:grid-cols-5">
				{isLoading
					? [...Array(cols)].map((_, i) => (
							<div key={i}>
								<Skeleton className="aspect-square w-full rounded-xl" />
								<Skeleton className="mt-3 h-4 w-3/4" />
								<Skeleton className="mt-1.5 h-3 w-1/2" />
							</div>
						))
					: visible.map((playlist) => (
							<button
								key={playlist.id}
								type="button"
								className="group min-w-0 rounded-xl text-left"
								onClick={() => {
									setSelected(playlist);
									trackEvent("playlist_opened", { playlist_id: playlist.id, track_count: playlistTotal(playlist) });
								}}
							>
								<div className="overflow-hidden rounded-xl border-2 border-ink bg-muted shadow-brutal transition-[transform,box-shadow] duration-150 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:shadow-brutal-lg group-active:translate-x-0 group-active:translate-y-0 group-active:shadow-none">
									{playlist.images?.[0]?.url ? (
										<img src={playlist.images[0].url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
									) : (
										<div className="grid aspect-square w-full place-items-center">
											<Music2 size={36} className="text-muted-foreground" />
										</div>
									)}
								</div>
								<p className="mt-3 truncate font-display font-bold leading-tight">{playlist.name}</p>
								<p className="truncate font-mono text-xs text-muted-foreground">{playlistTotal(playlist)} tracks</p>
							</button>
						))}
			</div>
			{!isLoading && hasMore && (
				<div className="mt-8 flex justify-center">
					<Button variant="outline" onClick={() => {
						setRows((r) => r + 2);
						trackEvent("playlists_show_more", { visible_count: visible.length });
					}} disabled={isFetchingNextPage}>
						{isFetchingNextPage && <Loader2 size={15} className="animate-spin" />}
						Show more
					</Button>
				</div>
			)}
			<PlaylistModal playlist={selected} onClose={() => setSelected(null)} />
		</section>
	);
}

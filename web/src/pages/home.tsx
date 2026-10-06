import { NowPlaying } from "@/components/now-playing";
import { Playlists } from "@/components/playlists";
import { TopStats } from "@/components/top-stats";

export function HomePage() {
	return (
		<div className="container space-y-10 py-8 sm:py-10">
			<NowPlaying />
			<TopStats />
			<Playlists />
		</div>
	);
}

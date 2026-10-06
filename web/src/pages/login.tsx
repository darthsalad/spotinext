import { Download, Image as ImageIcon, ListMusic } from "lucide-react";
import { SpotifyIcon, Vinyl } from "@/components/decor";
import { CLIENT_ID, login } from "@/lib/auth";

const FEATURES = [
	{ icon: Download, label: "One-click downloads", color: "bg-pop-green" },
	{ icon: ImageIcon, label: "Album art + full tags", color: "bg-pop-pink" },
	{ icon: ListMusic, label: "Whole playlists", color: "bg-pop-cyan" },
];

export function LoginPage() {
	return (
		<div className="container grid items-center gap-14 py-12 sm:py-20 lg:grid-cols-[1.15fr,1fr]">
			<div>
				<span className="sticker -rotate-2 bg-pop-yellow">spotify → your disk</span>
				<h1 className="mt-6 text-5xl font-extrabold leading-[0.92] sm:text-7xl">
					Your music,
					<br />
					<span className="mt-2 inline-block -rotate-1 rounded-xl border-2 border-ink bg-pop-green px-3 text-ink shadow-brutal">
						offline
					</span>{" "}
					&amp; tagged.
				</h1>
				<p className="mt-7 max-w-md text-lg text-muted-foreground">
					See what you're playing and who you're obsessed with, then grab any song or playlist with album art and proper
					tags, ready for any player.
				</p>

				{!CLIENT_ID && (
					<p className="mt-6 rounded-lg border-2 border-ink bg-pop-pink p-3 text-sm font-semibold text-ink">
						VITE_SPOTIFY_CLIENT_ID is not set. Copy web/.env.example to web/.env and fill it in.
					</p>
				)}

				<button
					type="button"
					onClick={login}
					disabled={!CLIENT_ID}
					className="mt-8 inline-flex h-14 items-center gap-3 rounded-full border-2 border-ink bg-pop-green px-8 text-lg font-bold text-ink shadow-brutal-lg transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
				>
					<SpotifyIcon size={24} />
					Connect Spotify
				</button>

				<ul className="mt-10 flex flex-wrap gap-3">
					{FEATURES.map(({ icon: Icon, label, color }) => (
						<li key={label} className="flex items-center gap-2 rounded-full border-2 bg-card py-1.5 pl-1.5 pr-4 text-sm font-semibold shadow-brutal-sm">
							<span className={`grid h-7 w-7 place-items-center rounded-full border-2 border-ink text-ink ${color}`}>
								<Icon size={14} strokeWidth={2.5} />
							</span>
							{label}
						</li>
					))}
				</ul>
			</div>

			{/* decorative record + sleeve */}
			<div aria-hidden className="relative mx-auto hidden h-[26rem] w-[26rem] lg:block">
				<div className="absolute right-0 top-6 h-80 w-80">
					<Vinyl spinning color="#FF6AB0" className="h-full w-full" />
				</div>
				<div className="absolute left-0 top-16 grid h-80 w-72 -rotate-6 place-items-center rounded-xl border-2 border-ink bg-pop-violet shadow-brutal-lg">
					<div className="text-center text-ink">
						<p className="font-display text-6xl font-extrabold leading-none">
							side
							<br />A
						</p>
						<p className="mt-4 font-mono text-xs font-bold uppercase tracking-widest">your top 10</p>
					</div>
				</div>
				<span className="sticker absolute bottom-4 right-10 rotate-6 bg-pop-yellow text-sm">m4a · mp3</span>
			</div>
		</div>
	);
}

function GithubIcon({ size = 18 }: { size?: number }) {
	return (
		<svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
			<path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
		</svg>
	);
}

const iconLink =
	"grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-card shadow-brutal-sm transition-transform hover:-translate-y-0.5 hover:bg-pop-yellow hover:text-ink";

export function Footer() {
	return (
		<footer className="mt-16 border-t-2 bg-background/85">
			<div className="container flex flex-col items-center justify-between gap-4 py-8 text-sm sm:flex-row">
				<p className="text-muted-foreground">
					<span className="font-display text-base font-extrabold text-foreground">spotinext</span>{" "}
					<span className="font-mono text-xs">v2.0</span> · built by{" "}
					<a
						href="https://twitter.com/_darthsalad_"
						target="_blank"
						rel="noopener noreferrer"
						className="font-semibold text-foreground underline decoration-pop-pink decoration-2 underline-offset-4"
					>
						darthsalad
					</a>
				</p>
				<div className="flex items-center gap-3">
					<a href="https://github.com/darthsalad/spotinext" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className={iconLink}>
						<GithubIcon />
					</a>
				</div>
			</div>
		</footer>
	);
}

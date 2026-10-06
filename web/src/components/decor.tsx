import { cn } from "@/lib/utils";

/** Three bouncing bars; frozen when paused. */
export function Equalizer({ playing, className }: { playing: boolean; className?: string }) {
	return (
		<span aria-hidden className={cn("flex h-3 items-end gap-[2px]", className)}>
			{[0, 0.25, 0.5].map((delay) => (
				<span
					key={delay}
					className={cn("w-[3px] origin-bottom rounded-full bg-current", playing ? "h-full animate-eq" : "h-1/3")}
					style={{ animationDelay: `${-delay}s` }}
				/>
			))}
		</span>
	);
}

/** A vinyl record; the centre label takes the album colour. */
export function Vinyl({ color, spinning, className }: { color?: string; spinning?: boolean; className?: string }) {
	return (
		<div
			aria-hidden
			className={cn("relative rounded-full border-2 border-ink shadow-brutal", spinning && "animate-spin-slow", className)}
			style={{
				background:
					"repeating-radial-gradient(circle at center, #151517 0 2px, #222226 2px 3.5px), #151517",
			}}
		>
			<div className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.14),transparent_40%,transparent_60%,rgba(255,255,255,0.08))]" />
			<div
				className="absolute left-1/2 top-1/2 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink"
				style={{ background: color ?? "#1ED760" }}
			>
				<div className="absolute left-1/2 top-1/2 h-[16%] w-[16%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink" />
			</div>
		</div>
	);
}

export function Logo({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 32 32" className={className} aria-hidden>
			<circle cx="16" cy="16" r="14.5" fill="#151517" stroke="currentColor" strokeWidth="2" />
			<circle cx="16" cy="16" r="10" fill="none" stroke="#2a2a2f" strokeWidth="1.2" />
			<circle cx="16" cy="16" r="6.5" fill="#1ED760" stroke="#151517" strokeWidth="1.5" />
			<circle cx="16" cy="16" r="1.6" fill="#151517" />
		</svg>
	);
}

export function SpotifyIcon({ size = 20, className }: { size?: number; className?: string }) {
	return (
		<svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" aria-hidden>
			<path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1 .25c-2.85-1.74-6.45-2.14-10.68-1.17a.75.75 0 1 1-.33-1.46c4.63-1.06 8.6-.6 11.77 1.34.36.22.47.69.25 1.04Zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.26-2-8.24-2.59-12.1-1.42a.94.94 0 1 1-.54-1.8c4.41-1.34 9.9-.69 13.62 1.6.44.27.58.85.31 1.3Zm.13-3.4C15.18 8.3 8.75 8.08 5.03 9.21a1.13 1.13 0 1 1-.65-2.16c4.27-1.3 11.37-1.04 15.86 1.62a1.13 1.13 0 0 1-1.14 1.95Z" />
		</svg>
	);
}

const STICKER_COLORS = ["bg-pop-yellow", "bg-pop-pink", "bg-pop-cyan", "bg-pop-violet", "bg-pop-orange", "bg-pop-green"];

/** Cycles through the accent palette, e.g. for rank numbers. */
export const popColor = (i: number) => STICKER_COLORS[i % STICKER_COLORS.length];

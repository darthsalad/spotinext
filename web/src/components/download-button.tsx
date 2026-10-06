import { AlertCircle, Check, Download, Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import type { TrackDownloadState } from "@/hooks/use-track-download";
import { cn } from "@/lib/utils";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { state: TrackDownloadState };

function describe(state: TrackDownloadState) {
	switch (state.phase) {
		case "error":
			return `Download failed: ${state.message}. Click to retry.`;
		case "done":
			return "Saved";
		case "preparing":
			return "Preparing download";
		case "downloading":
			return `Downloading, ${Math.round(state.progress * 100)}%`;
		default:
			return "Download";
	}
}

/** Small round icon button used in track lists. */
export function DownloadButton({ state, className, ...props }: Props) {
	const busy = state.phase === "preparing" || state.phase === "downloading";
	const label = describe(state);

	return (
		<button
			type="button"
			disabled={busy}
			title={label}
			aria-label={label}
			className={cn(
				"grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-card text-foreground shadow-brutal-sm transition-[transform,box-shadow,background-color] hover:bg-pop-green hover:text-ink active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-progress",
				state.phase === "done" && "bg-pop-green text-ink",
				state.phase === "error" && "bg-pop-pink text-ink",
				className
			)}
			{...props}
		>
			{state.phase === "idle" && <Download size={15} strokeWidth={2.5} />}
			{state.phase === "preparing" && <Loader2 size={15} className="animate-spin" />}
			{state.phase === "downloading" && (
				<span className="font-mono text-[10px] font-bold tabular-nums">{Math.round(state.progress * 100)}</span>
			)}
			{state.phase === "done" && <Check size={15} strokeWidth={3} />}
			{state.phase === "error" && <AlertCircle size={15} strokeWidth={2.5} />}
		</button>
	);
}

/** Big labelled call-to-action whose background fills up with the progress. */
export function DownloadCta({ state, format, className, ...props }: Props & { format: string }) {
	const busy = state.phase === "preparing" || state.phase === "downloading";
	const progress = state.phase === "downloading" ? state.progress : state.phase === "done" ? 1 : 0;

	return (
		<button
			type="button"
			disabled={busy}
			aria-label={describe(state)}
			className={cn(
				"relative inline-flex h-12 min-w-[12rem] items-center justify-center gap-2 overflow-hidden rounded-full border-2 border-ink bg-pop-green px-6 font-bold text-ink shadow-brutal transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-progress disabled:hover:translate-x-0 disabled:hover:translate-y-0",
				state.phase === "error" && "bg-pop-pink",
				className
			)}
			{...props}
		>
			{/* progress fill */}
			<span
				aria-hidden
				className="absolute inset-y-0 left-0 bg-pop-yellow transition-[width] duration-200"
				style={{ width: `${progress * 100}%` }}
			/>
			<span className="relative flex items-center gap-2">
				{state.phase === "idle" && (
					<>
						<Download size={18} strokeWidth={2.5} />
						Download <span className="font-mono text-xs uppercase">{format}</span>
					</>
				)}
				{state.phase === "preparing" && (
					<>
						<Loader2 size={18} className="animate-spin" />
						Grabbing it…
					</>
				)}
				{state.phase === "downloading" && (
					<span className="font-mono tabular-nums">{Math.round(state.progress * 100)}%</span>
				)}
				{state.phase === "done" && (
					<>
						<Check size={18} strokeWidth={3} />
						Saved!
					</>
				)}
				{state.phase === "error" && (
					<>
						<AlertCircle size={18} strokeWidth={2.5} />
						Try again
					</>
				)}
			</span>
		</button>
	);
}

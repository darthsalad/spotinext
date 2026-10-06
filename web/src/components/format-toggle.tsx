import { usePref } from "@/lib/prefs";
import { cn } from "@/lib/utils";

const OPTIONS = [
	{ value: "m4a", label: "M4A", hint: "Fastest, original quality" },
	{ value: "mp3", label: "MP3", hint: "Slower, for older devices" },
] as const;

/** Segmented M4A / MP3 switch; always visible so the choice is obvious. */
export function FormatToggle() {
	const [format, setFormat] = usePref("format");

	return (
		<div role="radiogroup" aria-label="Download format" className="flex rounded-full border-2 bg-card p-0.5 shadow-brutal-sm">
			{OPTIONS.map((o) => (
				<button
					key={o.value}
					type="button"
					role="radio"
					aria-checked={format === o.value}
					title={o.hint}
					onClick={() => setFormat(o.value)}
					className={cn(
						"rounded-full px-3 py-1 font-mono text-xs font-bold transition-colors",
						format === o.value ? "bg-pop-green text-ink" : "text-muted-foreground hover:text-foreground"
					)}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

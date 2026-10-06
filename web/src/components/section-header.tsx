import type { ReactNode } from "react";

/** Big display heading with an optional sticker and right-side controls. */
export function SectionHeader({ id, title, sticker, children }: { id?: string; title: string; sticker?: ReactNode; children?: ReactNode }) {
	return (
		<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
			<div className="flex items-center gap-3">
				<h2 id={id} className="text-3xl font-extrabold sm:text-4xl">{title}</h2>
				{sticker}
			</div>
			{children}
		</div>
	);
}

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePref } from "@/lib/prefs";

/** Keeps the `dark` class on <html> in sync with the saved theme and the OS setting. */
export function ThemeSync() {
	const [theme] = usePref("theme");

	useEffect(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const apply = () =>
			document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && media.matches));
		apply();
		media.addEventListener("change", apply);
		return () => media.removeEventListener("change", apply);
	}, [theme]);

	return null;
}

export function ThemeToggle() {
	const [theme, setTheme] = usePref("theme");

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="icon" aria-label="Theme">
					<Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
					<Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
					<DropdownMenuRadioItem value="light" className="gap-2">
						<Sun size={14} /> Light
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="dark" className="gap-2">
						<Moon size={14} /> Dark
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="system" className="gap-2">
						<Monitor size={14} /> System
					</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

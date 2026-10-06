import { Logo } from "@/components/decor";
import { FormatToggle } from "@/components/format-toggle";
import { ThemeToggle } from "@/components/theme";
import { UserMenu } from "@/components/user-menu";
import { useLoggedIn } from "@/hooks/use-auth";

export function Navbar() {
	const loggedIn = useLoggedIn();

	return (
		<header className="sticky top-0 z-40 border-b-2 bg-background/85 backdrop-blur-md">
			<div className="container flex h-16 items-center justify-between gap-3">
				<a href="/" className="group flex items-center gap-2" aria-label="Spotinext home">
					<Logo className="h-8 w-8 text-ink transition-transform duration-500 group-hover:rotate-180 dark:text-foreground" />
					<span className="font-display text-2xl font-extrabold tracking-tight">spotinext</span>
					<span className="sticker hidden -rotate-6 bg-pop-yellow px-2 py-0 text-[10px] xs:inline-flex">beta</span>
				</a>
				<div className="flex items-center gap-2 sm:gap-3">
					{loggedIn && <FormatToggle />}
					<ThemeToggle />
					{loggedIn && <UserMenu />}
				</div>
			</div>
		</header>
	);
}

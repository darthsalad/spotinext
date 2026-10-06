import { useQuery } from "@tanstack/react-query";
import { ExternalLink, LogOut } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/auth";
import { getProfile } from "@/lib/spotify";

export function UserMenu() {
	const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile, staleTime: 60 * 60_000 });
	const name = profile?.display_name ?? profile?.id ?? "";
	const image = profile?.images.at(-1)?.url ?? profile?.images[0]?.url;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Account"
				className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border-2 border-ink bg-pop-violet font-display font-extrabold text-ink shadow-brutal-sm"
			>
				{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="font-normal">
					<p className="font-display text-base font-bold leading-tight truncate">{name}</p>
					{/* email/country/followers aren't returned to development-mode apps anymore */}
					<p className="font-mono text-xs text-muted-foreground truncate">
						{profile?.followers ? `${profile.followers.total} followers` : profile?.id}
					</p>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{profile && (
					<DropdownMenuItem asChild>
						<a href={profile.external_urls.spotify} target="_blank" rel="noopener noreferrer" className="gap-2">
							<ExternalLink size={14} /> Spotify profile
						</a>
					</DropdownMenuItem>
				)}
				<DropdownMenuItem onSelect={logout} className="gap-2">
					<LogOut size={14} /> Log out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

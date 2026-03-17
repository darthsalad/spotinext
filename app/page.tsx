"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { SpotifyPlaying } from "@/types/spotify-playing";
import { ProfileData } from "@/types/spotify-profile";
import { TopArtists, TopTracks } from "@/types/stats";
import { Playlist } from "@/types/playlists";
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Disc3, Download, ExternalLink, Loader2, LogOut, Music2, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PlaylistModal from "@/components/playlist-modal";
import { getCache, setCache, CACHE_TTL } from "@/lib/cache";

interface Stats {
	topArtists: TopArtists[] | null;
	topTracks: TopTracks[] | null;
}

export default function Home() {
	const router = useRouter();
	const { toast } = useToast();
	const server = process.env.NEXT_PUBLIC_SERVER_URL!;
	const queryClient = useQueryClient();

	// Seed React Query cache from localStorage after mount (avoids hydration mismatch)
	useEffect(() => {
		const cachedStats = getCache<Stats>("stats");
		if (cachedStats && !queryClient.getQueryData(["stats"])) {
			queryClient.setQueryData(["stats"], cachedStats.data);
		}
		const cachedPlaylists = getCache<Playlist[]>("playlists");
		if (cachedPlaylists && !queryClient.getQueryData(["playlists"])) {
			queryClient.setQueryData(["playlists"], {
				pages: [{ items: cachedPlaylists.data, total: cachedPlaylists.data.length, nextOffset: null }],
				pageParams: [0],
			});
		}
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// ── Now Playing ────────────────────────────────────────────────
	const {
		data: playingData,
		isLoading,
	} = useQuery<SpotifyPlaying | undefined>({
		queryKey: ["playing"],
		queryFn: async (): Promise<SpotifyPlaying | undefined> => {
			const res = await fetch("/api/playing", {
				method: "GET",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
			});
			if (!res.ok) {
				if (res.status === 401) {
					router.push("/auth/login");
					return;
				}
				toast({
					variant: "destructive",
					title: "Something went wrong!",
					description: JSON.stringify(await res.json()),
				});
				return;
			}
			return res.json() as Promise<SpotifyPlaying>;
		},
		// poll faster when playing, slower when paused/idle
		refetchInterval: (data) => data?.is_playing ? 30_000 : 60_000,
		refetchOnWindowFocus: true,
	});

	// ── Profile ────────────────────────────────────────────────────
	const {
		data: profileData,
		isLoading: profileLoading,
	} = useQuery<ProfileData | null>({
		queryKey: ["profile"],
		queryFn: async (): Promise<ProfileData | null> => {
			const res = await fetch("/api/profile", {
				method: "GET",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
			});
			if (!res.ok) return null;
			return res.json();
		},
		refetchOnWindowFocus: true,
	});

	// ── Stats ──────────────────────────────────────────────────────
	const {
		data: statsData,
		isLoading: statsLoading,
	} = useQuery<Stats | null>({
		queryKey: ["stats"],
		queryFn: async (): Promise<Stats | null> => {
			const [res1, res2] = await Promise.all([
				fetch("/api/top/artists", { method: "GET", headers: { "Content-Type": "application/json" }, credentials: "include" }),
				fetch("/api/top/tracks", { method: "GET", headers: { "Content-Type": "application/json" }, credentials: "include" }),
			]);
			if (!res1.ok || !res2.ok) return null;
			const [artists, tracks] = await Promise.all([res1.json(), res2.json()]);
			const result: Stats = {
				topArtists: artists.items.map((a: TopArtists) => ({
					id: a.id,
					name: a.name,
					images: a.images,
					uri: a.uri,
					genres: a.genres,
					external_urls: { spotify: a.external_urls.spotify },
				})),
				topTracks: tracks.items.map((t: TopTracks) => ({
					id: t.id,
					name: t.name,
					uri: t.uri,
					external_urls: { spotify: t.external_urls.spotify },
					artists: t.artists.map((a: any) => ({
						name: a.name,
						id: a.id,
						uri: a.uri,
						external_urls: { spotify: a.external_urls.spotify },
					})),
					album: {
						name: t.album.name,
						uri: t.album.uri,
						images: t.album.images,
						artists: t.album.artists.map((a: any) => ({ name: a.name, uri: a.uri })),
					},
				})),
			};
			setCache("stats", result);
			return result;
		},
		staleTime: CACHE_TTL.stats,
	});

	// ── Playlists ──────────────────────────────────────────────────
	const PLAYLIST_PAGE_SIZE = 10; // 5 cols × 2 rows
	const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
	const [playlistPage, setPlaylistPage] = useState(0);

	const mapPlaylist = (p: any): Playlist => ({
		id: p.id,
		name: p.name,
		description: p.description,
		images: p.images,
		tracks: { total: p.tracks.total },
		external_urls: p.external_urls,
		owner: { display_name: p.owner.display_name },
	});

	const {
		data: playlistPages,
		isLoading: playlistsLoading,
		fetchNextPage: fetchNextPlaylists,
		hasNextPage: hasMorePlaylists,
		isFetchingNextPage: fetchingMorePlaylists,
	} = useInfiniteQuery<{ items: Playlist[]; total: number; nextOffset: number | null }>(
		["playlists"],
		async ({ pageParam = 0 }) => {
			const res = await fetch(`/api/playlists?offset=${pageParam}`, { credentials: "include" });
			if (!res.ok) return { items: [], total: 0, nextOffset: null };
			const data = await res.json();
			const items = (data.items as any[]).map(mapPlaylist);
			const existing = getCache<Playlist[]>("playlists")?.data ?? [];
			setCache("playlists", pageParam === 0 ? items : [...existing, ...items]);
			return { items, total: data.total, nextOffset: data.nextOffset };
		},
		{
			getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
			staleTime: CACHE_TTL.playlists,
		}
	);

	const playlists = playlistPages?.pages.flatMap((p) => p.items) ?? [];
	const totalPlaylists = playlistPages?.pages[0]?.total ?? playlists.length;
	const totalPlaylistPages = Math.ceil(totalPlaylists / PLAYLIST_PAGE_SIZE);
	const visiblePlaylists = playlists.slice(
		playlistPage * PLAYLIST_PAGE_SIZE,
		(playlistPage + 1) * PLAYLIST_PAGE_SIZE
	);

	const goToPlaylistPage = (page: number) => {
		// if the requested page needs API items we haven't fetched yet, load them first
		const needed = (page + 1) * PLAYLIST_PAGE_SIZE;
		if (needed > playlists.length && hasMorePlaylists) {
			fetchNextPlaylists();
		}
		setPlaylistPage(page);
	};

	// ── Helpers ────────────────────────────────────────────────────
	const countryName = (code: string) =>
		new Intl.DisplayNames(["en"], { type: "region" }).of(code);

	const logout = async () => {
		const res = await fetch("/api/auth", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
		});
		const data = await res.json();
		router.push("/");
		toast({ title: data.message });
	};

	const cleanup = () => {
		fetch(`${server}/cleanup`, {
			method: "GET",
			headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "*/*", Origin: "*" },
		}).catch(console.error);
	};

	const handleClick = async (name: string, artist: string) => {
		const res = await fetch(
			`${server}/song?` + new URLSearchParams({ name, artist }),
			{ method: "GET", headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "*/*", Origin: "*" } }
		);
		if (!res.ok) { console.log(res); return; }

		const fileName = res.headers.get("content-disposition");
		const trimmedName = fileName?.split("filename=")[1];
		const finalFileName = trimmedName?.substring(1, trimmedName.length - 5);
		const blob = await res.blob();
		const url = window.URL.createObjectURL(new Blob([blob]));
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `${finalFileName}.mp3`);
		document.body.appendChild(link);
		link.click();
		link.parentNode!.removeChild(link);
		toast({ title: "Song Downloaded!", description: "Confirm the download in your browser to save the song." });
		cleanup();
	};

	// ── Render ─────────────────────────────────────────────────────
	return (
		<main className="px-10 py-5">
			{/* Top row: Now Playing + Account */}
			<div className="flex flex-col lg:flex-row gap-5 justify-center">
				{/* Now Playing */}
				<Card className="w-full max-w-[600px] mx-auto lg:mx-0">
					<CardHeader>
						<CardTitle>Currently Playing Track</CardTitle>
						<CardDescription>
							<span className="text-[#00db4d]">Playing Spotify Track</span>
						</CardDescription>
						<CardContent className="p-0 py-5">
							<div className="flex flex-row w-full grow">
								{isLoading ? (
									<>
										<Skeleton className="w-28 h-28 rounded-lg shrink-0" />
										<div className="w-full ml-5">
											<Skeleton className="w-48 h-4 rounded-lg" />
											<Skeleton className="w-48 h-8 rounded-lg mt-4" />
											<Skeleton className="w-48 h-4 rounded-lg mt-4" />
										</div>
										<Skeleton className="w-10 h-10 rounded-full shrink-0 ml-4 self-center" />
									</>
								) : !playingData?.is_playing ? (
									<div className="text-2xl font-semibold">
										Play something on Spotify to get started!
									</div>
								) : (
									<>
										<Avatar className="w-28 h-28 rounded-lg shrink-0">
											<AvatarImage src={playingData?.item.album.images[0].url} alt="Track Album Art" />
											<AvatarFallback><Disc3 /></AvatarFallback>
										</Avatar>
										<div className="w-full ml-5">
											<h1 className="font-semibold text-md text-muted-foreground">
												{playingData?.item.artists.map((artist, index) => (
													<a key={index} href={artist.external_urls.spotify} target="_blank" rel="noopener noreferrer">
														{artist.name}{playingData?.item.artists.length - 1 !== index ? ", " : ""}
													</a>
												))}
											</h1>
											<h1 className="font-semibold text-2xl">
												<a href={playingData?.item.external_urls.spotify} target="_blank" rel="noopener noreferrer">
													{playingData?.item.name}
												</a>
												{playingData?.item.explicit ? (
													<Image className="mt-2" src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Parental_Advisory_label.svg/1200px-Parental_Advisory_label.svg.png" width={40} height={20} alt="Explicit" />
												) : ""}
											</h1>
											<h1 className="font-semibold text-md text-muted-foreground mt-2">
												{playingData?.item.album.name}
											</h1>
										</div>
										<Button
											size="icon"
											className="rounded-full bg-[#00db4d] shrink-0 ml-4 self-center"
											onClick={() => handleClick(
												playingData?.item.name,
												playingData?.item.artists.map((a) => a.name).join(", ")
											)}
										>
											<Download size={18} />
										</Button>
									</>
								)}
							</div>
						</CardContent>
					</CardHeader>
				</Card>

				{/* Account Details */}
				<Card className="w-full max-w-[350px] mx-auto lg:mx-0 overflow-hidden">
					{profileLoading && !profileData ? (
						<div className="relative h-64">
							<Skeleton className="absolute inset-0" />
							<div className="absolute bottom-0 left-0 right-0 p-5">
								<Skeleton className="h-4 w-32 mb-2" />
								<Skeleton className="h-6 w-48 mb-1" />
								<Skeleton className="h-3 w-40 mb-1" />
								<Skeleton className="h-3 w-28 mt-2" />
								<div className="flex gap-2 mt-4">
									<Skeleton className="w-10 h-10 rounded-full" />
									<Skeleton className="w-10 h-10 rounded-full" />
								</div>
							</div>
						</div>
					) : (
						<div
							className="relative h-64 bg-cover bg-center"
							style={{ backgroundImage: `url(${profileData?.images[0]?.url || profileData?.images[1]?.url})` }}
						>
							<div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/90" />
							<div className="absolute bottom-0 left-0 right-0 p-5 text-white flex items-end justify-between">
								<div>
									<p className="text-xs text-white/60 font-mono">{profileData?.id}</p>
									<h2 className="text-xl font-bold leading-tight">{profileData?.display_name}</h2>
									<p className="text-xs text-white/60 mt-0.5">{profileData?.email}</p>
									<div className="flex items-center gap-1 mt-1 text-xs text-white/60">
										<User size={12} className="text-[#00db4d]" />
										<span className="text-white/80">{profileData?.followers.total}</span>
										<span>followers &middot; {countryName(profileData?.country || "")}</span>
									</div>
								</div>
								<div className="flex gap-2">
									<Link href={profileData?.spotify_profile!} target="_blank" rel="noopener noreferrer">
										<Button size="icon" className="rounded-full bg-[#00db4d] text-black hover:bg-[#00db4d]/80">
											<ExternalLink size={16} />
										</Button>
									</Link>
									<Button size="icon" variant="secondary" className="rounded-full" onClick={logout}>
										<LogOut size={16} />
									</Button>
								</div>
							</div>
						</div>
					)}
				</Card>
			</div>

			{/* Bottom row: Listening History */}
			<div className="flex justify-center mt-5">
				<Card className="w-full max-w-[970px]">
					<CardHeader>
						<CardTitle>Listening History</CardTitle>
					</CardHeader>
					<CardContent className="p-0 pb-6">
						{statsLoading && !statsData ? (
							<div className="px-6">
								<h2 className="font-semibold text-lg mb-3">Top Artists</h2>
								<div className="flex gap-3 overflow-x-auto pb-2">
									{[...Array(6)].map((_, i) => (
										<div key={i} className="shrink-0 w-32">
											<Skeleton className="w-32 h-32 rounded-xl" />
											<Skeleton className="h-3 w-20 mt-2 mx-auto" />
										</div>
									))}
								</div>
								<h2 className="font-semibold text-lg mt-6 mb-3">Top Tracks</h2>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									{[...Array(6)].map((_, i) => (
										<div key={i} className="flex items-center gap-3 p-2">
											<Skeleton className="w-10 h-10 rounded shrink-0" />
											<div className="flex-1">
												<Skeleton className="h-3 w-36" />
												<Skeleton className="h-3 w-24 mt-1.5" />
											</div>
											<Skeleton className="h-3 w-6 shrink-0" />
										</div>
									))}
								</div>
							</div>
						) : (
							<div className="px-6">
								{/* Top Artists — horizontal scroll strip */}
								<h2 className="font-semibold text-lg mb-3">Top Artists</h2>
								<div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
									{statsData?.topArtists?.map((artist) => (
										<Link
											key={artist.id}
											href={artist.external_urls.spotify}
											target="_blank"
											rel="noopener noreferrer"
											className="shrink-0 w-32 group"
										>
											<div
												className="w-32 h-32 rounded-xl bg-cover bg-center transition-transform group-hover:scale-105"
												style={{ backgroundImage: `url(${artist.images[0].url})` }}
											/>
											<p className="text-xs font-semibold mt-2 text-center truncate">{artist.name}</p>
											<p className="text-xs text-muted-foreground text-center truncate">{artist.genres[0] ?? ""}</p>
										</Link>
									))}
								</div>

								{/* Top Tracks — numbered two-column grid */}
								<h2 className="font-semibold text-lg mt-6 mb-3">Top Tracks</h2>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
									{statsData?.topTracks?.map((track, idx) => (
										<Link
											key={track.id}
											href={track.external_urls.spotify}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
										>
											<span className="text-xs text-muted-foreground w-5 text-right shrink-0">{idx + 1}</span>
											<img src={track.album.images[0].url} alt={track.name} className="w-10 h-10 rounded shrink-0" />
											<div className="flex-1 min-w-0">
												<p className="text-sm font-semibold truncate group-hover:text-[#00db4d] transition-colors">{track.name}</p>
												<p className="text-xs text-muted-foreground truncate">
													{track.artists.map((a, i) => (
														<span key={i}>{a.name}{i !== track.artists.length - 1 && ", "}</span>
													))}
												</p>
											</div>
										</Link>
									))}
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Playlists */}
			<div className="flex justify-center mt-5">
				<Card className="w-full max-w-[970px]">
					<CardHeader>
						<CardTitle>Your Playlists</CardTitle>
					</CardHeader>
					<CardContent className="p-0 pb-6">
						<div className="px-6">
							{playlistsLoading ? (
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
									{[...Array(10)].map((_, i) => (
										<div key={i}>
											<Skeleton className="w-full aspect-square rounded-lg" />
											<Skeleton className="h-3 w-3/4 mt-2" />
											<Skeleton className="h-3 w-1/2 mt-1" />
										</div>
									))}
								</div>
							) : (
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
									{visiblePlaylists.map((playlist) => (
										<button
											key={playlist.id}
											className="text-left group"
											onClick={() => setSelectedPlaylist(playlist)}
										>
											{playlist.images[0]?.url ? (
												<img
													src={playlist.images[0].url}
													alt={playlist.name}
													className="w-full aspect-square rounded-lg object-cover transition-transform group-hover:scale-105"
												/>
											) : (
												<div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center transition-transform group-hover:scale-105">
													<Music2 size={32} className="text-muted-foreground" />
												</div>
											)}
											<p className="text-sm font-semibold mt-2 truncate">{playlist.name}</p>
											<p className="text-xs text-muted-foreground truncate">{playlist.tracks.total} songs</p>
										</button>
									))}
								</div>
							)}
							{/* Pagination controls */}
							{totalPlaylistPages > 1 && (
								<div className="flex items-center justify-center gap-1 mt-5">
									<button
										className="px-3 py-1.5 rounded-md text-sm disabled:opacity-40 hover:bg-muted transition-colors"
										onClick={() => goToPlaylistPage(playlistPage - 1)}
										disabled={playlistPage === 0}
									>
										&#8249;
									</button>
									{Array.from({ length: totalPlaylistPages }, (_, i) => {
										if (
											totalPlaylistPages <= 7 ||
											i === 0 ||
											i === totalPlaylistPages - 1 ||
											Math.abs(i - playlistPage) <= 1
										) {
											return (
												<button
													key={i}
													onClick={() => goToPlaylistPage(i)}
													className={`px-3 py-1.5 rounded-md text-sm transition-colors ${playlistPage === i ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
												>
													{i + 1}
												</button>
											);
										}
										if (
											(i === 1 && playlistPage > 3) ||
											(i === totalPlaylistPages - 2 && playlistPage < totalPlaylistPages - 4)
										) {
											return <span key={i} className="px-2 py-1.5 text-sm text-muted-foreground">…</span>;
										}
										return null;
									})}
									<button
										className="px-3 py-1.5 rounded-md text-sm disabled:opacity-40 hover:bg-muted transition-colors"
										onClick={() => goToPlaylistPage(playlistPage + 1)}
										disabled={playlistPage === totalPlaylistPages - 1}
									>
										&#8250;
									</button>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			<PlaylistModal
				playlist={selectedPlaylist}
				open={!!selectedPlaylist}
				onClose={() => setSelectedPlaylist(null)}
				onDownloadTrack={handleClick}
				server={server}
			/>
		</main>
	);
}

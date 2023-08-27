"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@radix-ui/react-avatar";
import { AvatarImage } from "@/components/ui/avatar";
import { ProfileData } from "@/types/spotify-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ExternalLink, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { TopArtists, TopTracks } from "@/types/stats";

interface Stats {
	topArtists: TopArtists[] | null;
	topTracks: TopTracks[] | null;
}

const Account = () => {
	const router = useRouter();
	const { toast } = useToast();
	const countryName = (countryCode: string): string | undefined => {
		let regionNames = new Intl.DisplayNames(["en"], { type: "region" });
		return regionNames.of(countryCode);
	};

	const logout = async () => {
		const res = await fetch("/api/auth", {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
		});
		if (!res.ok) {
			console.log("error", res.statusText);
			toast({
				title: "Something went wrong",
				description: res.statusText,
				variant: "destructive",
			});
		}
		const data = await res.json();
		router.push("/");
		toast({
			title: data.message,
		});
	};

	const {
		data: profileData,
		isLoading,
		error,
	} = useQuery<ProfileData | null>({
		queryKey: ["profile"],
		queryFn: async (): Promise<ProfileData | null> => {
			const res = await fetch("/api/profile", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
			});
			if (!res.ok) {
				console.log("error", res.statusText);
				return null;
			}
			const data = await res.json();
			return data;
		},
		refetchOnWindowFocus: true,
	});

	const {
		data: statsData,
		isLoading: statsLoading,
		error: statsError,
	} = useQuery<Stats | null>({
		queryKey: ["stats"],
		queryFn: async (): Promise<Stats | null> => {
			const topArtists: TopArtists[] = [];
			const topTracks: TopTracks[] = [];
			const res1 = await fetch("/api/top/artists", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
			});
			if (!res1.ok) {
				const data = await res1.json();
				console.log("error", data);
				toast({
					title: "Something went wrong",
					description: data.message,
					variant: "destructive",
				});
				return null;
			}
			const artists = await res1.json();

			const res2 = await fetch("/api/top/tracks", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
			});
			if (!res2.ok) {
				const data = await res2.json();
				console.log("error", data);
				return null;
			}
			const tracks = await res2.json();
			artists.items.map((artist: TopArtists) => {
				topArtists.push({
					id: artist.id,
					name: artist.name,
					images: artist.images.map((image: any) => image.url),
					uri: artist.uri,
					genres: artist.genres,
					external_urls: {
						spotify: artist.external_urls.spotify,
					},
				});
			});
			tracks.items.map((track: TopTracks) => {
				topTracks.push({
					id: track.id,
					name: track.name,
					uri: track.uri,
					external_urls: {
						spotify: track.external_urls.spotify,
					},
					artists: track.artists.map((artist: any) => {
						return {
							name: artist.name,
							id: artist.id,
							uri: artist.uri,
							external_urls: {
								spotify: artist.external_urls.spotify,
							},
						};
					}),
					album: {
						name: track.album.name,
						uri: track.album.uri,
						images: track.album.images.map((image: any) => image.url),
						artists: track.album.artists.map((artist: any) => {
							return {
								name: artist.name,
								uri: artist.uri,
							};
						}),
					},
				});
			});
			console.log(topArtists, topTracks);
			return {
				topArtists,
				topTracks,
			};
		},
	});

	return (
		<div className="md:flex">
			<Card className="w-auto mx-10 md:w-[350px] md:mx-auto">
				<CardHeader>
					<CardTitle>Account Details</CardTitle>
					<CardDescription>
						Spotify Account <span className="text-[#00db4d]">Connected</span>
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					<div className="m-2 pb-10 rounded-lg flex flex-col items-center">
						{isLoading && !profileData ? (
							<>
								<Skeleton className="w-32 h-32 rounded-full" />
								<Skeleton className="h-4 w-full mt-3" />
								<Skeleton className="h-9 w-full mt-3" />
								<Skeleton className="h-4 w-full mt-3" />
								<Skeleton className="h-4 w-full mt-3" />
								<Skeleton className="h-12 w-7/12 mt-3" />
								<Skeleton className="h-10 w-11/12 mt-5" />
								<Skeleton className="h-10 w-11/12 mt-2" />
							</>
						) : (
							<>
								<Avatar>
									<AvatarImage
										src={
											profileData?.images[1].url ||
											"https://innostudio.de/fileuploader/images/default-avatar.png"
										}
										alt={profileData?.display_name || "no profile image"}
										className="w-32 h-32 rounded-full"
									/>
									<AvatarFallback>
										<User className="w-32 h-32 rounded-full" />
									</AvatarFallback>
								</Avatar>
								<h2 className="mt-2 text-xl text-muted-foreground">
									{profileData?.id}
								</h2>
								<h2 className="text-2xl font-semibold mt-2">
									{profileData?.display_name}
								</h2>
								<p className="text-sm text-muted-foreground mt-1">
									{profileData?.email}
								</p>
								<p className="text-sm text-muted-foreground mt-1">
									Country: {countryName(profileData?.country || "")}
								</p>
								<div className="flex items-center border-2 rounded-lg p-3 mt-5">
									<User size={20} className="mr-2 text-[#00db4d]" />
									{profileData?.followers.total}
									<span className="ml-2">Followers</span>
								</div>
								<div className="mt-5 items-center justify-center">
									<Link
										href={profileData?.spotify_profile!}
										target="_blank"
										rel="noopener noreferrer"
									>
										<Button className="w-full bg-[#00db4d] rounded-full text-semibold text-white items-center dark:text-black">
											<ExternalLink size={18} className="mr-2" />
											Spotify Profile
										</Button>
									</Link>
									<Button
										variant={"secondary"}
										className="w-full rounded-full mt-2 items-center"
										onClick={() => logout()}
									>
										<LogOut size={18} className="mr-2" />
										Logout
									</Button>
								</div>
							</>
						)}
					</div>
				</CardContent>
			</Card>
			<Card className="w-auto mx-10 my-5 md:w-[700px] md:mx-auto md:mt-0">
				<CardHeader>
					<CardTitle>Listening History</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					{statsLoading && !statsData ? (
						<div className="flex flex-col mx-6 md:flex-row md:gap-5">
							<div>
								<h2 className="font-semibold text-2xl">Top Artists</h2>
								<h4 className="font-semibold text-sm text-[#00db4d] mb-5">
									Recently Enjoyed Artists
								</h4>
								<div className="grid grid-cols-2 gap-5 xs:grid-cols-3 md:grid-cols-2">
									{[...Array(6)].map((_, i) => (
										<Skeleton key={i} className="w-28 h-28 rounded-md" />
									))}
								</div>
							</div>
							<div className="my-10 md:my-0 md:ml-10">
								<h2 className="font-semibold text-2xl">Top Tracks</h2>
								<h4 className="font-semibold text-sm text-[#00db4d] mb-5">
									Keep that song repeating over
								</h4>
								{[...Array(6)].map((_, i) => (
									<div key={i} className="flex items-center mt-3">
										<Skeleton className="w-14 h-14 rounded-md" />
										<div className="ml-3">
											<Skeleton className="w-40 h-4" />
											<Skeleton className="w-20 h-4 mt-2" />
										</div>
									</div>
								))}
							</div>
						</div>
					) : (
						<div className="flex flex-col mx-6 md:flex-row md:gap-5">
							<div>
								<h2 className="font-semibold text-2xl">Top Artists</h2>
								<h4 className="font-semibold text-sm text-[#00db4d] mb-5">
									Recently Enjoyed Artists
								</h4>
								<div className="grid grid-cols-2 gap-5 xs:grid-cols-3 md:grid-cols-2">
									{statsData?.topArtists!.map((artist: TopArtists) => (
										<div
											key={artist.id}
											style={{ backgroundImage: `url(${artist.images[1]})` }}
											className="flex rounded-md justify-center items-end w-28 h-28 bg-cover cursor-pointer overflow-y-hidden"
											id="card"
										>
											<div id="card-text">
												<Link
													href={artist.external_urls.spotify}
													target="_blank"
													rel="noopener noreferrer"
												>
													<h2 className="font-semibold text-sm pl-2 text-white">
														{artist.name}
													</h2>
												</Link>
												<p className="text-xs pl-2 pb-2 text-[#f7f7f6]">
													{artist.genres.join(", ")}
												</p>
											</div>
										</div>
									))}
								</div>
							</div>
							<div className="my-10 md:pb-5 md:my-0 md:ml-10 md:w-[350px]">
								<h2 className="font-semibold text-2xl">Top Tracks</h2>
								<h4 className="font-semibold text-sm text-[#00db4d] mb-5">
									Keep that song repeating over
								</h4>
								{statsData?.topTracks!.map((track: TopTracks) => (
									<div key={track.id} className="flex items-center mt-3">
										<img
											src={track.album.images[0]}
											alt={track.name}
											className="w-14 h-w-14 rounded"
										/>
										<div className="ml-3">
											<Link
												href={track.external_urls.spotify}
												target="_blank"
												rel="noopener noreferrer"
											>
												<h2 className="font-semibold text-lg">{track.name}</h2>
											</Link>
											<p className="text-sm text-muted-foreground">
												{track.artists.map((artist, idx) => (
													<span key={idx}>
														{artist.name}
														{idx !== track.artists.length - 1 && ", "}
													</span>
												))}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
};

export default Account;

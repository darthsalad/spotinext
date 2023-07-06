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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { SpotifyPlaying } from "@/types/spotify-playing";
import { useQuery } from "@tanstack/react-query";
import { Disc3, Download } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
	const router = useRouter();
	const { toast } = useToast();
	const server = process.env.NEXT_PUBLIC_SERVER_URL!;

	const {
		data: playingData,
		isLoading,
		error,
	} = useQuery<SpotifyPlaying | undefined>({
		queryKey: ["playing"],
		queryFn: async (): Promise<SpotifyPlaying | undefined> => {
			const res = await fetch("/api/playing", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
			});
			if (!res.ok) {
				const error = await res.json();
				console.log(error);
				return;
			}
			const data = await res.json();

			const artists = data.item.artists.map((artist: any) => {
				return {
					external_urls: {
						spotify: artist.external_urls.spotify,
					},
					name: artist.name,
					type: artist.type,
					uri: artist.uri,
				};
			});

			return {
				is_playing: data.is_playing,
				context: {
					type: data.context.type,
					external_urls: {
						spotify: data.context.external_urls.spotify,
					},
					uri: data.context.uri,
				},
				item: {
					album: {
						album_type: data.item.album.album_type,
						external_urls: {
							spotify: data.item.album.external_urls.spotify,
						},
						uri: data.item.album.uri,
						images: data.item.album.images,
						name: data.item.album.name,
						type: data.item.album.type,
					},
					artists: artists,
					duration_ms: data.item.duration_ms,
					external_urls: {
						spotify: data.item.external_urls.spotify,
					},
					explicit: data.item.explicit,
					name: data.item.name,
					type: data.item.type,
					uri: data.item.uri,
				},
				progress_ms: data.progress_ms,
			};
		},
		refetchInterval: 1000,
		refetchOnWindowFocus: true,
	});

	const cleanupFunc = () => {
		fetch(`${server}/cleanup`, {
			method: "GET",
			headers: {
				"Content-Type": "*/*",
				"Accept": "*/*",
				// "Access-Control-Allow-Origin": "*",
			},
			credentials: "include",
		})
			.then((response) => response.json())
			.then((data) => {
				console.log(data);
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	};

	const handleClick = async () => {
		fetch(
			`${server}/song?` +
				new URLSearchParams({
					name: String(playingData?.item.name),
					artist: String(
						playingData?.item.artists
							.map((artist) => {
								return artist.name;
							})
							.join(", ")
					),
				}),
			{
				method: "GET",
				headers: {
					"Content-Type": "*/*",
					"Accept": "*/*",
					// "Access-Control-Allow-Origin": "*",
				},
				credentials: "include",
			}
		)
			.then((response) => response.blob())
			.then((blob) => {
				const url = window.URL.createObjectURL(new Blob([blob]));
				const link = document.createElement("a");
				link.href = url;
				link.setAttribute(
					"download",
					`${playingData?.item.name} - ${playingData?.item.artists
						.map((artist) => {
							return artist.name;
						})
						.join(", ")}.mp3`
				);
				document.body.appendChild(link);
				link.click();
				link.parentNode!.removeChild(link);
			})
			.then(() => {
				cleanupFunc();
				toast({
					title: "Song Downloaded!",
					description: "Confirm the download in your browser to save the song.",
				});
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	};

	return (
		<main>
			<div className="w-full inline-flex justify-center grow mx-auto px-10 py-5">
				<Card className="max-w-[500px] sm:w-[600px]">
					<CardHeader>
						<CardTitle>Currently Playing Track</CardTitle>
						<CardDescription>
							<span className="text-green-600">Playing Spotify Track</span>
						</CardDescription>
						<CardContent className="p-0 py-5">
							<div className="flex flex-row w-full">
								{isLoading ? (
									<>
										<Skeleton className="w-28 h-28 rounded-lg" />
										<div className="w-full ml-5">
											<Skeleton className="w-28 h-4 rounded-lg" />
											<Skeleton className="w-28 h-8 rounded-lg mt-2" />
											<Skeleton className="w-28 h-4 rounded-lg mt-4" />
											<Skeleton className="w-10/12 h-2 rounded-lg mt-2" />
											<Skeleton className="w-10/12 h-10 rounded-lg mt-4" />
										</div>
									</>
								) : !playingData?.is_playing ? (
									<div className="text-2xl font-semibold">
										Play something on Spotify to get started!
									</div>
								) : (
									<>
										<Avatar className="w-28 h-28 rounded-lg">
											<AvatarImage
												src={playingData?.item.album.images[0].url}
												alt="Track Album Art"
											/>
											<AvatarFallback>
												<Disc3 />
											</AvatarFallback>
										</Avatar>
										<div className="w-full ml-5">
											<h1 className="font-semibold text-md text-muted-foreground">
												{playingData?.item.artists.map((artist, index) => {
													return (
														<a
															key={index}
															className=""
															href={artist.uri}
															target="_blank"
															rel="noopener noreferrer"
														>
															{artist.name}
															{playingData?.item.artists.length - 1 !== index
																? ", "
																: ""}
														</a>
													);
												})}
											</h1>
											<h1 className="font-semibold text-2xl">
												<a
													href={playingData?.item.external_urls.spotify}
													target="_blank"
													rel="noopener noreferrer"
												>
													{playingData?.item.name}
												</a>
												{playingData?.item.explicit ? (
													<Image
														className="mt-2"
														src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Parental_Advisory_label.svg/1200px-Parental_Advisory_label.svg.png"
														width={40}
														height={20}
														alt="Explicit"
													/>
												) : (
													""
												)}
											</h1>
											<h1 className="font-semibold text-md text-muted-foreground mt-2">
												{playingData?.item.album.name}
											</h1>
											<Progress
												className="w-full mt-2 h-2 bg-muted"
												value={
													(playingData?.progress_ms! /
														playingData?.item.duration_ms!) *
													100
												}
											/>
											<Button
												className="w-full mt-5 rounded-full bg-green-600 flex items-center"
												onClick={handleClick}
											>
												<Download size={18} className="mr-2" /> Download Audio
											</Button>
										</div>
									</>
								)}
							</div>
						</CardContent>
					</CardHeader>
				</Card>
			</div>
		</main>
	);
}

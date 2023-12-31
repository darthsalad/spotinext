"use client";

import FeatureChart from "@/components/song-chart";
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
import { SongFeatures, pitch } from "@/types/song-features";
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
				toast({
					variant: "destructive",
					title: "Something went wrong!",
					description: JSON.stringify(error),
				});
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
					id: data.item.id,
				},
				progress_ms: data.progress_ms,
			};
		},
		refetchInterval: 1000,
		refetchOnWindowFocus: true,
	});

	const {
		data: songData,
		isLoading: songLoading,
		error: songError,
	} = useQuery<SongFeatures | undefined>({
		queryKey: ["song"],
		queryFn: async (): Promise<SongFeatures | undefined> => {
			if (playingData) {
				const res = await fetch("/api/features", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include",
					body: JSON.stringify({
						id: playingData?.item.id,
					}),
				});
				if (!res.ok) {
					const data = await res.json();
					toast({
						variant: "destructive",
						title: "Something went wrong!",
						description: "Failed to fetch song details: " + JSON.stringify(data.error.message).substring(1, JSON.stringify(data.error.message).length - 1),
					});
					return;
				}
				const data = await res.json();
				return {
					acousticness: data.acousticness,
					danceability: data.danceability,
					energy: data.energy,
					instrumentalness: data.instrumentalness,
					key: data.key,
					liveness: data.liveness,
					loudness: data.loudness,
					modality: data.mode,
					speechiness: data.speechiness,
					tempo: data.tempo,
					time_signature: data.time_signature,
					valence: data.valence,
				};
			} else {
				return undefined;
			}
		},
		refetchInterval: 2000,
		refetchOnWindowFocus: true,
	});

	const cleanup = () => {
		fetch(`${server}/cleanup`, {
			// fetch(`http://localhost:8080/cleanup`, {
			method: "GET",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
				Accept: "*/*",
				Origin: "*",
			},
		})
			.then((res) => {
				if (!res.ok) {
					toast({
						variant: "destructive",
						title: "Something went wrong!",
						description: "Failed to cleanup.",
					});
					return;
				}
				return res.json();
			})
			.then((data) => {
				console.log(data);
			})
			.catch((err) => {
				console.log(err);
			});
	};

	const handleClick = async (name: string, artist: string) => {
		const res = await fetch(
			`${server}/song?` +
				// `http://localhost:8080/song?` +
				new URLSearchParams({
					name: name,
					artist: artist,
				}),
			{
				method: "GET",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
					Accept: "*/*",
					Origin: "*",
				},
			}
		);

		if (!res.ok) {
			console.log(res);
			return;
		}

		const fileName = res.headers.get("content-disposition");
		const trimmedName = fileName?.split("filename=")[1];
		const finalFileName = trimmedName?.substring(1, trimmedName.length - 5);

		const blob = await res.blob();
		const url = window.URL.createObjectURL(new Blob([blob!]));
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `${finalFileName}.mp3`);
		document.body.appendChild(link);
		link.click();
		link.parentNode!.removeChild(link);

		toast({
			title: "Song Downloaded!",
			description: "Confirm the download in your browser to save the song.",
		});

		cleanup();
	};

	const millisToMinutesAndSeconds = (ms: number):string => {
		const minutes:number = Math.floor(ms / 60000);
		const seconds:number = Number(((ms % 60000) / 1000).toFixed(0));
		return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
	}

	return (
		<main>
			<div className="w-full inline-flex justify-center grow mx-auto px-10 py-5">
				<Card className="max-w-[600px] sm:w-[600px]">
					<CardHeader>
						<CardTitle>Currently Playing Track</CardTitle>
						<CardDescription>
							<span className="text-[#00db4d]">Playing Spotify Track</span>
						</CardDescription>
						<CardContent className="p-0 py-5">
							<div className="flex flex-row w-full grow">
								{isLoading ? (
									<>
										<Skeleton className="w-40 h-28 rounded-lg" />
										<div className="w-full ml-5">
											<Skeleton className="w-48 h-4 rounded-lg" />
											<Skeleton className="w-48 h-8 rounded-lg mt-4" />
											<Skeleton className="w-48 h-4 rounded-lg mt-4" />
											<Skeleton className="w-12/12 h-2 rounded-lg mt-4" />
											<div className="flex justify-between">
												<Skeleton className="w-16 h-4 rounded mt-4" />
												<Skeleton className="w-16 h-4 rounded mt-4" />
											</div>
											<Skeleton className="w-12/12 h-10 rounded-lg mt-4" />
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
															href={artist.external_urls.spotify}
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
												aria-label="Song Progress"
												className="w-full mt-2 h-2 bg-muted"
												value={
													(playingData?.progress_ms! /
														playingData?.item.duration_ms!) *
													100
												}
											/>
											<div className="flex w-full justify-between text-sm mt-2">
												<span>
													{millisToMinutesAndSeconds(playingData?.progress_ms!)}
												</span>
												<span>
													{millisToMinutesAndSeconds(
														playingData?.item.duration_ms!
													)}
												</span>
											</div>
											<Button
												className="w-full mt-5 rounded-full bg-[#00db4d] flex items-center"
												onClick={() => {
													handleClick(
														playingData?.item.name,
														playingData?.item.artists
															.map((artist) => {
																return artist.name;
															})
															.join(", ")
													);
												}}
											>
												<Download size={18} className="mr-2" /> Download Audio
											</Button>
										</div>
									</>
								)}
							</div>
							<div>
								{!playingData?.is_playing ? null : songLoading ? (
									<div className="flex flex-col w-full py-5 sm:flex-row">
										<div className="mx-5 sm:pr-5 items-center">
											<FeatureChart />
										</div>
										<div className="grid grid-cols-2 gap-3 content-evenly sm:grid-cols-2">
											<div className="text-center mt-5 flex flex-col justify-center items-center">
												Pitch <br />
												<Skeleton className="w-12 h-4 rounded-lg mt-2" />
											</div>
											<div className="text-center mt-5 flex flex-col justify-center items-center">
												Tempo <br />
												<Skeleton className="w-12 h-4 rounded-lg mt-2" />
											</div>
											<div className="text-center mt-5 flex flex-col justify-center items-center">
												Modality <br />
												<Skeleton className="w-12 h-4 rounded-lg mt-2" />
											</div>
											<div className="text-center mt-5 flex flex-col justify-center items-center">
												Time Signature <br />
												<Skeleton className="w-12 h-4 rounded-lg mt-2" />
											</div>
										</div>
									</div>
								) : songData !== undefined ? (
									<div className="flex flex-col w-full py-5 sm:flex-row">
										<div className="mx-5 sm:pr-5">
											<FeatureChart features={songData} />
										</div>
										<div className="grid grid-cols-2 gap-3 content-evenly sm:grid-cols-2">
											<div className="text-center mt-5">
												Pitch <br />
												<span className="text-muted-foreground">
													{" "}
													{pitch.get(songData?.key)}
												</span>
											</div>
											<div className="text-center mt-5">
												Tempo <br />
												<span className="text-muted-foreground">
													{" "}
													{songData?.tempo}
												</span>
											</div>
											<div className="text-center mt-5">
												Modality <br />
												<span className="text-muted-foreground">
													{" "}
													{songData?.modality === 1 ? "Major" : "Minor"}
												</span>
											</div>
											<div className="text-center mt-5">
												Time Signature <br />
												<span className="text-muted-foreground">
													{" "}
													{songData?.time_signature}/4
												</span>
											</div>
										</div>
									</div>
								) : null}
							</div>
						</CardContent>
					</CardHeader>
				</Card>
			</div>
		</main>
	);
}

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
import { Avatar } from "@radix-ui/react-avatar";
import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileData } from "@/types/spotify-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

const Account = () => {
	const router = useRouter();

	const countryName = (countryCode: string) : string | undefined => {
		let regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
		return regionNames.of(countryCode);
	}

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
			console.log("data", data);
			return data;
		},
		refetchOnWindowFocus: true,
	});

	return (
		<div className="flex items-center">
			<Card className="w-[350px] mx-auto">
				<CardHeader>
					<CardTitle>Account Details</CardTitle>
					<CardDescription>
						Spotify Account <span className="text-green-600">Connected</span>
					</CardDescription>
					<CardContent className="p-0">
						<div className="m-2 p-5 border rounded-lg flex flex-col items-center">
							{isLoading && !profileData ? (
								<>
									<Skeleton className="w-32 h-32 rounded-full" />
									<Skeleton className="h-3 w-full mt-2" />
									<Skeleton className="h-5 w-full mt-2" />
									<Skeleton className="h-3 w-full mt-2" />
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
											{countryName(profileData?.country || "")}
										</p>
								</>
							)}
						</div>
					</CardContent>
				</CardHeader>
			</Card>
		</div>
	);
};

export default Account;

// country: data.country,
// display_name: data.display_name,
// email: data.email,
// spotify_profile: data.external_urls?.spotify,
// followers: data.followers,
// id: data.id,
// images: data.images,
// type: data.type,
// uri: data.uri,

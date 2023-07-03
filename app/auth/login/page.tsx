"use client";

import React from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { redirectToAuthCodeFlow } from "@/lib/spotify";

const Login = () => {
	const handleOAuthRedirect = async () => {
		const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!;
		await redirectToAuthCodeFlow(clientId);
	};

	return (
		<div>
			<Card className="w-9/12 max-w-sm mx-auto rounded-md shadow-md overflow-hidden">
				<CardHeader>
					<CardTitle>Account Login</CardTitle>
					<CardDescription>Connect Spotify Account to Nextify</CardDescription>
					<CardContent className="p-0">
						<div className="w-full mt-5">
							<Button
								className="w-full bg-green-600 flex items-center justify-center rounded-3xl"
								onClick={handleOAuthRedirect}
							>
								<Image
									src="/spotify.svg"
									alt="Spotify Logo"
									width={25}
									height={25}
									className="mr-2"
								/>
								<span className="flex items-center">Connect Spotify</span>
							</Button>
						</div>
					</CardContent>
				</CardHeader>
			</Card>
		</div>
	);
};

export default Login;

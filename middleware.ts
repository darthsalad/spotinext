// check expiry of access token from httpOnly cookie and request new one if expired from refresh token
import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "./lib/spotify";

export async function middleware(req: NextRequest) {
	if (req.nextUrl.pathname === "/") {
		const refreshToken = req.cookies.get("refresh_token");
		const expiry = req.cookies.get("expiry");
		const now = new Date();
		if (expiry && refreshToken) {
			const expiryDate = new Date(Number(expiry.value));
			if (expiryDate < now) {
				const apiRequest = await fetch("/api/refresh", {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include",
				});
				const newTokens = await apiRequest.json();
				console.log(newTokens);
				const response = NextResponse.next();
				response.cookies.set("access_token", newTokens.access_token, {
					httpOnly: true,
					path: "/",
					sameSite: "lax",
					expires: new Date(now.getTime() + newTokens.expires_in * 1000),
				});

				// response.cookies.set("refresh_token", newTokens.refresh_token, {
				// 	httpOnly: true,
				// 	path: "/",
				// 	sameSite: "lax",
				// 	expires: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
				// });

				response.cookies.set(
					"expiry",
					new Date(now.getTime() + newTokens.expires_in * 1000)
						.getTime()
						.toString(),
					{
						httpOnly: true,
						path: "/",
						sameSite: "lax",
						expires: new Date(now.getTime() + newTokens.expires_in * 1000),
					}
				);
				return response;
			}
		} else {
			return NextResponse.redirect(new URL("/auth/login", req.url));
		}
	}

	if (req.nextUrl.pathname === "/auth/login") {
		if (req.cookies.get("code") || req.cookies.get("access_token")) {
			return NextResponse.redirect(new URL("/account", req.url));
		}
	}

	if (req.nextUrl.pathname === "/account") {
		const code = req.nextUrl.searchParams.get("code");
		if (code) {
			if (req.cookies.get("access_token") && req.cookies.get("refresh_token")) {
				return NextResponse.next();
			} else {
				const now = new Date();
				const response = NextResponse.next();
				const tokens = await getAccessToken(
					process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
					code
				);
				response.cookies.set("code", code, {
					httpOnly: false,
					path: "/",
					sameSite: "lax",
					expires: new Date(now.getTime() + 5 * 60 * 1000),
				});
				response.cookies.set("access_token", tokens.access_token, {
					httpOnly: true,
					path: "/",
					sameSite: "lax",
					expires: new Date(now.getTime() + tokens.expires_in * 1000),
				});
				response.cookies.set("refresh_token", tokens.refresh_token, {
					httpOnly: true,
					path: "/",
					sameSite: "lax",
					expires: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
				});
				response.cookies.set(
					"expiry",
					new Date(now.getTime() + tokens.expires_in * 1000)
						.getTime()
						.toString(),
					{
						httpOnly: true,
						path: "/",
						sameSite: "lax",
						expires: new Date(now.getTime() + tokens.expires_in * 1000),
					}
				);
				return response;
			}
		} else {
			const newURL = new URL("/account", req.url);
			newURL.searchParams.set("code", req.cookies.get("code")?.value!);
			return NextResponse.redirect(newURL);
		}
	}
}

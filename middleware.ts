import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, refreshAccessToken } from "./lib/spotify";

export async function middleware(req: NextRequest) {
	if (!req.cookies.get("access_token") && req.cookies.get("refresh_token")) {
		const tokens = await refreshAccessToken(
			req.cookies.get("refresh_token")!.value
		);
		if (tokens) {
			const now = new Date();
			const codeCookie = req.cookies.get("code");
			const response = NextResponse.next();
			response.cookies.set("access_token", tokens.access_token, {
				httpOnly: true,
				sameSite: "strict",
				path: "/",
				expires: new Date(now.getTime() + tokens.expires_in * 1000),
			});
			response.cookies.set("refresh_token", tokens.refresh_token, {
				httpOnly: true,
				sameSite: "strict",
				path: "/",
				expires: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
			});
			response.cookies.set("code", codeCookie?.value!, {
				httpOnly: true,
				sameSite: "strict",
				path: "/",
				expires: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
			});
			return response;
		} else {
			const response = NextResponse.redirect(new URL("/auth/login", req.url));
			response.cookies.delete("access_token");
			response.cookies.delete("refresh_token");
			response.cookies.delete("code");
			return response;
		}
	}

	if (req.nextUrl.pathname === "/auth/login") {
		if (req.cookies.get("access_token") || req.cookies.get("refresh_token")) {
			const codeCookie = req.cookies.get("code");
			const url = new URL("/account", req.url);
			url.searchParams.set("code", codeCookie?.value!);
			return NextResponse.redirect(url);
		} else {
			return NextResponse.next();
		}
	}

	if (req.nextUrl.pathname === "/account") {
		const code = req.nextUrl.searchParams.get("code");
		const response = NextResponse.next();
		const now = new Date();
		if (code) {
			if (req.cookies.get("access_token")) {
				return response;
			} else {
				response.cookies.set("code", code, {
					httpOnly: true,
					sameSite: "strict",
					path: "/",
					expires: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
				});
				const tokens = await getAccessToken(
					process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
					code
				);
				if (tokens) {
					response.cookies.set("access_token", tokens.access_token, {
						httpOnly: true,
						sameSite: "strict",
						path: "/",
						expires: new Date(now.getTime() + tokens.expires_in * 1000),
					});
					response.cookies.set("refresh_token", tokens.refresh_token, {
						httpOnly: true,
						sameSite: "strict",
						path: "/",
						expires: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
					});
					return response;
				} else {
					return NextResponse.redirect(
						`${process.env.NEXT_PUBLIC_ORIGIN_URL}/auth/login`
					);
				}
			}
		} else {
			return NextResponse.redirect(
				`${process.env.NEXT_PUBLIC_ORIGIN_URL}/auth/login`
			);
		}
	}

	if (req.nextUrl.pathname === "/") {
		if (req.cookies.get("access_token")) {
			return NextResponse.next();
		} else {
			return NextResponse.redirect(
				`${process.env.NEXT_PUBLIC_ORIGIN_URL}/auth/login`
			);
		}
	}
}

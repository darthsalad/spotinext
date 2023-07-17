import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Toaster } from "@/components/ui/toaster";
import QueryWrapper from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata = {
	title: "Spotinext - A Spotify Song Downloader Platform",
	description: "Download current playing song from Spotify with Spotinext.",
	openGraph: {
		title: "Spotinext - A Spotify Song Downloader Platform",
		description: "Download current playing song from Spotify with Spotinext.",
		url: "https://spotinext.vercel.app/",
		siteName: "Spotinext",
		images: [
			{
				url: "/og-banner.png",
				width: 1200,
				height: 630,
				alt: "Spotinext - A Spotify Song Downloader Platform",
			},
		],
	},
	twitter: {
		title: "Spotinext - A Spotify Song Downloader Platform",
		description: "Download current playing song from Spotify with Spotinext.",
		images: [
			{
				url: "/og-banner.png",
				width: 1200,
				height: 630,
				alt: "Spotinext - A Spotify Song Downloader Platform",
			},
		],
		cardType: "summary_large_image",
		domain: "https://spotinext.vercel.app/",
		url: "https://spotinext.vercel.app/",
	},
	appleTouchIcon: "/icon.png",
	manifest: "/manifest.json",
	themeColor: "#0c0a09",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {

	return (
		<html lang="en">
			<head>
				<meta
					name="viewport"
					content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover"
				/>
			</head>
			<body className="relative min-h-screen">
				<QueryWrapper>
					<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
						<Navbar />
						<div className="pb-[100px]">{children}</div>
						<Toaster />
						<Footer />
					</ThemeProvider>
				</QueryWrapper>
			</body>
		</html>
	);
}

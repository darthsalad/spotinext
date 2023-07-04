import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Toaster } from "@/components/ui/toaster";
import QueryWrapper from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata = {
	title: "Nextify - A Spotify Song Downloader Platform",
	description:
		"Download current playing song from Spotify with Nextify using Nextify.",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {

	return (
		<html lang="en">
			<body className="relative min-h-screen">
				<QueryWrapper>
					<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
						<Navbar />
						<div>
							{children}
						</div>
						<Toaster />
						<Footer />
					</ThemeProvider>
				</QueryWrapper>
			</body>
		</html>
	);
}

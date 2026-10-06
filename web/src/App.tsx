import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { ThemeSync } from "@/components/theme";
import { Toaster } from "@/components/ui/toaster";
import { useLoggedIn } from "@/hooks/use-auth";
import { HomePage } from "@/pages/home";
import { LoginPage } from "@/pages/login";

export function App() {
	const loggedIn = useLoggedIn();

	return (
		<div className="flex min-h-screen flex-col">
			<ThemeSync />
			<Navbar />
			<main className="flex-1">{loggedIn ? <HomePage /> : <LoginPage />}</main>
			<Footer />
			<Toaster />
		</div>
	);
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import { toast } from "@/components/ui/use-toast";
import { AuthError, completeLoginFromUrl } from "@/lib/auth";
import "@/index.css";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// an expired session logs the user out (see lib/spotify.ts); don't retry it
			retry: (count, error) => !(error instanceof AuthError) && count < 2,
		},
	},
});

// Exchange the ?code= from Spotify before the first render, outside React, so
// StrictMode's double effects can't spend the one-time code twice.
completeLoginFromUrl()
	.catch((e: Error) => {
		queueMicrotask(() => toast({ variant: "destructive", title: "Login failed", description: e.message }));
	})
	.finally(() => {
		createRoot(document.getElementById("root")!).render(
			<StrictMode>
				<QueryClientProvider client={queryClient}>
					<App />
				</QueryClientProvider>
			</StrictMode>
		);
	});

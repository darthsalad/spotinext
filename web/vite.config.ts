import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["icon.svg", "spotify.svg"],
			manifest: {
				name: "Spotinext",
				short_name: "Spotinext",
				description: "Download current playing song from Spotify with Spotinext.",
				start_url: "/",
				display: "standalone",
				orientation: "portrait",
				background_color: "#0c0a09",
				theme_color: "#0c0a09",
				icons: [
					{ src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
					{ src: "/icon-256x256.png", sizes: "256x256", type: "image/png" },
					{ src: "/icon-384x384.png", sizes: "384x384", type: "image/png" },
					{ src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
					{ src: "/maskable_icon.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
				],
			},
		}),
	],
	resolve: {
		alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
	},
	server: {
		// Spotify only accepts http redirect URIs on loopback IPs, not "localhost"
		host: "127.0.0.1",
		port: 5173,
		strictPort: true,
		// tunnels for testing the Spotify redirect over https
		allowedHosts: [".ngrok-free.dev", ".ngrok-free.app", ".ngrok.app"],
		// behind an https tunnel the HMR websocket has to go through port 443
		hmr: process.env.HMR_CLIENT_PORT ? { clientPort: Number(process.env.HMR_CLIENT_PORT) } : undefined,
		// same-origin path to the FastAPI server (set VITE_SERVER_URL=/api), so
		// a tunnelled page needs no CORS and no local-network permission prompt
		proxy: {
			"/api": {
				target: process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8080",
				rewrite: (path) => path.replace(/^\/api/, ""),
			},
		},
	},
	preview: {
		host: "127.0.0.1",
		port: 5173,
		strictPort: true,
	},
});

/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
	dest: "public",
})

const nextConfig = {
	experimental: {
		appDir: true,
		serverActions: true,
	},
	images: {
		domains: ["localhost", "upload.wikimedia.org"],
	},
};

module.exports = withPWA(nextConfig)

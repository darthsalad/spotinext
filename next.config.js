/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		appDir: true,
		serverActions: true,
	},
	images: {
		domains: ["localhost", "upload.wikimedia.org"],
	},
};

module.exports = nextConfig

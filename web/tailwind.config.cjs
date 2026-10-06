/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
	darkMode: ["class"],
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	theme: {
		screens: {
			xs: "475px",
			...defaultTheme.screens,
		},
		container: {
			center: true,
			padding: "1rem",
			screens: {
				"2xl": "1200px",
			},
		},
		extend: {
			fontFamily: {
				display: ['"Bricolage Grotesque"', ...defaultTheme.fontFamily.sans],
				sans: ['"DM Sans"', ...defaultTheme.fontFamily.sans],
				mono: ['"JetBrains Mono"', ...defaultTheme.fontFamily.mono],
			},
			colors: {
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				ink: "hsl(var(--ink))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				// loud accents; always paired with ink-coloured text for contrast
				pop: {
					green: "#1ED760",
					pink: "#FF6AB0",
					yellow: "#FFD43B",
					violet: "#9B7BFF",
					cyan: "#4FD8EB",
					orange: "#FF8A3D",
				},
			},
			borderRadius: {
				xl: "calc(var(--radius) + 4px)",
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			borderWidth: {
				3: "3px",
			},
			boxShadow: {
				// hard offset shadows; colour comes from --shadow so dark mode can swap it
				"brutal-sm": "2px 2px 0 0 hsl(var(--shadow))",
				brutal: "4px 4px 0 0 hsl(var(--shadow))",
				"brutal-lg": "7px 7px 0 0 hsl(var(--shadow))",
				"brutal-album": "7px 7px 0 0 var(--album, hsl(var(--shadow)))",
			},
			keyframes: {
				"accordion-down": {
					from: { height: 0 },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: 0 },
				},
				eq: {
					"0%, 100%": { transform: "scaleY(0.3)" },
					"50%": { transform: "scaleY(1)" },
				},
				wobble: {
					"0%, 100%": { transform: "rotate(-3deg)" },
					"50%": { transform: "rotate(3deg)" },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
				"spin-slow": "spin 6s linear infinite",
				eq: "eq 0.9s ease-in-out infinite",
				wobble: "wobble 2.4s ease-in-out infinite",
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
};

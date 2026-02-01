import { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Inter } from "next/font/google";
import { Viewport } from "next";
import { getSEOTags } from "@/app/_lib/seo";
import ClientLayout from "@/app/_components/LayoutClient";
import { ThemeProvider } from "@/app/_components/theme-provider";
import config from "@/config";
import "./globals.css";

// Inter Variable font - Linear's primary typeface
// Using cv01 and ss03 font features for refined glyphs
const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

export const viewport: Viewport = {
	themeColor: config.colors.main,
	width: "device-width",
	initialScale: 1,
};

export const metadata = getSEOTags();

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html
			lang="en"
			className={`${GeistSans.variable} ${GeistMono.variable} ${inter.variable} dark`}
			style={{
				fontFamily: "var(--font-inter), var(--font-geist-sans), sans-serif",
				fontFeatureSettings: '"cv01", "ss03"',
			}}
		>
			<body>
				<ThemeProvider defaultTheme="dark" storageKey="salt-ui-theme">
					<ClientLayout>{children}</ClientLayout>
				</ThemeProvider>
			</body>
		</html>
	);
}

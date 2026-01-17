import { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Viewport } from "next";
import { getSEOTags } from "@/app/_lib/seo";
import ClientLayout from "@/app/_components/LayoutClient";
import { ThemeProvider } from "@/app/_components/theme-provider";
import config from "@/config";
import "./globals.css";

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
			className={`${GeistSans.variable} ${GeistMono.variable} dark`}
			style={{
				fontFamily: "var(--font-geist-sans), sans-serif",
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

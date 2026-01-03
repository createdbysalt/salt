import { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Viewport } from "next";
import { getSEOTags } from "@/libs/seo";
import ClientLayout from "@/components/LayoutClient";
import { ThemeProvider } from "@/components/theme-provider";
import config from "@/config";
import { createClient } from "@/libs/supabase/server";
import "./globals.css";

export const viewport: Viewport = {
	// Will use the primary color of your theme to show a nice theme color in the URL bar of supported browsers
	themeColor: config.colors.main,
	width: "device-width",
	initialScale: 1,
};

// This adds default SEO tags to all pages in our app.
// You can override them in each page passing params to getSOTags() function.
export const metadata = getSEOTags();

export default async function RootLayout({ children }: { children: ReactNode }) {
	const supabase = await createClient();
	
	// Fetch user theme preferences
	const { data: { user } } = await supabase.auth.getUser();
	let userThemeMode: "light" | "dark" = "light"; // Default to light
	
	if (user) {
		const { data: profile } = await supabase
			.from("profiles")
			.select("ui_theme")
			.eq("id", user.id)
			.single();
		
		if (profile?.ui_theme === "dark" || profile?.ui_theme === "light") {
			userThemeMode = profile.ui_theme;
		}
	}
	
	return (
		<html
			lang="en"
			className={`${GeistSans.variable} ${GeistMono.variable}`}
			style={{
				fontFamily: "var(--font-geist-sans), sans-serif",
			}}
			suppressHydrationWarning
		>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `
							(function() {
								try {
									var theme = localStorage.getItem('salt-ui-theme') || '${userThemeMode}';
									if (theme === 'dark') {
										document.documentElement.classList.add('dark');
									} else {
										document.documentElement.classList.remove('dark');
									}
								} catch (e) {}
							})();
						`,
					}}
				/>
			</head>
			<body>
				<ThemeProvider defaultTheme={userThemeMode} storageKey="salt-ui-theme">
					{/* ClientLayout contains all the client wrappers (Crisp chat support, toast messages, tooltips, etc.) */}
					<ClientLayout>{children}</ClientLayout>
				</ThemeProvider>
			</body>
		</html>
	);
}

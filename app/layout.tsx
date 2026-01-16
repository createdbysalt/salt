import { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Viewport } from "next";
import { getSEOTags } from "@/libs/seo";
import ClientLayout from "@/app/_components/LayoutClient";
import { ThemeProvider } from "@/app/_components/theme-provider";
import config from "@/config";
import { createClient } from "@/libs/supabase/server";
import { resolveTheme, getThemeAttributes } from "@/libs/theme/resolve-theme";
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

	// Fetch user theme preferences and bridge accent settings
	const { data: { user } } = await supabase.auth.getUser();
	let userThemeMode: string | null = null;
	let bridgeAccentPreset: string | null = null;

	if (user) {
		const { data: profile } = await supabase
			.from("profiles")
			.select("ui_theme")
			.eq("id", user.id)
			.single();

		userThemeMode = profile?.ui_theme || null;
	}

	// Resolve theme using Salt's theme system (defaults to dark + ocean)
	const resolvedTheme = resolveTheme({
		userThemeMode,
		bridgeAccentPreset,
		userReducedMotion: false,
	});

	const themeAttributes = getThemeAttributes(resolvedTheme);
	
	return (
		<html
			lang="en"
			className={`${GeistSans.variable} ${GeistMono.variable}`}
			style={{
				fontFamily: "var(--font-geist-sans), sans-serif",
			}}
			{...themeAttributes}
			suppressHydrationWarning
		>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `
							(function() {
								try {
									var theme = localStorage.getItem('salt-ui-theme') || '${resolvedTheme.dataTheme}';
									var root = document.documentElement;

									// Apply theme mode class
									root.classList.remove('light', 'dark');
									root.classList.add(theme);

									// Apply data attributes for theme system
									root.setAttribute('data-theme', theme);
									root.setAttribute('data-accent', '${resolvedTheme.dataAccent}');
								} catch (e) {}
							})();
						`,
					}}
				/>
			</head>
			<body>
				<ThemeProvider defaultTheme={resolvedTheme.dataTheme} storageKey="salt-ui-theme">
					{/* ClientLayout contains all the client wrappers (Crisp chat support, toast messages, tooltips, etc.) */}
					<ClientLayout>{children}</ClientLayout>
				</ThemeProvider>
			</body>
		</html>
	);
}

import { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Inter, Onest, JetBrains_Mono } from "next/font/google";
import { Viewport } from "next";
import { draftMode } from "next/headers";
import { getSEOTags } from "@/app/_lib/seo";
import { SanityVisualEditing } from "@/app/_components/SanityVisualEditing";
import ClientLayout from "@/app/_components/LayoutClient";
import { ThemeProvider } from "@/app/_components/theme-provider";
import config from "@/config";
import "./globals.css";

// Inter drives Salt's UI/body text; Geist is loaded separately for display type.
// Keep feature settings aligned with app/salt-design.css.
const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

// Onest — Söhne-adjacent humanist grotesque, used inside the Salt v2
// design-system sandbox only. Doesn't override globals.
const onest = Onest({
	subsets: ["latin"],
	variable: "--font-onest",
	display: "swap",
});

// JetBrains Mono — humanist mono, used inside the Salt v2 sandbox only.
const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-jetbrains-mono",
	display: "swap",
});

export const viewport: Viewport = {
	themeColor: config.colors.main,
	width: "device-width",
	initialScale: 1,
};

export const metadata = getSEOTags();

/**
 * Blocking script to set theme before React hydrates.
 * - Bridge routes (/table/*) always use light mode
 * - Other routes use stored preference or default to dark
 * This prevents theme flash on page load.
 */
const themeScript = `
(function() {
  var path = window.location.pathname;
  var isTable = path.startsWith('/table');
  var defaultTheme = 'light';
  var theme = defaultTheme;

  if (!isTable) {
    var functional = false;
    var consentEntry = document.cookie.split('; ').find(function(entry) {
      return entry.indexOf('salt_consent=') === 0;
    });
    if (consentEntry) {
      try {
        var parsed = JSON.parse(decodeURIComponent(consentEntry.slice('salt_consent='.length)));
        if (parsed && parsed.version === 1 && parsed.functional === true) {
          functional = true;
        }
      } catch (e) {}
    }
    if (functional) {
      var stored = localStorage.getItem('salt-ui-theme-v2');
      if (stored === 'light' || stored === 'dark') {
        theme = stored;
      }
    }
  }

  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
  document.documentElement.style.colorScheme = theme;
})();
`;

export default async function RootLayout({
	children,
	modal,
}: {
	children: ReactNode;
	modal: ReactNode;
}) {
	const { isEnabled: isDraftMode } = await draftMode();

	return (
		<html
			lang="en"
			className={`${GeistSans.variable} ${GeistMono.variable} ${inter.variable} ${onest.variable} ${jetbrainsMono.variable}`}
			style={{
				fontFamily: "var(--font-inter), var(--font-geist-sans), sans-serif",
				fontFeatureSettings: '"ss01", "cv11"',
			}}
			suppressHydrationWarning
		>
			<head>
				{/* Blocking theme script - runs before React to prevent flash */}
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
			</head>
			<body>
				<ThemeProvider
					defaultTheme="light"
					storageKey="salt-ui-theme-v2"
				>
					<ClientLayout>
						{children}
						{modal}
					</ClientLayout>
				</ThemeProvider>
				{isDraftMode && <SanityVisualEditing />}
			</body>
		</html>
	);
}

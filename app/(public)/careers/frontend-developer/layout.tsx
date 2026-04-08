import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frontend Developer | SALT Studio Careers",
  description:
    "Join SALT Studio as a Frontend Developer. Remote position in Brazil. Work with React, Tailwind, Next.js, and AI-powered tools to build beautiful websites for premium clients.",
  keywords: [
    "frontend developer",
    "react developer",
    "tailwind css",
    "next.js",
    "remote job brazil",
    "desenvolvedor frontend",
    "vaga remota",
  ],
  openGraph: {
    title: "Frontend Developer | SALT Studio",
    description:
      "Join SALT Studio as a Frontend Developer. Remote position in Brazil. Build beautiful websites for premium clients.",
    type: "website",
    locale: "en_US",
    alternateLocale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Frontend Developer | SALT Studio",
    description:
      "Join SALT Studio as a Frontend Developer. Remote position in Brazil.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function FrontendDeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

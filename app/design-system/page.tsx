import { notFound } from "next/navigation";
import { Metadata } from "next";
import StyleGuideShell from "./_components/styleguide-shell";

export const metadata: Metadata = {
  title: "Core UI - Salt Core Design System",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignSystemPage() {
  // Development-only access guard
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <StyleGuideShell />;
}


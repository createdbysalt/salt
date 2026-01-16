import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PlaygroundClient from "./playground-client";

export const metadata: Metadata = {
  title: "Playground - Salt Core",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PlaygroundPage() {
  // Keep this as a safe sandbox that doesn’t ship accidentally.
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  // Intentionally blank page for freeform experimentation (background only).
  return <PlaygroundClient />;
}



import type { Metadata } from "next";
import { notFound } from "next/navigation";

import SwirlClient from "./swirl-client";

export const metadata: Metadata = {
  title: "Playground Swirl - SALT",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PlaygroundSwirlPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <SwirlClient />;
}



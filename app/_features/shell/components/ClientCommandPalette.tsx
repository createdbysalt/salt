"use client";

import dynamic from "next/dynamic";

const UnifiedCommandPalette = dynamic(
  () =>
    import("./UnifiedCommandPalette").then((mod) => mod.UnifiedCommandPalette),
  { ssr: false }
);

export function ClientCommandPalette() {
  return <UnifiedCommandPalette />;
}

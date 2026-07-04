"use client";

import type { ReactNode } from "react";
import { useClientMounted } from "@/app/_lib/hooks/use-client-mounted";

type RadixAfterHydrationProps = {
  fallback: ReactNode;
  children: ReactNode;
};

export function RadixAfterHydration({ fallback, children }: RadixAfterHydrationProps) {
  const mounted = useClientMounted();
  if (!mounted) return fallback;
  return children;
}

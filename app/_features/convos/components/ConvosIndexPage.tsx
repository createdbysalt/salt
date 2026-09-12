"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConvosShell } from "./ConvosShell";
import { ConvosThreadList } from "./ConvosThreadList";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import type { ConvoThread } from "../data";

export function ConvosIndexPage({ threads }: { threads: ConvoThread[] }) {
  const router = useRouter();
  const mockContent = useMockContent();

  // On large screens, jump straight to the first thread (split view).
  // On mobile/tablet, show the full inbox list.
  useEffect(() => {
    if (mockContent) return;
    const mql = window.matchMedia("(min-width: 1024px)");
    const go = () => {
      if (mql.matches && threads.length > 0) {
        router.replace(`/conversations/${threads[0].threadId}`);
      }
    };
    go();
    mql.addEventListener("change", go);
    return () => mql.removeEventListener("change", go);
  }, [router, mockContent, threads]);

  return (
    <ConvosShell>
      <div className="flex h-full min-h-0 overflow-hidden bg-card">
        <ConvosThreadList threads={threads} />
      </div>
    </ConvosShell>
  );
}

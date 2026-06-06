"use client";

import type { ReactNode } from "react";
import { DotGridCanvas } from "./DotGridCanvas";

/** Client shell for hero background dots + nav + hero (keeps WebGL canvas hydrated). */
export function Landing2HeroShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-[50vh]">
      <DotGridCanvas />
      {children}
    </div>
  );
}

"use client";

import { useReducedMotion } from "framer-motion";
import { Landing2WorkspaceDemo } from "./demo/Landing2WorkspaceDemo";

const appDesktop = "/landing/hq-workspace.png";

function StaticWorkspaceImage() {
  return (
    <div className="rounded-2xl shadow-[var(--shadow-lift)]">
      <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-card">
        <img
          src={appDesktop}
          alt="Salt HQ workspace showing plays ready for approval, today's schedule, and morning briefing"
          width={1600}
          height={900}
          className="block h-auto w-full"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </div>
    </div>
  );
}

export function Landing2HeroWorkspacePreview() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <StaticWorkspaceImage />;
  }

  return (
    <div className="isolate overscroll-contain">
      <Landing2WorkspaceDemo />
    </div>
  );
}

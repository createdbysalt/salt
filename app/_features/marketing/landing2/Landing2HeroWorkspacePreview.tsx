"use client";

import { useReducedMotion } from "framer-motion";
import { Landing2DemoErrorBoundary } from "./Landing2DemoErrorBoundary";
import { Landing2PhoneShell } from "./Landing2PhoneShell";
import { Landing2MobileWorkspaceDemo } from "./demo/Landing2MobileWorkspaceDemo";
import { Landing2WorkspaceDemo } from "./demo/Landing2WorkspaceDemo";

const appDesktop = "/landing/hq-workspace.png";

function StaticMobileScreen() {
  return (
    <img
      src={appDesktop}
      alt="Salt HQ mobile workspace showing today's briefing and plays ready for approval"
      width={390}
      height={844}
      className="block h-full w-full object-cover object-[center_top]"
      loading="eager"
      fetchPriority="high"
      decoding="async"
    />
  );
}

function StaticDesktopWorkspace() {
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
    return (
      <>
        <div className="md:hidden">
          <Landing2PhoneShell>
            <StaticMobileScreen />
          </Landing2PhoneShell>
        </div>
        <div className="hidden md:block">
          <StaticDesktopWorkspace />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="md:hidden">
        <Landing2PhoneShell>
          <Landing2DemoErrorBoundary fallback={<StaticMobileScreen />}>
            <Landing2MobileWorkspaceDemo embedded />
          </Landing2DemoErrorBoundary>
        </Landing2PhoneShell>
      </div>
      <div className="hidden isolate overscroll-contain md:block">
        <Landing2DemoErrorBoundary fallback={<StaticDesktopWorkspace />}>
          <Landing2WorkspaceDemo />
        </Landing2DemoErrorBoundary>
      </div>
    </>
  );
}

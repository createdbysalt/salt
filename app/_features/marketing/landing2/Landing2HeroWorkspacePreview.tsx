"use client";

import { useReducedMotion } from "framer-motion";
import { Landing2DemoErrorBoundary } from "./Landing2DemoErrorBoundary";
import { Landing2PhoneShell } from "./Landing2PhoneShell";
import { Landing2MobileWorkspaceDemo } from "./demo/Landing2MobileWorkspaceDemo";
import { Landing2WorkspaceDemo } from "./demo/Landing2WorkspaceDemo";

function FrozenMobileScreen() {
  return <Landing2MobileWorkspaceDemo embedded frozen />;
}

function FrozenDesktopPreview() {
  return <Landing2WorkspaceDemo frozen />;
}

/** Static HQ demo — same markup as homepage reduced-motion / fallback path. */
export function Landing2FrozenWorkspacePreview() {
  return (
    <>
      <div className="pointer-events-none select-none md:hidden">
        <Landing2PhoneShell>
          <FrozenMobileScreen />
        </Landing2PhoneShell>
      </div>
      <div className="pointer-events-none hidden select-none md:block">
        <FrozenDesktopPreview />
      </div>
    </>
  );
}

export function Landing2HeroWorkspacePreview() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <Landing2FrozenWorkspacePreview />;
  }

  return (
    <>
      <div className="pointer-events-none select-none md:hidden">
        <Landing2PhoneShell>
          <Landing2DemoErrorBoundary fallback={<FrozenMobileScreen />}>
            <Landing2MobileWorkspaceDemo embedded />
          </Landing2DemoErrorBoundary>
        </Landing2PhoneShell>
      </div>
      <div className="pointer-events-none hidden select-none md:block">
        <Landing2DemoErrorBoundary fallback={<FrozenDesktopPreview />}>
          <Landing2WorkspaceDemo />
        </Landing2DemoErrorBoundary>
      </div>
    </>
  );
}

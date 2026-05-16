import type { Metadata } from "next";
import { DesignSystemSandbox } from "./design-system-client";

export const metadata: Metadata = {
  title: "Design System — SALT Sandbox",
  robots: { index: false, follow: false },
};

/**
 * SALT Design System Sandbox.
 *
 * Single-page tabbed showcase for design iteration. Lives at
 * /sandbox/design-system. Use this to prototype tokens, brand
 * colors, typography scales, motion, and brand-distinctive
 * components in isolation.
 *
 * Not indexed (see metadata above). For production hardening,
 * gate this behind an explicit feature flag instead of NODE_ENV
 * (the 1Password env wrapper makes NODE_ENV unreliable here).
 */
export default function DesignSystemSandboxPage() {
  return <DesignSystemSandbox />;
}

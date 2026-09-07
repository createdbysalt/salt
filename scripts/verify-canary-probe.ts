/**
 * Canary probe verification (2026-08-29).
 *
 * Proves the metadata probe used by app/_lib/composio/canary.ts distinguishes
 * a dead Composio slug from a live one BEFORE alerts are wired:
 *   - OUTLOOK_OUTLOOK_GET_MESSAGE — known dead (404 Tool_ToolNotFound)
 *   - OUTLOOK_GET_MESSAGE         — known live
 *
 * Usage:
 *   op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" \
 *     pnpm tsx scripts/verify-canary-probe.ts
 */

import { getComposioClient } from "@/app/_lib/composio/client";

const CASES = [
  { slug: "OUTLOOK_OUTLOOK_GET_MESSAGE", expectAlive: false },
  { slug: "OUTLOOK_GET_MESSAGE", expectAlive: true },
] as const;

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = (error as { cause?: unknown }).cause;
  const causeStatus =
    cause && typeof cause === "object" && "status" in cause
      ? ` status=${String((cause as { status: unknown }).status)}`
      : "";
  const causeMessage =
    cause instanceof Error ? ` cause=${cause.message.slice(0, 120)}` : "";
  return `${error.name}: ${error.message.slice(0, 120)}${causeStatus}${causeMessage}`;
}

async function main() {
  const composio = getComposioClient();
  let failures = 0;

  for (const { slug, expectAlive } of CASES) {
    const started = Date.now();
    try {
      const tool = await composio.tools.getRawComposioToolBySlug(slug);
      const latency = Date.now() - started;
      const hasSchema =
        tool.inputParameters != null && typeof tool.inputParameters === "object";
      const alive = hasSchema;
      const verdict = alive === expectAlive ? "PASS" : "FAIL";
      if (verdict === "FAIL") failures += 1;
      console.log(
        `${verdict} ${slug}: alive=${alive} (expected ${expectAlive}) ` +
          `latency=${latency}ms name=${JSON.stringify(tool.name)} hasSchema=${hasSchema}`,
      );
    } catch (error) {
      const latency = Date.now() - started;
      const alive = false;
      const verdict = alive === expectAlive ? "PASS" : "FAIL";
      if (verdict === "FAIL") failures += 1;
      console.log(
        `${verdict} ${slug}: alive=false (expected ${expectAlive}) latency=${latency}ms ` +
          describeError(error),
      );
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} case(s) did not match expectations`);
    process.exit(1);
  }
  console.log("\nProbe behaves as expected — safe to wire alerts.");
}

void main();

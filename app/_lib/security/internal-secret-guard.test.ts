import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const API_DIR = join(__dirname, "..", "..", "api");

function collectRoutes(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectRoutes(full));
    } else if (entry === "route.ts" || entry === "route.tsx") {
      out.push(full);
    }
  }
  return out;
}

const INTERNAL_ROUTE_DIRS = ["cron", "internal", "maintenance"];

function internalRoutes(): string[] {
  return collectRoutes(API_DIR).filter((file) => {
    const rel = file.slice(API_DIR.length + 1);
    return INTERNAL_ROUTE_DIRS.some(
      (dir) => rel === `${dir}/route.ts` || rel.startsWith(`${dir}/`),
    );
  });
}

describe("internal secret guard invariant (6.7 / INV-8)", () => {
  it("finds the cron routes", () => {
    expect(internalRoutes().length).toBeGreaterThanOrEqual(10);
  });

  it("every internal route authenticates via assertInternalSecret", () => {
    const offenders: string[] = [];
    for (const file of internalRoutes()) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("assertInternalSecret")) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("no internal route hand-rolls a CRON_SECRET comparison", () => {
    const offenders: string[] = [];
    for (const file of internalRoutes()) {
      const src = readFileSync(file, "utf8");
      if (
        /CRON_SECRET\s*={2,3}|!==\s*CRON_SECRET|process\.env\.CRON_SECRET/.test(src)
      ) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the guard runs before any admin-client use inside the handler", () => {
    const offenders: string[] = [];
    for (const file of internalRoutes()) {
      const src = readFileSync(file, "utf8");
      // Module-level helpers may instantiate the admin client textually above
      // the handler; they are only reachable through it. Order is enforced
      // from the exported handler onward.
      const handlerMatch = /export\s+async\s+function\s+(GET|POST|PUT|DELETE)/.exec(src);
      if (!handlerMatch) {
        offenders.push(`${file} (no exported HTTP handler found)`);
        continue;
      }
      const body = src.slice(handlerMatch.index);
      const adminAt = body.indexOf("createAdminClient(");
      if (adminAt === -1) continue;
      const guardAt = body.indexOf("assertInternalSecret(");
      // guardAt === -1 is already caught above; here ordering must hold
      if (guardAt === -1 || guardAt > adminAt) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});

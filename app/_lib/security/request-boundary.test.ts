import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Request-boundary invariant (Sources plan 6.3 / INV-3): any request-reachable
 * module that uses the service-role admin client must establish auth and
 * tenancy first. The admin client bypasses RLS, so an unguarded route or
 * server action that takes workspaceId from its payload is a cross-tenant
 * write (or worse, cross-tenant vendor spend billed to the victim).
 *
 * Scope: every app/api/**\/route.ts and every file with a real "use server"
 * directive that imports createAdminClient. Internal service modules are out
 * of scope by definition — they are not request-reachable, and the
 * single-gate style sweeps cover their own invariants.
 *
 * Guard lexicon: tenancy/session guards prove the caller is a workspace
 * member; secret/signature checks prove the caller is a trusted system
 * (cron, webhook). A file fails until it contains one of these or carries
 * an explicit, justified allowlist entry below.
 */

const ROOT = process.cwd();

const SESSION_GUARDS = [
  "getTenantContext",
  "requireWorkspaceMember",
  "getWorkspaceMemberOrNull",
  "requireAuth(",
  "requireAuthenticatedWorkspaceMember",
  "getPlatformAdmin",
  "auth.getUser(",
  "getWorkspaceContext",
];

const SYSTEM_GUARDS = [
  "CRON_SECRET",
  "assertInternalSecret",
  "WEBHOOK_SECRET",
  "verifyComposioWebhookSignature",
  "constructEvent",
  "verifyWebhookSignature",
];

/**
 * Public-by-design surfaces. Each entry must say WHY no session exists and
 * what limits the blast radius. Additions here should be rare and reviewed.
 */
const PUBLIC_ALLOWLIST: Record<string, string> = {
  "app/api/marketing/waitlist-funnel/route.ts":
    "anonymous marketing funnel beacon: consent-gated (hasAnalyticsConsent), allowlisted event names, writes only marketing_funnel_events",
  "app/_features/marketing/actions.ts":
    "public waitlist signup: rate-limited, consent-gated, email-validated; no session exists by design",
  "app/_features/marketing/blog/blog-newsletter-actions.ts":
    "public newsletter signup: rate-limited, consent-gated; no session exists by design",
};

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf-8");
}

/** True when the file's first statement is the "use server" directive —
 *  not merely when the string appears in a comment or deeper in the file. */
function hasUseServerDirective(source: string): boolean {
  let s = source.replace(/^﻿/, "").trimStart();
  for (;;) {
    if (s.startsWith("//")) {
      const nl = s.indexOf("\n");
      if (nl === -1) return false;
      s = s.slice(nl + 1).trimStart();
      continue;
    }
    if (s.startsWith("/*")) {
      const end = s.indexOf("*/");
      if (end === -1) return false;
      s = s.slice(end + 2).trimStart();
      continue;
    }
    break;
  }
  return s.startsWith('"use server"') || s.startsWith("'use server'");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      walk(rel, out);
      continue;
    }
    if (/\.ts$/.test(entry.name) && !/\.test\.ts$/.test(entry.name)) {
      out.push(rel);
    }
  }
  return out;
}

function adminClientCallSites(source: string): number[] {
  const sites: number[] = [];
  let idx = source.indexOf("createAdminClient(");
  while (idx !== -1) {
    sites.push(idx);
    idx = source.indexOf("createAdminClient(", idx + 1);
  }
  return sites;
}

describe("request-boundary invariant (6.3 / INV-3)", () => {
  const allFiles = walk("app");

  const routes = allFiles.filter(
    (f) => f.startsWith("app/api/") && f.endsWith("route.ts"),
  );
  const serverActionFiles = allFiles.filter(
    (f) => !f.startsWith("app/api/") && hasUseServerDirective(read(f)),
  );

  it("every API route using the admin client checks auth before the first call", () => {
    const offenders: string[] = [];

    for (const file of routes) {
      const source = read(file);
      if (!source.includes("createAdminClient")) continue;
      if (PUBLIC_ALLOWLIST[file]) continue;

      const guards = [...SESSION_GUARDS, ...SYSTEM_GUARDS];
      const guardAt = Math.min(
        ...guards.map((g) => source.indexOf(g)).filter((i) => i !== -1),
      );
      const firstCall = adminClientCallSites(source)[0];

      if (guardAt === Infinity || (firstCall !== undefined && guardAt > firstCall)) {
        offenders.push(file);
      }
    }

    expect(
      offenders,
      `Routes using createAdminClient without a preceding auth guard:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("every server-action file using the admin client has a tenancy guard", () => {
    const offenders: string[] = [];

    for (const file of serverActionFiles) {
      const source = read(file);
      if (!source.includes("createAdminClient")) continue;
      if (PUBLIC_ALLOWLIST[file]) continue;

      const guarded = SESSION_GUARDS.some((g) => source.includes(g));
      if (!guarded) offenders.push(file);
    }

    expect(
      offenders,
      `"use server" files using createAdminClient without a tenancy guard:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("the allowlist only names files that still exist and still lack a guard", () => {
    for (const file of Object.keys(PUBLIC_ALLOWLIST)) {
      const source = read(file);
      expect(
        source.includes("createAdminClient"),
        `${file} no longer uses the admin client — remove its allowlist entry`,
      ).toBe(true);
      const guarded = [...SESSION_GUARDS, ...SYSTEM_GUARDS].some((g) =>
        source.includes(g),
      );
      expect(
        guarded,
        `${file} gained a real guard — remove its allowlist entry`,
      ).toBe(false);
    }
  });

  it("directive detection ignores comments containing the words", () => {
    expect(
      hasUseServerDirective(
        '/**\n * This is NOT a server action (no "use server" directive).\n */\n\nimport { x } from "./y";',
      ),
    ).toBe(false);
    expect(hasUseServerDirective('"use server";\n\nexport async function f() {}')).toBe(
      true,
    );
    expect(
      hasUseServerDirective('// header\n/* block */\n"use server";\nexport async function f() {}'),
    ).toBe(true);
  });
});

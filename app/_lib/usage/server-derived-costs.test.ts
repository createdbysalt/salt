import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Server-derived cost invariant (Sources plan 6.4 / INV-4): every cost,
 * quantity rate, tier, and estimate that reaches the billing meter is
 * derived on the server — a constant from app/_lib/usage, or a server cost
 * calculator's output — never from a request field. A client that can name
 * its own price can also name zero.
 *
 * Two rules:
 *
 * A. recordUsageEvent (the ledger's single write path) is only called from
 *    inside app/_lib/usage — features use the record* wrappers, which carry
 *    their own constants.
 *
 * B. Every estimateMicros / costEstimateMicros property value is free of
 *    request-ish identifiers (body, req, request, searchParams, params,
 *    input, payload). Server-computed quantities are fine — the audio route
 *    prices `text.length * TTS_MICROS_PER_CHARACTER`, where the rate is a
 *    usage constant and the length is capped server-side; what may never
 *    happen is the client supplying the rate or the total.
 */

const ROOT = process.cwd();

const REQUEST_IDENTIFIERS =
  /\b(body|req|request|searchParams|params|input|payload)\b/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      walk(rel, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      out.push(rel);
    }
  }
  return out;
}

/** Extract the value expression of an object property, stopping at the
 *  comma/brace that ends it (paren- and brace-aware). */
function propertyValue(source: string, fromIndex: number): string {
  let depth = 0;
  let i = fromIndex;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === "(" || ch === "{" || ch === "[") depth++;
    if (ch === ")" || ch === "}" || ch === "]") {
      if (depth === 0) break;
      depth--;
    }
    if (ch === "," && depth === 0) break;
  }
  return source.slice(fromIndex, i).trim();
}

describe("server-derived cost invariant (6.4 / INV-4)", () => {
  const files = walk("app");

  it("recordUsageEvent is only called inside app/_lib/usage", () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (file.startsWith("app/_lib/usage/")) continue;
      const source = readFileSync(join(ROOT, file), "utf-8");
      if (source.includes("recordUsageEvent(")) offenders.push(file);
    }
    expect(
      offenders,
      `recordUsageEvent called outside app/_lib/usage:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("no estimate arg derives from a request field", () => {
    const offenders: string[] = [];
    const propertyPattern = /\b(estimateMicros|costEstimateMicros)\s*:\s*/g;

    for (const file of files) {
      const source = readFileSync(join(ROOT, file), "utf-8");
      for (const match of source.matchAll(propertyPattern)) {
        const valueStart = (match.index ?? 0) + match[0].length;
        const value = propertyValue(source, valueStart);
        // Type declarations (`costEstimateMicros: number`) are not values.
        if (/^number\b/.test(value)) continue;
        if (REQUEST_IDENTIFIERS.test(value)) {
          offenders.push(`${file} → ${match[1]}: ${value.slice(0, 60)}`);
        }
      }
    }

    expect(
      offenders,
      `Estimate args derived from request fields:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("the known estimate call sites stay anchored to usage constants", () => {
    const gate = readFileSync(
      join(ROOT, "app/_lib/composio/actions.ts"),
      "utf-8",
    );
    expect(gate).toContain("estimateMicros: COMPOSIO_ACTION_MICROS");

    const audio = readFileSync(
      join(ROOT, "app/api/briefing/audio/route.ts"),
      "utf-8",
    );
    expect(audio).toContain("TTS_MICROS_PER_CHARACTER");

    for (const wrapper of [
      "app/_lib/usage/record-composio-usage.ts",
      "app/_lib/usage/record-trigger-usage.ts",
    ]) {
      const source = readFileSync(join(ROOT, wrapper), "utf-8");
      expect(
        /costEstimateMicros:\s*[A-Z][A-Z_]+/.test(source),
        `${wrapper} must price from a module constant`,
      ).toBe(true);
    }

    for (const wrapper of [
      "app/_lib/usage/record-play-usage.ts",
      "app/_lib/usage/record-llm-usage.ts",
      "app/_lib/usage/ask-salt-usage.ts",
    ]) {
      const source = readFileSync(join(ROOT, wrapper), "utf-8");
      expect(
        source.includes("costEstimateMicros: cost.totalMicros"),
        `${wrapper} must price from its server cost calculator`,
      ).toBe(true);
    }
  });
});

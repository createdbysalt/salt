import { describe, expect, it, vi } from "vitest";

import { collectCapturePages } from "./daily-scan";

/**
 * Every row these pages return costs one model call in the scan loop, so the
 * ceiling is the whole point. This was once `while (true)`, which meant a
 * single "sync and scan" click classified every capture in the lookback window
 * and the bill was set by the size of the user's inbox.
 */

function pagesOf(total: number) {
  return vi.fn(async (from: number, to: number) => {
    const size = Math.max(0, Math.min(to, total - 1) - from + 1);
    return {
      data: Array.from({ length: size }, (_, i) => ({
        id: `capture-${from + i}`,
      })) as never,
    };
  });
}

describe("collectCapturePages", () => {
  it("stops at the ceiling when far more captures exist", async () => {
    const fetchPage = pagesOf(10_000);

    const { rows } = await collectCapturePages(fetchPage, 250, 100);

    expect(rows).toHaveLength(250);
  });

  it("never requests a row beyond the ceiling", async () => {
    // Fetching past the cap and discarding would still pay the query cost and
    // would make the cap a formality rather than a bound.
    const fetchPage = pagesOf(10_000);

    await collectCapturePages(fetchPage, 250, 100);

    for (const [, to] of fetchPage.mock.calls) {
      expect(to).toBeLessThanOrEqual(249);
    }
  });

  it("makes a bounded number of requests rather than looping forever", async () => {
    const fetchPage = pagesOf(10_000);

    await collectCapturePages(fetchPage, 250, 100);

    // 100 + 100 + 50, and nothing more.
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("stops early when the source runs out before the ceiling", async () => {
    const fetchPage = pagesOf(120);

    const { rows } = await collectCapturePages(fetchPage, 1000, 100);

    expect(rows).toHaveLength(120);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("fetches nothing when the ceiling is zero", async () => {
    const fetchPage = pagesOf(500);

    const { rows } = await collectCapturePages(fetchPage, 0, 100);

    expect(rows).toHaveLength(0);
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it("surfaces a page error instead of returning a partial scan", async () => {
    // A partial result would look like a completed scan and leave captures
    // silently unclassified.
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ id: "a" }] })
      .mockResolvedValueOnce({ data: null, error: "connection reset" });

    const result = await collectCapturePages(fetchPage, 250, 1);

    expect(result.error).toBe("connection reset");
    expect(result.rows).toHaveLength(0);
  });
});

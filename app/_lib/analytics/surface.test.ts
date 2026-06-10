import { describe, expect, it } from "vitest";
import {
  isAppHost,
  isAppPath,
  shouldLoadMarketingAnalytics,
  shouldLoadProductAnalytics,
} from "./surface";

describe("analytics surface", () => {
  it("detects app subdomain hosts", () => {
    expect(isAppHost("app.usesalt.io")).toBe(true);
    expect(isAppHost("usesalt.io")).toBe(false);
  });

  it("detects app paths", () => {
    expect(isAppPath("/hq")).toBe(true);
    expect(isAppPath("/hq/inbox")).toBe(true);
    expect(isAppPath("/pricing")).toBe(false);
  });

  it("loads GTM on marketing host only", () => {
    expect(shouldLoadMarketingAnalytics("usesalt.io", "/")).toBe(true);
    expect(shouldLoadMarketingAnalytics("app.usesalt.io", "/hq")).toBe(false);
    expect(shouldLoadMarketingAnalytics("localhost:3000", "/pricing")).toBe(true);
    expect(shouldLoadMarketingAnalytics("localhost:3000", "/hq")).toBe(false);
  });

  it("loads PostHog on app host and app paths", () => {
    expect(shouldLoadProductAnalytics("app.usesalt.io", "/hq")).toBe(true);
    expect(shouldLoadProductAnalytics("usesalt.io", "/")).toBe(false);
    expect(shouldLoadProductAnalytics("localhost:3000", "/hq")).toBe(true);
    expect(shouldLoadProductAnalytics("localhost:3000", "/")).toBe(false);
  });
});

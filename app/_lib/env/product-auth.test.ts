import { describe, it, expect, afterEach } from "vitest";
import {
  isProductAuthEnabled,
  isProductAppRoute,
  isProductAuthPath,
  shouldBlockProductAccess,
  PRODUCT_AUTH_REDIRECT_PATH,
} from "./product-auth";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function clearProductAuthEnv() {
  delete process.env.NEXT_PUBLIC_PRODUCT_AUTH_ENABLED;
  delete process.env.NEXT_PUBLIC_DEPLOYMENT_ENV;
  delete process.env.DEPLOYMENT_ENV;
  delete process.env.VERCEL_ENV;
  delete process.env.VERCEL_GIT_COMMIT_REF;
  delete process.env.VERCEL;
}

describe("isProductAuthEnabled", () => {
  it("returns true when NEXT_PUBLIC_PRODUCT_AUTH_ENABLED is true", () => {
    clearProductAuthEnv();
    process.env.NEXT_PUBLIC_PRODUCT_AUTH_ENABLED = "true";
    process.env.VERCEL_ENV = "production";
    expect(isProductAuthEnabled()).toBe(true);
  });

  it("returns false when NEXT_PUBLIC_PRODUCT_AUTH_ENABLED is false", () => {
    clearProductAuthEnv();
    process.env.NEXT_PUBLIC_PRODUCT_AUTH_ENABLED = "false";
    process.env.NEXT_PUBLIC_DEPLOYMENT_ENV = "staging";
    expect(isProductAuthEnabled()).toBe(false);
  });

  it("returns true on staging deployment", () => {
    clearProductAuthEnv();
    process.env.NEXT_PUBLIC_DEPLOYMENT_ENV = "staging";
    expect(isProductAuthEnabled()).toBe(true);
  });

  it("returns true for local development without Vercel", () => {
    clearProductAuthEnv();
    delete process.env.VERCEL;
    expect(isProductAuthEnabled()).toBe(true);
  });

  it("returns false on production deployment", () => {
    clearProductAuthEnv();
    process.env.VERCEL_ENV = "production";
    expect(isProductAuthEnabled()).toBe(false);
  });

  it("returns false on Vercel preview deployments", () => {
    clearProductAuthEnv();
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_GIT_COMMIT_REF = "feature/waitlist";
    expect(isProductAuthEnabled()).toBe(false);
  });
});

describe("route classification", () => {
  it("identifies product app routes", () => {
    expect(isProductAppRoute("/hq")).toBe(true);
    expect(isProductAppRoute("/people/abc")).toBe(true);
    expect(isProductAppRoute("/waitlist")).toBe(false);
    expect(isProductAppRoute("/")).toBe(false);
  });

  it("identifies auth paths", () => {
    expect(isProductAuthPath("/signin")).toBe(true);
    expect(isProductAuthPath("/api/auth/callback")).toBe(true);
    expect(isProductAuthPath("/waitlist")).toBe(false);
  });
});

describe("shouldBlockProductAccess", () => {
  it("blocks app and auth routes when auth is disabled", () => {
    clearProductAuthEnv();
    process.env.NEXT_PUBLIC_PRODUCT_AUTH_ENABLED = "false";
    expect(shouldBlockProductAccess("/signin")).toBe(true);
    expect(shouldBlockProductAccess("/hq")).toBe(true);
    expect(shouldBlockProductAccess("/waitlist")).toBe(false);
  });

  it("does not block when auth is enabled", () => {
    clearProductAuthEnv();
    process.env.NEXT_PUBLIC_DEPLOYMENT_ENV = "staging";
    expect(shouldBlockProductAccess("/hq")).toBe(false);
    expect(shouldBlockProductAccess("/signin")).toBe(false);
  });
});

describe("PRODUCT_AUTH_REDIRECT_PATH", () => {
  it("points to the waitlist", () => {
    expect(PRODUCT_AUTH_REDIRECT_PATH).toBe("/waitlist");
  });
});

import { describe, it, expect, afterEach } from "vitest";
import { getDeploymentEnvironment } from "./deployment";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("getDeploymentEnvironment", () => {
  it("returns explicit NEXT_PUBLIC_DEPLOYMENT_ENV when set", () => {
    process.env.NEXT_PUBLIC_DEPLOYMENT_ENV = "staging";
    delete process.env.VERCEL_ENV;
    expect(getDeploymentEnvironment()).toBe("staging");
  });

  it("returns production when VERCEL_ENV is production", () => {
    delete process.env.NEXT_PUBLIC_DEPLOYMENT_ENV;
    process.env.VERCEL_ENV = "production";
    expect(getDeploymentEnvironment()).toBe("production");
  });

  it("returns staging when git ref is staging", () => {
    delete process.env.NEXT_PUBLIC_DEPLOYMENT_ENV;
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_GIT_COMMIT_REF = "staging";
    expect(getDeploymentEnvironment()).toBe("staging");
  });

  it("returns development locally when unset", () => {
    delete process.env.NEXT_PUBLIC_DEPLOYMENT_ENV;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_GIT_COMMIT_REF;
    expect(getDeploymentEnvironment()).toBe("development");
  });
});

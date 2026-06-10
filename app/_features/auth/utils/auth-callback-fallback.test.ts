import { describe, it, expect } from "vitest";
import {
  authCallbackFailureMessage,
  buildHashForwardHtml,
  buildSignInFailureUrl,
  parseEmailOtpType,
} from "./auth-callback-fallback";

describe("parseEmailOtpType", () => {
  it("accepts supported Supabase OTP types", () => {
    expect(parseEmailOtpType("magiclink")).toBe("magiclink");
    expect(parseEmailOtpType("email")).toBe("email");
  });

  it("rejects unknown types", () => {
    expect(parseEmailOtpType("sms")).toBeNull();
    expect(parseEmailOtpType(null)).toBeNull();
  });
});

describe("buildSignInFailureUrl", () => {
  it("builds sign-in URL with error params", () => {
    const url = buildSignInFailureUrl(
      "https://app.staging.usesalt.io",
      "auth_callback_failed",
      "PKCE verifier missing"
    );

    expect(url.pathname).toBe("/signin");
    expect(url.searchParams.get("error")).toBe("auth_callback_failed");
    expect(url.searchParams.get("message")).toBe("PKCE verifier missing");
  });
});

describe("authCallbackFailureMessage", () => {
  it("maps PKCE errors to same-browser guidance", () => {
    expect(
      authCallbackFailureMessage("invalid request: both auth code and PKCE verifier should be non-empty")
    ).toContain("same browser");
  });
});

describe("buildHashForwardHtml", () => {
  it("forwards URL hash tokens to sign-in", () => {
    const html = buildHashForwardHtml("/signin");
    expect(html).toContain('window.location.replace("/signin" + hash)');
  });
});

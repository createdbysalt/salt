import type { EmailOtpType } from "@supabase/supabase-js";

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

const EMAIL_OTP_TYPE_SET = new Set<string>(EMAIL_OTP_TYPES);

export function parseEmailOtpType(value: string | null): EmailOtpType | null {
  if (!value || !EMAIL_OTP_TYPE_SET.has(value)) return null;
  return value as EmailOtpType;
}

export function buildSignInFailureUrl(
  origin: string,
  errorCode: string,
  message: string
): URL {
  const signInUrl = new URL("/signin", origin);
  signInUrl.searchParams.set("error", errorCode);
  signInUrl.searchParams.set("message", message);
  return signInUrl;
}

export function authCallbackFailureMessage(errorMessage: string): string {
  if (errorMessage.includes("PKCE")) {
    return "Open the magic link in the same browser where you requested it.";
  }
  return errorMessage;
}

/**
 * When Supabase returns tokens in the URL hash, the server never sees them.
 * This page forwards the hash to /signin where AuthTokenHandler can setSession().
 */
export function buildHashForwardHtml(signInPath = "/signin"): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Completing sign-in…</title>
  </head>
  <body>
    <p>Completing sign-in…</p>
    <script>
      (function () {
        var hash = window.location.hash || "";
        if (hash) {
          window.location.replace(${JSON.stringify(signInPath)} + hash);
          return;
        }
        window.location.replace(
          ${JSON.stringify(signInPath)} +
            "?error=auth_callback_failed&message=" +
            encodeURIComponent(
              "Invalid or expired sign-in link. Request a new magic link and open it in the same browser."
            )
        );
      })();
    </script>
  </body>
</html>`;
}

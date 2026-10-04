"use client";

import { useState } from "react";
import { redirectToOneTimeCheckoutAction } from "@/app/_features/billing/actions";
import config from "@/config";

type Props = {
  /** Server-known plan key; the server resolves it to an allow-listed Stripe price. */
  planKey: "starter" | "advanced";
  mode?: "payment" | "subscription";
};

/**
 * Starts a Stripe Checkout session for the legacy one-time plans through a
 * Server Action. The client never sends a price ID, only a plan key, so a
 * tampered form cannot buy at an arbitrary price.
 */
export default function ButtonCheckout({ planKey, mode = "payment" }: Props) {
  const [pending, setPending] = useState(false);
  const returnUrl = typeof window === "undefined" ? "/" : window.location.href;

  async function submit(formData: FormData) {
    setPending(true);
    try {
      await redirectToOneTimeCheckoutAction(formData);
    } catch (error) {
      console.error("Checkout failed:", error);
      setPending(false);
    }
  }

  return (
    <form action={submit}>
      <input type="hidden" name="planKey" value={planKey} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="successUrl" value={returnUrl} />
      <input type="hidden" name="cancelUrl" value={returnUrl} />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? (
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
        ) : null}
        {pending ? "Redirecting…" : `Get ${config.appName}`}
      </button>
    </form>
  );
}

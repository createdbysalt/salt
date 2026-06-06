"use client";

import { startTransition, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@repo/utils";
import { saveWaitlistLeadAction } from "@/app/_features/marketing/actions";
import { getWaitlistEmailValidationMessage } from "@/app/_features/marketing/waitlist-qualification";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;
const EMAIL_ERROR_ID = "waitlist-form-email-error";

type Variant = "light" | "aurora";

export function WaitlistForm({
  variant = "light",
  source = "landing2",
  className,
  compactMobile = false,
}: {
  variant?: Variant;
  source?: string;
  className?: string;
  /** Narrower stacked fields on phone (hero). */
  compactMobile?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const onAurora = variant === "aurora";
  const hasError = message !== null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const validationMessage = getWaitlistEmailValidationMessage(email);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }
    setMessage(null);
    const trimmed = email.trim();

    const normalized = trimmed.toLowerCase();
    startTransition(() => {
      void saveWaitlistLeadAction({
        email: normalized,
        source,
        status: "partial",
        lastStep: "email",
      });
    });

    const params = new URLSearchParams({
      email: normalized,
      source,
    });
    router.push(`/waitlist?${params.toString()}`);
  }

  return (
    <div
      className={cn(
        "w-full",
        compactMobile ? "max-w-[17.5rem] sm:max-w-md" : "max-w-md",
        className
      )}
    >
      <div>
        <form
          noValidate
          onSubmit={onSubmit}
          className={cn(
            "flex flex-col gap-2.5 transition sm:flex-row sm:items-center sm:gap-1.5 sm:rounded-full sm:p-1.5 sm:ring-1",
            onAurora
              ? "sm:bg-white/10 sm:ring-white/25 sm:backdrop-blur sm:focus-within:ring-white/50"
              : "sm:bg-card sm:shadow-[var(--shadow-card)] sm:ring-border sm:focus-within:ring-foreground/40",
            hasError &&
              (onAurora
                ? "sm:ring-white/45"
                : "sm:ring-foreground/25")
          )}
        >
          <input
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            enterKeyHint="go"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (message) setMessage(null);
            }}
            placeholder="you@business.com"
            aria-label="Email address"
            aria-invalid={hasError}
            aria-describedby={hasError ? EMAIL_ERROR_ID : undefined}
            className={cn(
              "min-w-0 flex-1 rounded-xl border px-3.5 outline-none transition placeholder:font-normal focus:ring-2 sm:rounded-full sm:border-0 sm:bg-transparent sm:px-4 sm:py-2 sm:text-sm sm:focus:ring-0",
              compactMobile ? "py-2.5 text-sm" : "py-3.5 text-base",
              onAurora
                ? "border-white/25 bg-white/10 text-white placeholder:text-white/55 focus:border-white/40 focus:ring-white/20 sm:border-0 sm:bg-transparent sm:focus:border-transparent"
                : "border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-foreground/25 focus:ring-foreground/10 sm:border-0 sm:bg-transparent sm:focus:border-transparent",
              hasError &&
                !onAurora &&
                "border-foreground/25 ring-2 ring-foreground/10 sm:ring-0"
            )}
          />
          <button
            type="submit"
            className={cn(
              "inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold transition sm:min-h-0 sm:w-auto sm:py-2",
              compactMobile ? "min-h-10 py-2.5" : "min-h-11 py-3",
              onAurora
                ? "bg-white text-foreground hover:bg-white/90"
                : "bg-foreground text-background hover:opacity-90"
            )}
          >
            Join the waitlist
            <ArrowRight className="size-3.5" strokeWidth={2.25} />
          </button>
        </form>
      </div>

      {message && (
        <motion.p
          id={EMAIL_ERROR_ID}
          role="alert"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: APPLE_EASE }}
          className={cn(
            "mt-3 rounded-2xl px-4 py-2.5 text-center text-sm leading-snug",
            onAurora
              ? "bg-white/10 text-white/90 ring-1 ring-white/20 backdrop-blur"
              : "bg-muted/80 text-muted-foreground ring-1 ring-border"
          )}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}

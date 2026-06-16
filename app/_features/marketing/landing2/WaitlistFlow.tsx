"use client";

import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@repo/utils";
import { saveWaitlistLeadAction } from "@/app/_features/marketing/actions";
import { trackWaitlistFunnel } from "@/app/_features/marketing/waitlist-funnel";
import { useCookieConsent } from "@/app/_features/marketing/components/CookieConsentProvider";
import {
  getWaitlistEmailValidationMessage,
  isValidWaitlistEmail,
} from "@/app/_features/marketing/waitlist-qualification";
import type { ResolvedWaitlistForm } from "@/app/_features/marketing/waitlist-form-config";
import { SALT_LOGO_PATH } from "./constants";
import { WaitlistLegalConsent } from "./WaitlistLegalConsent";
import "./landing2.css";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;
const WAITLIST_EMAIL_ERROR_ID = "waitlist-flow-email-error";

/** Unselected qual option — aurora/flame hover matches landing2 progress bar branding */
const WAITLIST_OPTION_IDLE =
  "border-border bg-card transition hover:border-flame/30 hover:bg-flame/15 focus-visible:border-flame/30 focus-visible:bg-flame/15 focus-visible:outline-none";

const WAITLIST_EYEBROW =
  "text-center text-sm text-muted-foreground sm:text-base lg:text-lg";

const WAITLIST_HEADING =
  "font-display mt-2 text-balance text-center text-2xl tracking-tight sm:mt-3 sm:text-4xl lg:text-5xl";

const WAITLIST_BODY =
  "mt-3 text-center text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base lg:text-lg";

const WAITLIST_OPTION_BUTTON =
  "flex w-full items-center rounded-xl border px-4 py-3 text-left text-sm font-medium sm:rounded-2xl sm:px-5 sm:py-4 sm:text-base lg:py-5";

const WAITLIST_PRIMARY_BUTTON =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3.5 text-sm font-semibold text-background transition hover:opacity-90 sm:rounded-2xl sm:px-5 sm:py-4 sm:text-base lg:py-5 lg:text-lg";

const WAITLIST_INPUT =
  "w-full rounded-xl border bg-card px-4 py-3.5 text-base outline-none transition placeholder:text-muted-foreground focus:ring-2 sm:rounded-2xl sm:px-5 sm:py-4 lg:py-5 lg:text-lg";

type QualAnswers = Record<string, string>;
type FlowPhase = "email" | "qualify";

type WaitlistFlowProps = {
  initialEmail?: string;
  source?: string;
  form: ResolvedWaitlistForm;
};

export function WaitlistFlow({
  initialEmail,
  source: sourceOverride,
  form,
}: WaitlistFlowProps) {
  const source = sourceOverride?.trim() || form.waitlistSource;
  const qualSteps = form.qualSteps;
  const totalQualSteps = qualSteps.length;
  const { analytics, hasChosen } = useCookieConsent();
  const hasEmailUpfront = !initialEmail || !isValidWaitlistEmail(initialEmail);
  const prefilledSaveStarted = useRef(false);

  const [phase, setPhase] = useState<FlowPhase>(
    hasEmailUpfront ? "email" : "qualify"
  );
  const [email, setEmail] = useState(
    initialEmail && isValidWaitlistEmail(initialEmail)
      ? initialEmail.trim().toLowerCase()
      : ""
  );
  const [emailInput, setEmailInput] = useState("");
  const [qualStep, setQualStep] = useState(0);
  const [answers, setAnswers] = useState<QualAnswers>({});
  const [multiSelection, setMultiSelection] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  const totalSteps = totalQualSteps + (hasEmailUpfront ? 1 : 0);
  const currentQual = qualSteps[qualStep];

  const progress = (() => {
    if (status === "success") return 100;
    if (phase === "email") return (1 / totalSteps) * 100;
    const qualIndex = (hasEmailUpfront ? 1 : 0) + qualStep;
    return ((qualIndex + 1) / totalSteps) * 100;
  })();

  function savePartialProgress(
    partialEmail: string,
    qualification: QualAnswers,
    lastStep: string
  ) {
    startTransition(() => {
      void saveWaitlistLeadAction({
        email: partialEmail,
        source,
        status: "partial",
        qualification,
        lastStep,
      });
    });
  }

  useEffect(() => {
    if (prefilledSaveStarted.current) return;
    if (!initialEmail || !isValidWaitlistEmail(initialEmail)) return;

    prefilledSaveStarted.current = true;
    savePartialProgress(initialEmail.trim().toLowerCase(), {}, "email");
  }, [initialEmail, source]);

  function showSuccess(alreadyOnList = false) {
    setStatus("success");
    setMessage(
      alreadyOnList
        ? "You're already on the list — we'll be in touch."
        : "You're on the list. We'll email when your spot opens."
    );
  }

  function onEmailSubmit(e: FormEvent) {
    e.preventDefault();
    const validationMessage = getWaitlistEmailValidationMessage(emailInput);
    if (validationMessage) {
      setStatus("error");
      setMessage(validationMessage);
      return;
    }
    const trimmed = emailInput.trim();
    const normalized = trimmed.toLowerCase();
    setEmail(normalized);
    savePartialProgress(normalized, {}, "email");
    setPhase("qualify");
    setStatus("idle");
    setMessage(null);
  }

  async function submitWaitlist(qualification: QualAnswers) {
    setStatus("loading");
    setMessage(null);
    if (analytics) {
      trackWaitlistFunnel("waitlist_submit");
    }

    try {
      const result = await saveWaitlistLeadAction({
        email,
        source,
        status: "complete",
        qualification,
        lastStep: qualSteps[qualSteps.length - 1]?.field ?? "hearAbout",
      });

      if (result.success) {
        showSuccess(result.alreadyJoined);
        return;
      }

      const errorText =
        "error" in result ? result.error : "We could not save your spot.";
      setStatus("error");
      setMessage(errorText);
    } catch {
      setStatus("error");
      setMessage("We could not save your spot. Please try again.");
    }
  }

  function goToNextStep(nextAnswers: QualAnswers, completedStep: string) {
    const isLast = qualStep >= totalQualSteps - 1;
    if (isLast) {
      void submitWaitlist(nextAnswers);
      return;
    }

    savePartialProgress(email, nextAnswers, completedStep);
    setQualStep((s) => s + 1);
    setMultiSelection([]);
    setStatus("idle");
    setMessage(null);
  }

  async function onSingleOption(field: string, value: string) {
    if (status === "loading") return;
    const nextAnswers = { ...answers, [field]: value };
    setAnswers(nextAnswers);
    goToNextStep(nextAnswers, field);
  }

  function onMultiToggle(value: string) {
    setMultiSelection((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
    if (status === "error") {
      setStatus("idle");
      setMessage(null);
    }
  }

  function onMultiContinue() {
    if (status === "loading") return;
    if (multiSelection.length === 0) {
      setStatus("error");
      setMessage(currentQual.helpText ?? "Pick at least one option.");
      return;
    }
    const nextAnswers = {
      ...answers,
      [currentQual.field]: multiSelection.join(","),
    };
    setAnswers(nextAnswers);
    goToNextStep(nextAnswers, currentQual.field);
  }

  function onBack() {
    if (status === "loading") return;
    if (qualStep === 0) {
      if (hasEmailUpfront) {
        setPhase("email");
        setStatus("idle");
        setMessage(null);
      }
      return;
    }
    const prevStep = qualStep - 1;
    const prevQual = qualSteps[prevStep];
    if (prevQual.type === "multi" && answers[prevQual.field]) {
      setMultiSelection(answers[prevQual.field].split(",").filter(Boolean));
    } else {
      setMultiSelection([]);
    }
    setQualStep(prevStep);
    setStatus("idle");
    setMessage(null);
  }

  const qualEyebrow =
    currentQual.eyebrow ?? `Question ${qualStep + 1} of ${totalQualSteps}`;
  const isFinalQualStep = qualStep === totalQualSteps - 1;

  return (
    <div className="landing2-home flex min-h-screen flex-col bg-background">
      <header>
        <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-7">
          <Link href="/" className="inline-flex items-center" aria-label="Salt">
            <span
              aria-hidden
              className="block h-5 w-12 bg-foreground sm:h-6 sm:w-14"
              style={{
                maskImage: `url(${SALT_LOGO_PATH})`,
                WebkitMaskImage: `url(${SALT_LOGO_PATH})`,
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskPosition: "left center",
                WebkitMaskPosition: "left center",
              }}
            />
          </Link>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden bg-muted sm:h-2"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            className="h-full rounded-r-full"
            style={{ backgroundImage: "var(--gradient-aurora)" }}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: APPLE_EASE }}
          />
        </div>
      </header>

      <main
        className={cn(
          "flex flex-1 flex-col items-center justify-start px-4 pt-5 sm:justify-center sm:px-6 sm:pt-8 lg:px-10 lg:pt-10",
          hasChosen ? "pb-16" : "pb-36 sm:pb-28"
        )}
      >
        <div className="w-full max-w-md sm:max-w-xl">
          <AnimatePresence mode="wait" initial={false}>
            {status === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: APPLE_EASE }}
                className="text-center"
              >
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-foreground text-background">
                  <Check className="size-5" strokeWidth={2.5} />
                </span>
                <h1 className={cn(WAITLIST_HEADING, "mt-6")}>
                  You&apos;re on the list
                </h1>
                <p className={WAITLIST_BODY}>{message}</p>
                <Link
                  href="/"
                  className="mt-8 inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90 sm:mt-10 sm:text-base"
                >
                  Back to Salt
                </Link>
              </motion.div>
            ) : phase === "email" ? (
              <motion.div
                key="email"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: APPLE_EASE }}
              >
                <p className={WAITLIST_EYEBROW}>{form.eyebrow ?? "Early access"}</p>
                <h1 className={WAITLIST_HEADING}>{form.heading}</h1>
                {form.subheading ? (
                  <p className={WAITLIST_BODY}>{form.subheading}</p>
                ) : null}

                <form
                  noValidate
                  onSubmit={onEmailSubmit}
                  className="mt-8 space-y-2.5 sm:mt-10 sm:space-y-3"
                >
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoFocus
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (message) {
                        setStatus("idle");
                        setMessage(null);
                      }
                    }}
                    placeholder={form.emailPlaceholder}
                    aria-label="Email address"
                    aria-invalid={status === "error" && phase === "email"}
                    aria-describedby={
                      status === "error" && phase === "email" && message
                        ? WAITLIST_EMAIL_ERROR_ID
                        : undefined
                    }
                    className={cn(
                      WAITLIST_INPUT,
                      status === "error" && phase === "email"
                        ? "border-foreground/25 ring-2 ring-foreground/10"
                        : "border-border focus:border-foreground/25 focus:ring-foreground/10"
                    )}
                  />
                  <button type="submit" className={WAITLIST_PRIMARY_BUTTON}>
                    {form.emailContinueLabel}
                    <ArrowRight className="size-4" strokeWidth={2.25} />
                  </button>
                </form>

                {status === "error" && phase === "email" && message && (
                  <motion.p
                    id={WAITLIST_EMAIL_ERROR_ID}
                    role="alert"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: APPLE_EASE }}
                    className="rounded-2xl bg-muted/80 px-4 py-2.5 text-center text-sm leading-snug text-muted-foreground ring-1 ring-border"
                  >
                    {message}
                  </motion.p>
                )}

                <Link
                  href="/"
                  className="mt-6 block w-full text-center text-sm font-medium text-muted-foreground transition hover:text-foreground sm:mt-8 sm:text-base"
                >
                  Back
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key={`qualify-${qualStep}-${currentQual.type}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: APPLE_EASE }}
              >
                <p className={WAITLIST_EYEBROW}>{qualEyebrow}</p>
                <h1 className={WAITLIST_HEADING}>{currentQual.title}</h1>

                {currentQual.type === "multi" ? (
                  <>
                    <p className={cn(WAITLIST_BODY, "text-muted-foreground")}>
                      {currentQual.helpText ?? "Select all that apply"}
                    </p>
                    <ul className="mt-6 space-y-2 sm:mt-8 sm:space-y-3">
                      {currentQual.options?.map((option) => {
                        const selected = multiSelection.includes(option.value);
                        return (
                          <li key={option.value}>
                            <button
                              type="button"
                              disabled={status === "loading"}
                              onClick={() => onMultiToggle(option.value)}
                              className={cn(
                                WAITLIST_OPTION_BUTTON,
                                "gap-3 sm:gap-4",
                                selected
                                  ? "border-foreground/30 bg-foreground text-background"
                                  : WAITLIST_OPTION_IDLE
                              )}
                            >
                              <span
                                className={cn(
                                  "grid size-5 shrink-0 place-items-center rounded border",
                                  selected
                                    ? "border-background/40 bg-background/20"
                                    : "border-border"
                                )}
                                aria-hidden
                              >
                                {selected ? (
                                  <Check className="size-3.5" strokeWidth={3} />
                                ) : null}
                              </span>
                              {option.label}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <button
                      type="button"
                      onClick={onMultiContinue}
                      disabled={status === "loading"}
                      className={cn(
                        WAITLIST_PRIMARY_BUTTON,
                        "mt-6 sm:mt-8 disabled:opacity-60"
                      )}
                    >
                      Continue
                    </button>
                    {isFinalQualStep ? (
                      <WaitlistLegalConsent className="mt-4" />
                    ) : null}
                  </>
                ) : (
                  <ul className="mt-6 space-y-2 sm:mt-8 sm:space-y-3">
                    {currentQual.options?.map((option) => (
                      <li key={option.value}>
                        <button
                          type="button"
                          disabled={status === "loading"}
                          onClick={() =>
                            onSingleOption(currentQual.field, option.value)
                          }
                          className={cn(
                            WAITLIST_OPTION_BUTTON,
                            "disabled:opacity-60",
                            WAITLIST_OPTION_IDLE
                          )}
                        >
                          {option.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {currentQual.type === "single" && isFinalQualStep ? (
                  <WaitlistLegalConsent className="mt-5" />
                ) : null}

                {qualStep > 0 || hasEmailUpfront ? (
                  <button
                    type="button"
                    onClick={onBack}
                    disabled={status === "loading"}
                    className="mt-6 w-full text-center text-sm font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-60 sm:mt-8 sm:text-base"
                  >
                    Back
                  </button>
                ) : (
                  <Link
                    href="/"
                    className="mt-6 block w-full text-center text-sm font-medium text-muted-foreground transition hover:text-foreground sm:mt-8 sm:text-base"
                  >
                    Back
                  </Link>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {status === "error" && message && phase !== "email" && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: APPLE_EASE }}
              className="mt-5 rounded-2xl bg-muted/80 px-4 py-2.5 text-center text-sm leading-snug text-muted-foreground ring-1 ring-border"
            >
              {message}
            </motion.p>
          )}

          {status === "loading" && (
            <p className="mt-5 flex items-center justify-center gap-2 text-center text-base text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Joining…
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

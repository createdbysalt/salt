"use client";

import { type FormEvent, useRef, useState, startTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, Loader2 } from "lucide-react";
import { Button, Input, Label } from "@repo/ui";
import { cn } from "@repo/utils";
import { saveWaitlistLeadAction } from "@/app/_features/marketing/actions";
import { getWaitlistEmailValidationMessage } from "@/app/_features/marketing/waitlist-qualification";
import { Landing2Container } from "@/app/_features/marketing/landing2/Landing2Container";
import type { ResolvedCalculatorForm } from "@/app/_features/marketing/calculator/calculator-form-config";
import { CalculatorResultsView } from "./CalculatorResultsView";
import {
  calculateMoneyOnTheTable,
  type CalculatorResult,
  type CalculatorSegment,
} from "./money-on-the-table-math";

const SALT_BRAND_GRADIENT =
  "linear-gradient(100deg, #00949E 0%, #00614A 45%, #7BA829 75%, #F3A618 100%)";

const REVENUE_OPTIONS = [
  { value: 40000, label: "Under $50K" },
  { value: 75000, label: "$50K – $100K" },
  { value: 150000, label: "$100K – $200K" },
  { value: 250000, label: "$200K – $300K" },
  { value: 350000, label: "Over $300K" },
] as const;

const SEGMENT_OPTIONS: { value: CalculatorSegment; label: string }[] = [
  { value: "creative", label: "Creative services (design, photo, video, copy)" },
  { value: "coach", label: "Coaching" },
  { value: "consultant", label: "Consulting" },
  { value: "realestate", label: "Real estate" },
  { value: "advisor", label: "Financial advising / accounting" },
  { value: "wellness", label: "Therapy & wellness" },
  { value: "wedding", label: "Wedding & events" },
  { value: "other", label: "Other professional service" },
];

const SPEED_OPTIONS = [
  { value: 0.05, label: "Within the hour", id: "speed-1" },
  { value: 0.15, label: "Same day", id: "speed-2" },
  { value: 0.25, label: "1–2 days", id: "speed-3" },
  { value: 0.4, label: "3+ days", id: "speed-4" },
] as const;

const HB_TIER_OPTIONS = [
  { value: 36, label: "Starter ($36/mo)" },
  { value: 59, label: "Essentials ($59/mo)" },
  { value: 129, label: "Premium ($129/mo)" },
] as const;

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;
const GATE_MIN_LOADING_MS = 900;

const landing2EyebrowClass =
  "inline-flex items-center gap-1.5 rounded-full border border-foreground/12 bg-foreground/[0.04] px-3 py-1 text-xs font-medium text-foreground/65 sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-sm sm:text-foreground/70";

type FormPhase = "editing" | "submitting" | "results";

type CalculatorFormValues = {
  segment: CalculatorSegment | "";
  revenue: string;
  inquiries: string;
  dealValue: string;
  lossRate: number | null;
  ghosted: string;
  adminHours: string;
  honeybook: boolean;
  hbTier: number;
  hbBookings: string;
  hbBookingValue: string;
  email: string;
};

function parseRequiredNumber(
  value: string,
  label: string,
  min: number,
  max: number
): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: `${label} is required.` };
  }

  const num = Number(trimmed);
  if (Number.isNaN(num)) {
    return { ok: false, error: `Enter a valid number for ${label.toLowerCase()}.` };
  }

  if (num < min || num > max) {
    return { ok: false, error: `${label} must be between ${min.toLocaleString("en-US")} and ${max.toLocaleString("en-US")}.` };
  }

  return { ok: true, value: num };
}

function validateCalculatorForm(values: CalculatorFormValues): string | null {
  if (!values.segment) {
    return "Select what kind of work you do.";
  }

  if (!values.revenue.trim()) {
    return "Select your annual revenue.";
  }

  const revenue = Number(values.revenue);
  if (Number.isNaN(revenue)) {
    return "Select your annual revenue.";
  }

  const inquiries = parseRequiredNumber(values.inquiries, "New inquiries per month", 0, 500);
  if (!inquiries.ok) return inquiries.error;

  const dealValue = parseRequiredNumber(
    values.dealValue,
    "Average value of a new client",
    1,
    1_000_000
  );
  if (!dealValue.ok) return dealValue.error;

  if (values.lossRate === null) {
    return "Choose how fast you usually reply to a new inquiry.";
  }

  const ghosted = parseRequiredNumber(
    values.ghosted,
    "Unanswered proposals or quotes",
    0,
    200
  );
  if (!ghosted.ok) return ghosted.error;

  const adminHours = parseRequiredNumber(values.adminHours, "Admin hours per week", 0, 80);
  if (!adminHours.ok) return adminHours.error;

  if (values.honeybook) {
    const hbBookings = parseRequiredNumber(values.hbBookings, "HoneyBook bookings per year", 1, 1000);
    if (!hbBookings.ok) return hbBookings.error;

    const hbBookingValue = parseRequiredNumber(
      values.hbBookingValue,
      "Average HoneyBook booking value",
      1,
      1_000_000
    );
    if (!hbBookingValue.ok) return hbBookingValue.error;
  }

  return getWaitlistEmailValidationMessage(values.email);
}

const fieldSelectClass =
  "h-11 w-full appearance-none rounded-xl border border-foreground/12 bg-muted/30 px-4 pr-10 text-[15px] text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

const fieldNumberClass =
  "h-11 rounded-xl border-foreground/12 bg-muted/30 px-4 text-[15px]";

function QuestionNumber({ children }: { children: string }) {
  return (
    <span className="mb-1 block font-mono text-xs tracking-wider text-[#00949E]">
      {children}
    </span>
  );
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[16px] border border-foreground/8 bg-card px-4 pt-5 pb-8 shadow-[var(--shadow-card)] sm:rounded-[20px] sm:px-6 sm:pt-6 sm:pb-10 md:px-9 md:pt-9 md:pb-12">
      {children}
    </div>
  );
}

function PillOption({
  id,
  name,
  value,
  label,
  checked,
  onChange,
}: {
  id: string;
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <span>
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <Label
        htmlFor={id}
        className={cn(
          "inline-flex cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:py-2 sm:text-sm",
          checked
            ? "border-foreground bg-foreground text-background"
            : "border-foreground/12 bg-muted/20 text-muted-foreground hover:border-foreground/25 hover:text-foreground"
        )}
      >
        {label}
      </Label>
    </span>
  );
}

export function MoneyOnTheTableCalculator({
  form,
}: {
  form: ResolvedCalculatorForm;
}) {
  const [segment, setSegment] = useState<CalculatorSegment | "">("");
  const [revenue, setRevenue] = useState("");
  const [inquiries, setInquiries] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [lossRate, setLossRate] = useState<number | null>(null);
  const [ghosted, setGhosted] = useState("");
  const [adminHours, setAdminHours] = useState("");
  const [honeybook, setHoneybook] = useState(false);
  const [hbTier, setHbTier] = useState(59);
  const [hbBookings, setHbBookings] = useState("");
  const [hbBookingValue, setHbBookingValue] = useState("");
  const [email, setEmail] = useState("");
  const [formPhase, setFormPhase] = useState<FormPhase>("editing");
  const [formError, setFormError] = useState<string | null>(null);
  const [alreadyOnWaitlist, setAlreadyOnWaitlist] = useState(false);
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const resultsRef = useRef<HTMLElement>(null);

  function captureSubmitAnalytics() {
    if (typeof window === "undefined") return;
    const posthog = (window as Window & { posthog?: { capture: (e: string, p?: object) => void } })
      .posthog;
    if (posthog) {
      posthog.capture("calculator_gate_submit", { segment });
    }
    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
    if (gtag) {
      gtag("event", "calculator_gate_submit");
    }
  }

  function captureCompletedAnalytics(next: CalculatorResult) {
    if (typeof window === "undefined") return;
    const posthog = (window as Window & { posthog?: { capture: (e: string, p?: object) => void } })
      .posthog;
    if (posthog) {
      posthog.capture("calculator_completed", {
        total_mid: Math.round(next.total),
        segment,
        honeybook,
      });
    }
    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
    if (gtag) {
      gtag("event", "calculator_completed", { value: Math.round(next.total) });
    }
  }

  function handleCalculateAndSubmit(e?: FormEvent) {
    e?.preventDefault();

    const validationMessage = validateCalculatorForm({
      segment,
      revenue,
      inquiries,
      dealValue,
      lossRate,
      ghosted,
      adminHours,
      honeybook,
      hbTier,
      hbBookings,
      hbBookingValue,
      email,
    });

    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    const inquiriesNum = Number(inquiries.trim());
    const dealValueNum = Number(dealValue.trim());
    const ghostedNum = Number(ghosted.trim());
    const adminHoursNum = Number(adminHours.trim());
    const revenueNum = Number(revenue);
    const hbBookingsNum = Number(hbBookings.trim());
    const hbBookingValueNum = Number(hbBookingValue.trim());

    setFormError(null);
    setFormPhase("submitting");

    const next = calculateMoneyOnTheTable({
      segment: segment as CalculatorSegment,
      revenue: revenueNum,
      inquiries: inquiriesNum,
      dealValue: dealValueNum,
      lossRate: lossRate as number,
      ghosted: ghostedNum,
      adminHours: adminHoursNum,
      honeybook,
      hbTier,
      hbBookings: honeybook ? hbBookingsNum : 0,
      hbBookingValue: honeybook ? hbBookingValueNum : 0,
    });
    setResult(next);
    captureCompletedAnalytics(next);

    const normalized = email.trim().toLowerCase();
    const startedAt = Date.now();

    startTransition(() => {
      void (async () => {
        const response = await saveWaitlistLeadAction({
          email: normalized,
          source: form.waitlistSource,
          status: "complete",
          lastStep: "calculator",
        });

        const elapsed = Date.now() - startedAt;
        if (elapsed < GATE_MIN_LOADING_MS) {
          await new Promise((resolve) =>
            setTimeout(resolve, GATE_MIN_LOADING_MS - elapsed)
          );
        }

        if (!response.success) {
          setFormPhase("editing");
          setFormError(response.error);
          return;
        }

        captureSubmitAnalytics();
        setAlreadyOnWaitlist(Boolean(response.alreadyJoined));
        setFormPhase("results");

        window.setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      })();
    });
  }

  const resultsVisible = Boolean(result && formPhase === "results");
  const showCalculatorForm = formPhase === "editing" || formPhase === "submitting";

  return (
    <Landing2Container
      columnClassName="max-w-[720px] min-w-0"
      className="pb-20 sm:pb-32 lg:pb-40"
    >
      {/* Hero — hidden once results replace the form */}
      <AnimatePresence initial={false}>
        {showCalculatorForm ? (
          <motion.header
            key="calculator-hero"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: APPLE_EASE }}
            className="pb-6 pt-10 text-center sm:pb-8 sm:pt-16 md:pt-20"
          >
            <div className="flex justify-center px-1">
              <span className={landing2EyebrowClass}>
                <span className="size-1.5 shrink-0 rounded-full bg-sky" aria-hidden />
                <span className="text-balance">{form.eyebrow}</span>
              </span>
            </div>

            <h1 className="font-display mt-6 whitespace-pre-line text-balance px-1 text-[1.75rem] leading-[1.14] tracking-[-0.03em] sm:mt-7 sm:px-0 sm:text-[2.75rem] lg:text-[3.25rem] lg:leading-[1.12]">
              {form.heading}
            </h1>

            <p className="mx-auto mt-3 max-w-[34ch] px-1 text-[14px] leading-relaxed text-muted-foreground sm:mt-4 sm:max-w-[540px] sm:px-0 sm:text-[17px]">
              {form.subheading}
            </p>
          </motion.header>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showCalculatorForm ? (
          <motion.div
            key="calculator-form-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: APPLE_EASE }}
          >
            <FormCard>
              <AnimatePresence mode="wait">
                {formPhase === "editing" ? (
            <motion.form
              key="calculator-form"
              noValidate
              onSubmit={handleCalculateAndSubmit}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: APPLE_EASE }}
            >
              <div className="space-y-6 sm:space-y-7">
          <div>
            <QuestionNumber>01</QuestionNumber>
            <Label htmlFor="segment" className="font-display text-[15.5px] font-semibold">
              What kind of work do you do?
            </Label>
            <div className="relative mt-2.5">
              <select
                id="segment"
                required
                value={segment}
                onChange={(e) => {
                  setSegment(e.target.value as CalculatorSegment | "");
                  if (formError) setFormError(null);
                }}
                className={fieldSelectClass}
              >
                <option value="" disabled>
                  Select your line of work
                </option>
                {SEGMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
            </div>
          </div>

          <div>
            <QuestionNumber>02</QuestionNumber>
            <Label htmlFor="revenue" className="font-display text-[15.5px] font-semibold">
              Roughly, your annual revenue
            </Label>
            <div className="relative mt-2.5">
              <select
                id="revenue"
                required
                value={revenue}
                onChange={(e) => {
                  setRevenue(e.target.value);
                  if (formError) setFormError(null);
                }}
                className={fieldSelectClass}
              >
                <option value="" disabled>
                  Select your annual revenue
                </option>
                {REVENUE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <QuestionNumber>03</QuestionNumber>
              <Label htmlFor="inquiries" className="font-display text-[15.5px] font-semibold">
                New inquiries per month
              </Label>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Leads, referrals, DMs, contact-form fills
              </p>
              <Input
                id="inquiries"
                type="number"
                inputMode="numeric"
                min={0}
                max={500}
                required
                placeholder="e.g. 6"
                value={inquiries}
                onChange={(e) => {
                  setInquiries(e.target.value);
                  if (formError) setFormError(null);
                }}
                className={cn("mt-2.5", fieldNumberClass)}
              />
            </div>
            <div>
              <QuestionNumber>04</QuestionNumber>
              <Label htmlFor="dealValue" className="font-display text-[15.5px] font-semibold">
                Average value of a new client
              </Label>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Typical project or engagement, in dollars
              </p>
              <Input
                id="dealValue"
                type="number"
                inputMode="numeric"
                min={1}
                max={1000000}
                required
                placeholder="e.g. 3000"
                value={dealValue}
                onChange={(e) => {
                  setDealValue(e.target.value);
                  if (formError) setFormError(null);
                }}
                className={cn("mt-2.5", fieldNumberClass)}
              />
            </div>
          </div>

          <div>
            <QuestionNumber>05</QuestionNumber>
            <p id="speed-label" className="font-display text-[15.5px] font-semibold">
              How fast do you usually reply to a new inquiry?
            </p>
            <div
              role="radiogroup"
              aria-labelledby="speed-label"
              aria-required="true"
              className="mt-3 flex flex-wrap gap-2"
            >
              {SPEED_OPTIONS.map((opt) => (
                <PillOption
                  key={opt.id}
                  id={opt.id}
                  name="speed"
                  value={String(opt.value)}
                  label={opt.label}
                  checked={lossRate === opt.value}
                  onChange={() => {
                    setLossRate(opt.value);
                    if (formError) setFormError(null);
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <QuestionNumber>06</QuestionNumber>
            <Label htmlFor="ghosted" className="font-display text-[15.5px] font-semibold">
              In the last 3 months, how many proposals or quotes got no answer at
              all?
            </Label>
            <Input
              id="ghosted"
              type="number"
              inputMode="numeric"
              min={0}
              max={200}
              required
              placeholder="e.g. 2"
              value={ghosted}
              onChange={(e) => {
                setGhosted(e.target.value);
                if (formError) setFormError(null);
              }}
              className={cn("mt-2.5", fieldNumberClass)}
            />
          </div>

          <div>
            <QuestionNumber>07</QuestionNumber>
            <Label htmlFor="adminHours" className="font-display text-[15.5px] font-semibold">
              Hours per week on admin
            </Label>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Inbox, scheduling, follow-ups, invoicing, chasing payments,
              updating tools
            </p>
            <Input
              id="adminHours"
              type="number"
              inputMode="numeric"
              min={0}
              max={80}
              required
              placeholder="e.g. 10"
              value={adminHours}
              onChange={(e) => {
                setAdminHours(e.target.value);
                if (formError) setFormError(null);
              }}
              className={cn("mt-2.5", fieldNumberClass)}
            />
          </div>

          <div>
            <QuestionNumber>08 · OPTIONAL</QuestionNumber>
            <p className="font-display text-[15.5px] font-semibold">
              Do you run your business on HoneyBook?
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              If yes, we&apos;ll also show what your HoneyBook setup really costs
              per year
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <PillOption
                id="hb-no"
                name="hb"
                value="no"
                label="No"
                checked={!honeybook}
                onChange={() => {
                  setHoneybook(false);
                  if (formError) setFormError(null);
                }}
              />
              <PillOption
                id="hb-yes"
                name="hb"
                value="yes"
                label="Yes"
                checked={honeybook}
                onChange={() => {
                  setHoneybook(true);
                  if (formError) setFormError(null);
                }}
              />
            </div>
          </div>

          {honeybook ? (
            <div className="space-y-4 rounded-2xl border border-foreground/8 bg-muted/20 p-4 sm:p-5">
              <div>
                <Label htmlFor="hbTier" className="font-display text-[15.5px] font-semibold">
                  Your HoneyBook plan
                </Label>
                <div className="relative mt-2.5">
                  <select
                    id="hbTier"
                    required
                    value={hbTier}
                    onChange={(e) => {
                      setHbTier(Number(e.target.value));
                      if (formError) setFormError(null);
                    }}
                    className={fieldSelectClass}
                  >
                    {HB_TIER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="hbBookings" className="font-display text-[15.5px] font-semibold">
                    Bookings per year
                  </Label>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Clients you collect payment from through HoneyBook
                  </p>
                  <Input
                    id="hbBookings"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={1000}
                    required
                    placeholder="e.g. 25"
                    value={hbBookings}
                    onChange={(e) => {
                      setHbBookings(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    className={cn("mt-2.5", fieldNumberClass)}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="hbBookingValue"
                    className="font-display text-[15.5px] font-semibold"
                  >
                    Average booking value
                  </Label>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Total collected per booking, in dollars
                  </p>
                  <Input
                    id="hbBookingValue"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={1000000}
                    required
                    placeholder="e.g. 4000"
                    value={hbBookingValue}
                    onChange={(e) => {
                      setHbBookingValue(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    className={cn("mt-2.5", fieldNumberClass)}
                  />
                </div>
              </div>
            </div>
          ) : null}
              </div>

              <div className="mt-6 border-t border-foreground/8 pt-6 sm:mt-7 sm:pt-7">
                <Label htmlFor="calc-email" className="font-display text-[15.5px] font-semibold">
                  Your work email
                </Label>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  Adds you to the Salt waitlist if you&apos;re not on it yet. No
                  spam, no fabricated promises.
                </p>
                <Input
                  id="calc-email"
                  type="email"
                  placeholder="you@business.com"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  aria-invalid={formError ? true : undefined}
                  className={cn("mt-2.5", fieldNumberClass)}
                />
                {formError ? (
                  <p role="alert" className="mt-2 text-sm text-destructive">
                    {formError}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                size="lg"
                className="relative z-[2] mt-6 h-11 w-full rounded-full border-0 surface-aurora bg-transparent text-[15px] font-semibold text-white shadow-[var(--shadow-lift)] hover:bg-transparent hover:opacity-90 sm:mt-8 sm:h-12 sm:text-base"
              >
                {form.submitLabel}
                <ArrowRight className="size-4" strokeWidth={2.5} />
              </Button>
            </motion.form>
          ) : null}

          {formPhase === "submitting" ? (
            <motion.div
              key="calculator-loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: APPLE_EASE }}
              className="flex min-h-[280px] flex-col items-center justify-center py-8 text-center"
            >
              <div className="relative flex size-14 items-center justify-center">
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full surface-aurora opacity-25 animate-pulse-glow"
                />
                <span className="relative flex size-14 items-center justify-center rounded-full border border-foreground/10 bg-muted/40">
                  <Loader2
                    className="size-6 animate-spin text-[#00614A]"
                    strokeWidth={2.25}
                  />
                </span>
              </div>
              <p className="font-display mt-6 text-xl font-semibold tracking-[-0.02em]">
                Crunching your number…
              </p>
              <p className="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed text-muted-foreground">
                One moment while we run the estimate.
              </p>
            </motion.div>
          ) : null}
              </AnimatePresence>
            </FormCard>
          </motion.div>
        ) : null}

        {resultsVisible && result ? (
          <motion.section
            key="calculator-results"
            ref={resultsRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.55, ease: APPLE_EASE }}
            className="pb-6 pt-8 sm:pb-8 sm:pt-12 md:pt-16"
          >
            <CalculatorResultsView
              result={result}
              alreadyOnWaitlist={alreadyOnWaitlist}
            />
        </motion.section>
        ) : null}
      </AnimatePresence>
    </Landing2Container>
  );
}

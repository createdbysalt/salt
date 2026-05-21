"use client";

import * as React from "react";
import { ArrowRight, Sparkles, RotateCw } from "lucide-react";
import { cn } from "@repo/utils";

// Salt brand color for AI indicator
const AI_COLOR = "#4e58fc"; // Blue accent

const TIERS = [
  {
    name: "Instant",
    ms: 100,
    css: "duration-100",
    use: "Hover, focus, button press",
    css_easing: "cubic-bezier(0.2, 0, 0, 1)",
  },
  {
    name: "Quick",
    ms: 150,
    css: "duration-150",
    use: "State change, color shift",
    css_easing: "cubic-bezier(0.2, 0, 0, 1)",
  },
  {
    name: "Standard",
    ms: 300,
    css: "duration-300",
    use: "Layout shift, panel slide, modal",
    css_easing: "cubic-bezier(0.2, 0, 0, 1)",
  },
  {
    name: "Marketing",
    ms: 600,
    css: "duration-[600ms]",
    use: "Marketing scroll moments only",
    css_easing: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
];

export function MotionSection() {
  const [seed, setSeed] = React.useState(0);
  const replay = () => setSeed((s) => s + 1);

  return (
    <div className="space-y-16">
      <header className="flex items-start justify-between gap-6">
        <div>
          <p className="salt-eyebrow mb-3">Motion</p>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Subtle by default. Opinionated only when narrative demands it.
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Three product tiers — 100ms, 150ms, 300ms — all on Linear's
            ease-out curve. Marketing earns longer durations and more
            expressive easings. Never bouncy, never elastic, never anticipating.
          </p>
        </div>
        <button
          onClick={replay}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <RotateCw className="size-3" />
          Replay
        </button>
      </header>

      <section>
        <p className="salt-eyebrow mb-3">Duration tiers</p>
        <h2 className="text-base font-semibold tracking-tight mb-4">
          Four tiers. Linear ease-out everywhere in product.
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TIERS.map((d) => (
            <div
              key={d.name}
              className="border border-border bg-card p-4"
            >
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-[13px] font-semibold">{d.name}</p>
                <p className="salt-mono text-[11px] text-muted-foreground">
                  {d.ms}ms
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug mb-4">
                {d.use}
              </p>
              <div className="relative h-6 bg-muted rounded-[2px] overflow-hidden">
                <div
                  key={seed}
                  className={cn(
                    "absolute inset-y-0 left-0 animate-in slide-in-from-left fill-mode-both",
                    d.css
                  )}
                  style={{
                    backgroundColor: AI_COLOR,
                    width: "100%",
                    animationTimingFunction: d.css_easing,
                  }}
                />
              </div>
              <p className="salt-mono text-[10px] text-muted-foreground mt-2 truncate">
                {d.css_easing}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="salt-eyebrow mb-3">Entrance patterns</p>
        <h2 className="text-base font-semibold tracking-tight mb-4">
          Four patterns. Picked for what's appearing, not for variety.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <MotionDemo
            seed={seed}
            label="Fade + slide from bottom"
            use="Insight cards, FAB panels"
            previewClassName="animate-in fade-in slide-in-from-bottom-3 duration-300"
          />
          <MotionDemo
            seed={seed}
            label="Fade + slide from right"
            use="Notification stack"
            previewClassName="animate-in fade-in slide-in-from-right-4 duration-300"
          />
          <MotionDemo
            seed={seed}
            label="Fade only"
            use="Tab content, mode swap"
            previewClassName="animate-in fade-in duration-150"
          />
          <MotionDemo
            seed={seed}
            label="Stagger"
            use="Lists, routing reveals"
            previewClassName="animate-in fade-in slide-in-from-left-2 duration-300"
            stagger
          />
        </div>
      </section>

      <section>
        <p className="salt-eyebrow mb-3">AI signal · gradient glow</p>
        <h2 className="text-base font-semibold tracking-tight mb-1">
          Reserved for active AI processing.
        </h2>
        <p className="text-[13px] text-muted-foreground mb-5 max-w-xl leading-relaxed">
          The only ambient motion in the product. A rotating gradient using Salt's
          brand colors signals "AI is working" — distinct from generic loading spinners.
          Inspired by Apple Intelligence's glow, Linear's purposeful integration, and
          Claude's minimal focus.
        </p>
        <div className="space-y-4">
          <AIThinkingIndicator
            status="Drafting check-in"
            phase="2 of 3"
          />
          <AIThinkingIndicator
            status="Analyzing connections"
            variant="inline"
          />
          <AIThinkingIndicator
            variant="minimal"
          />
        </div>
        <div className="mt-5 bg-muted/50 border border-border p-4">
          <p className="salt-eyebrow mb-2">Implementation notes</p>
          <ul className="text-[12px] text-muted-foreground space-y-1.5 leading-relaxed">
            <li>• Uses CSS <code className="salt-mono text-[11px] bg-muted px-1 py-0.5 rounded">@property</code> for animating gradient angle</li>
            <li>• Single color (blue #4e58fc) with transparency for minimal look</li>
            <li>• Respects <code className="salt-mono text-[11px] bg-muted px-1 py-0.5 rounded">prefers-reduced-motion</code> with simple pulse fallback</li>
            <li>• Three variants: card (default), inline, minimal</li>
          </ul>
        </div>
      </section>

      <section>
        <p className="salt-eyebrow mb-3">Hard rules</p>
        <div className="border border-border bg-card p-5 space-y-2.5 text-[13px]">
          <Rule
            label="Never"
            body="Bouncy, elastic, anticipating, or overshoot easings in product."
          />
          <Rule
            label="Never"
            body="Ambient motion on the page (parallax, drifting backgrounds, looping pulses) outside of the one AI thinking surface."
          />
          <Rule
            label="Always"
            body="Reduce motion when prefers-reduced-motion is set."
          />
          <Rule
            label="Always"
            body="Use the cubic-bezier(0.2, 0, 0, 1) easing for product. Marketing can use cubic-bezier(0.16, 1, 0.3, 1) for confident scroll-linked moments."
          />
        </div>
      </section>
    </div>
  );
}

function MotionDemo({
  seed,
  label,
  use,
  previewClassName,
  stagger,
}: {
  seed: number;
  label: string;
  use: string;
  previewClassName: string;
  stagger?: boolean;
}) {
  return (
    <div className="border border-border bg-card p-4">
      <p className="text-[13px] font-semibold mb-0.5">{label}</p>
      <p className="text-[11px] text-muted-foreground mb-4">{use}</p>
      <div key={seed} className="flex flex-col gap-1.5 min-h-[60px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={
              stagger
                ? {
                    animationDelay: `${i * 80}ms`,
                    animationFillMode: "both",
                  }
                : undefined
            }
            className={cn(
              "h-3 rounded-[2px] bg-foreground/10",
              previewClassName,
              i === 0 && "w-3/4",
              i === 1 && "w-1/2",
              i === 2 && "w-2/3"
            )}
          />
        ))}
      </div>
    </div>
  );
}

function Rule({ label, body }: { label: string; body: string }) {
  const isNever = label === "Never";
  return (
    <div className="flex items-baseline gap-3">
      <span
        className="salt-eyebrow shrink-0 w-14"
        style={{ color: isNever ? "#E94B6B" : "#3FA960" }}
      >
        {label}
      </span>
      <span className="text-foreground/80 leading-relaxed">{body}</span>
    </div>
  );
}

function AIThinkingIndicator({
  status,
  phase,
  variant = "card",
}: {
  status?: string;
  phase?: string;
  variant?: "card" | "inline" | "minimal";
}) {
  if (variant === "minimal") {
    return (
      <div className="flex items-center gap-2">
        <div className="relative size-5">
          <div
            className="absolute inset-0 rounded-full ai-gradient-glow"
            style={{ padding: "1.5px" }}
          >
            <div className="size-full rounded-full bg-card" />
          </div>
        </div>
        <span className="text-[12px] text-muted-foreground">Processing...</span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-border bg-card">
        <div className="relative size-4">
          <div
            className="absolute inset-0 rounded-full ai-gradient-glow"
            style={{ padding: "1px" }}
          >
            <div className="size-full rounded-full bg-card flex items-center justify-center">
              <Sparkles className="size-2" style={{ color: AI_COLOR }} />
            </div>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {status || "Salt is thinking..."}
        </span>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card p-5 flex items-center gap-3">
      <div className="relative shrink-0">
        <div
          className="relative size-10 rounded-full ai-gradient-glow"
          style={{ padding: "2px" }}
        >
          <div className="size-full rounded-full bg-card flex items-center justify-center">
            <Sparkles className="size-4" style={{ color: AI_COLOR }} />
          </div>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-[14px] font-medium">Salt is thinking…</p>
        {(status || phase) && (
          <p className="text-[11px] text-muted-foreground salt-mono uppercase tracking-wider">
            {status}{phase && ` · ${phase}`}
          </p>
        )}
      </div>
      <ArrowRight className="size-3.5 text-muted-foreground" />
    </div>
  );
}

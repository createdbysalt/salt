"use client";

import { cn } from "@repo/utils";

const SPACING = [
  { name: "1", value: "4px", className: "w-1", use: "Tight inline" },
  { name: "2", value: "8px", className: "w-2", use: "Default gap" },
  { name: "3", value: "12px", className: "w-3", use: "Compact card padding" },
  { name: "4", value: "16px", className: "w-4", use: "Card padding" },
  { name: "6", value: "24px", className: "w-6", use: "Section internal" },
  { name: "8", value: "32px", className: "w-8", use: "Section padding" },
  { name: "12", value: "48px", className: "w-12", use: "Page section gap" },
  { name: "16", value: "64px", className: "w-16", use: "Marketing section gap" },
  { name: "24", value: "96px", className: "w-24", use: "Marketing hero padding" },
];

const RADII = [
  { name: "none", value: "0px", className: "", use: "Default — sharp, editorial" },
  { name: "sm", value: "2px", className: "rounded-sm", use: "Subtle softening" },
  { name: "full", value: "9999px", className: "rounded-full", use: "Avatars, dots, icon buttons" },
];

const SHADOWS = [
  { name: "none", className: "", use: "Default — borders carry the weight" },
  { name: "xs", className: "shadow-xs", use: "Input focus" },
  { name: "sm", className: "shadow-sm", use: "Dropdowns, popovers" },
  { name: "md", className: "shadow-md", use: "Floating insight cards" },
  { name: "lg", className: "shadow-lg", use: "Modals only" },
];

export function TokensSection() {
  return (
    <div className="space-y-16">
      <header>
        <p className="salt-eyebrow mb-3">Tokens</p>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Generous spacing. Small radii. Almost no shadow.
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          The structural language of restraint. Borders carry the weight,
          shadows are an exception, radii stay small enough to read editorial
          rather than friendly. Marketing breathes at 2-3× the product's
          density.
        </p>
      </header>

      <section>
        <p className="salt-eyebrow mb-3">Spacing</p>
        <h2 className="text-base font-semibold tracking-tight mb-1">
          4px base scale.
        </h2>
        <p className="text-[13px] text-muted-foreground mb-5 max-w-xl leading-relaxed">
          Marketing site uses 2-3× the product's spacing. Product earns
          density by being functional; marketing earns confidence by being
          airy.
        </p>
        <div className="border border-border bg-card p-5 space-y-2.5">
          {SPACING.map((s) => (
            <div key={s.name} className="flex items-center gap-4">
              <span className="salt-mono w-8 text-[11px] text-muted-foreground shrink-0">
                {s.name}
              </span>
              <div
                className={cn(
                  "h-2 bg-foreground rounded-[2px] shrink-0",
                  s.className
                )}
              />
              <span className="salt-mono text-[11px] text-muted-foreground w-12 shrink-0">
                {s.value}
              </span>
              <span className="text-[12px] text-foreground/70">{s.use}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="salt-eyebrow mb-3">Border radius</p>
        <h2 className="text-base font-semibold tracking-tight mb-1">
          Sharp. Zero radius by default.
        </h2>
        <p className="text-[13px] text-muted-foreground mb-5 max-w-xl leading-relaxed">
          Sharp corners signal editorial confidence.{" "}
          <code className="salt-mono">rounded-full</code> is reserved for
          avatars, status dots, and icon buttons. Everything else is sharp.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {RADII.map((r) => (
            <div
              key={r.name}
              className="border border-border bg-card p-4"
            >
              <div
                className={cn(
                  "h-12 w-full mb-3",
                  r.className
                )}
                style={{ backgroundColor: "#c1f8ae" }}
              />
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <span className="text-[13px] font-medium salt-mono">
                  {r.name}
                </span>
                <span className="text-[11px] salt-mono text-muted-foreground">
                  {r.value}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {r.use}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="salt-eyebrow mb-3">Shadows</p>
        <h2 className="text-base font-semibold tracking-tight mb-1">
          Almost never. Borders carry the weight.
        </h2>
        <p className="text-[13px] text-muted-foreground mb-5 max-w-xl leading-relaxed">
          Default to no shadow. Use a 1px <code className="salt-mono">border</code>{" "}
          instead. Shadows show up only for floating surfaces (popovers,
          insight cards, modals) — they signal "this is detached from the
          page."
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {SHADOWS.map((s) => (
            <div key={s.name} className="text-center">
              <div
                className={cn(
                  "h-14 w-full bg-card border border-border mb-2",
                  s.className
                )}
              />
              <p className="text-[12px] font-medium salt-mono mb-0.5">
                {s.name}
              </p>
              <p className="text-[10px] text-muted-foreground leading-snug px-1">
                {s.use}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="salt-eyebrow mb-3">Marketing vs product · the gap</p>
        <h2 className="text-base font-semibold tracking-tight mb-4">
          Same tokens. Different dialect.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border border-border bg-card p-6">
            <p className="salt-eyebrow mb-3">Marketing</p>
            <p className="text-[14px] font-medium mb-3">Generous, editorial.</p>
            <ul className="text-[12px] text-muted-foreground leading-relaxed space-y-1.5">
              <li>Section gaps · 64-96px</li>
              <li>Card padding · 32-48px</li>
              <li>Cream BG throughout</li>
              <li>Mono at display sizes</li>
              <li>One blue accent per fold</li>
            </ul>
          </div>
          <div className="border border-border bg-card p-6">
            <p className="salt-eyebrow mb-3">Product</p>
            <p className="text-[14px] font-medium mb-3">Dense, functional.</p>
            <ul className="text-[12px] text-muted-foreground leading-relaxed space-y-1.5">
              <li>Section gaps · 32-48px</li>
              <li>Card padding · 16-24px</li>
              <li>White cards on cream BG</li>
              <li>Sans for all headings</li>
              <li>Blue reserved for primary CTAs and AI</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

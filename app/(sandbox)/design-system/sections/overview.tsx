"use client";

import { ArrowUpRight, BookOpen } from "lucide-react";

/**
 * Overview — the at-a-glance brief for the SALT v2 direction.
 *
 * Mirrors docs/plans/design-system-direction.md. When that doc changes,
 * update this file (or vice versa) so the sandbox always reflects the
 * current source of truth.
 */
export function OverviewSection() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <header className="max-w-2xl">
        <p className="salt-eyebrow mb-4">SALT Design System · v2</p>
        <h1 className="salt-display-md mb-3">
          Ramp restraint. Warm palette. Operator density.
        </h1>
        <p className="text-[15px] text-muted-foreground leading-relaxed">
          The look and feel of a confident agency tool — not a consumer app,
          not an engineering ticket tracker. Built for agency owners who
          recognize craft and won't tolerate noise. Type and whitespace lead;
          color earns its appearances.
        </p>
        <div className="mt-5 flex items-center gap-2">
          <a
            href="/docs/plans/design-system-direction.md"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground hover:underline transition-colors"
          >
            <BookOpen className="size-3.5" />
            Read the full direction doc
            <ArrowUpRight className="size-3" />
          </a>
        </div>
      </header>

      {/* Reference brands */}
      <section>
        <p className="salt-eyebrow mb-3">Reference brands</p>
        <h2 className="text-lg font-semibold tracking-tight mb-1">
          Ramp restraint with an Apollo warmth.
        </h2>
        <p className="text-sm text-muted-foreground mb-5 max-w-xl">
          When in doubt, ask:{" "}
          <span className="text-foreground font-medium">
            "Would Ramp ship this if their accent was warm?"
          </span>{" "}
          If no, reconsider.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ReferenceCard
            rank="01"
            name="Ramp"
            role="Primary · restraint"
            steal="Mono-at-display headlines · cream backgrounds · color-as-supporting · generous whitespace · section pacing · GT America / Geist Sans pairing"
            reject="Their specific cobalt-green accent · finance illustrations"
          />
          <ReferenceCard
            rank="02"
            name="Apollo"
            role="Palette source"
            steal="Bold-but-warm accent (yellow) · zone tints (when called for) · agency-creative energy"
            reject="Multi-zone tile compositions in product · over-saturated decoration"
          />
          <ReferenceCard
            rank="03"
            name="Linear"
            role="Product density"
            steal="Motion tiers (100/150/300ms) · keyboard hints · sidebar hierarchy · tab patterns"
            reject="Engineering-coded marketing · pure dark default · cool purple accent"
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed max-w-xl">
          Explicitly rejected as primary references:{" "}
          <span className="font-medium text-foreground">Notion</span>{" "}
          (too consumer-friendly),{" "}
          <span className="font-medium text-foreground">Obsidian</span>{" "}
          (wrong audience),{" "}
          <span className="font-medium text-foreground">Figma</span>{" "}
          (too designer-coded for the operator audience).
        </p>
      </section>

      {/* Principles */}
      <section>
        <p className="salt-eyebrow mb-3">Brand principles</p>
        <h2 className="text-lg font-semibold tracking-tight mb-5">
          Five rules for judgment calls.
        </h2>
        <div className="space-y-px overflow-hidden border border-border">
          <Principle
            n="01"
            title="Type and whitespace lead"
            body="Color is supporting cast. Most of the canvas is cream and ink. Saturated moments earn their appearances."
          />
          <Principle
            n="02"
            title="Mono earns trust"
            body="Numbers, metadata, hotkeys, status, eyebrows — always Geist Mono. Marketing display headlines use mono too (the Ramp move)."
          />
          <Principle
            n="03"
            title="One anchor, clear relationships"
            body="Blue #4e58fc is the primary CTA and AI color. Relationship colors — mint, purple, orange, stone — identify entity types without collision."
          />
          <Principle
            n="04"
            title="Density when it earns"
            body="A dashboard can be dense. A marketing hero cannot."
          />
          <Principle
            n="05"
            title="Motion is invisible until it isn't"
            body="Subtle by default (100/150/300ms). Opinionated only when narrative requires it — and only on marketing."
          />
        </div>
      </section>

      {/* What lives here */}
      <section>
        <p className="salt-eyebrow mb-3">Sandbox map</p>
        <h2 className="text-lg font-semibold tracking-tight mb-5">
          What lives in each tab.
        </h2>
        <div className="divide-y divide-border border border-border bg-card">
          <Row label="Colors" detail="Cream surfaces · blue accent · vibrant relationship palette" />
          <Row label="Typography" detail="Geist Sans body · Geist Mono accents · type scale" />
          <Row label="Tokens" detail="Spacing · radius (small) · shadow (almost none)" />
          <Row label="Motion" detail="100 / 150 / 300ms tiers — Linear-style" />
          <Row label="Components" detail="Buttons · cards · pills · hotkey hints · eyebrows" />
          <Row label="Insight Cards" detail="Floating AI notification surface" />
          <Row label="Patterns" detail="Composed surfaces — nav, tabs, filter chips" />
        </div>
      </section>

      {/* Open decisions */}
      <section>
        <p className="salt-eyebrow mb-3">Open decisions</p>
        <h2 className="text-lg font-semibold tracking-tight mb-5">
          Deferred. Revisit after sandbox prototype lands.
        </h2>
        <div className="space-y-3">
          <OpenDecision
            question="Marketing display font"
            current="Geist Sans heavy"
            alternates="Tiempos Headline · Editorial New (serif)"
            note="Defer until marketing hero ships."
          />
          <OpenDecision
            question="Brand accent stress-test"
            current="Blue #4e58fc"
            alternates="—"
            note="Locked. Blue serves as primary CTA and AI indicator."
          />
          <OpenDecision
            question="Design system name"
            current="—"
            alternates="Salt System · Lattice · Halite · Crystal · Grain"
            note="Pick when promoting tokens to product."
          />
          <OpenDecision
            question="Dark mode for marketing"
            current="Light only"
            alternates="Add dark · keep light-only"
            note="Decide after sandbox feels right."
          />
        </div>
      </section>
    </div>
  );
}

function ReferenceCard({
  rank,
  name,
  role,
  steal,
  reject,
}: {
  rank: string;
  name: string;
  role: string;
  steal: string;
  reject: string;
}) {
  return (
    <div className="border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <p className="salt-mono text-[11px] text-muted-foreground">{rank}</p>
        <p className="salt-eyebrow">{role}</p>
      </div>
      <p className="text-xl font-semibold tracking-tight">{name}</p>
      <div className="space-y-2 mt-auto">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Steal
          </p>
          <p className="text-[12px] leading-relaxed">{steal}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Reject
          </p>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            {reject}
          </p>
        </div>
      </div>
    </div>
  );
}

function Principle({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-baseline gap-5 bg-card px-4 py-3.5">
      <p className="salt-mono text-[11px] text-muted-foreground w-6 shrink-0">
        {n}
      </p>
      <div className="flex-1">
        <p className="text-sm font-semibold mb-0.5">{title}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {body}
        </p>
      </div>
    </div>
  );
}

function Row({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-baseline gap-4 px-4 py-3 text-[13px]">
      <span className="font-medium w-32 shrink-0">{label}</span>
      <span className="text-muted-foreground leading-relaxed">{detail}</span>
    </div>
  );
}

function OpenDecision({
  question,
  current,
  alternates,
  note,
}: {
  question: string;
  current: string;
  alternates: string;
  note: string;
}) {
  return (
    <div className="border border-border bg-card px-4 py-3.5">
      <p className="text-sm font-medium mb-1.5">{question}</p>
      <div className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1 text-[12px]">
        <span className="text-muted-foreground">Current</span>
        <span className="salt-mono">{current}</span>
        <span className="text-muted-foreground">Options</span>
        <span className="text-foreground/80">{alternates}</span>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 italic">{note}</p>
    </div>
  );
}

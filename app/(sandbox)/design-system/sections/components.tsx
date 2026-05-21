"use client";

import * as React from "react";
import { Sparkles, ArrowRight, Mail, Plus, Check, Zap } from "lucide-react";
import { Avatar, AvatarFallback } from "@repo/ui";
import { cn } from "@repo/utils";

const AI_COLOR = "#4e58fc";

/**
 * Components — built from raw primitives so the simplified pastel palette
 * shows through directly. When tokens promote out of the sandbox,
 * these should map to @repo/ui variants.
 */
export function ComponentsSection() {
  return (
    <div className="space-y-16">
      <header>
        <p className="salt-eyebrow mb-3">Components</p>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          The primitives. Mint anchor. Ramp restraint.
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          One mint CTA per surface. Status as relationship-colored dots. Cards lean on
          borders, not shadows. Sharp edges. Density when it earns, never when it doesn't.
        </p>
      </header>

      <Group
        eyebrow="Buttons · hierarchy"
        title="Primary takes the spotlight. Everything else recedes."
      >
        <div className="space-y-5">
          <Row label="Primary">
            <button
              className="px-4 py-2 text-[13px] font-normal text-white hover:opacity-90 transition-colors duration-100"
              style={{ backgroundColor: AI_COLOR }}
            >
              Take action
            </button>
            <button
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-normal text-white hover:opacity-90 transition-colors duration-100"
              style={{ backgroundColor: AI_COLOR }}
            >
              <ArrowRight className="size-3.5" />
              Continue
            </button>
          </Row>
          <Row label="Secondary">
            <button className="rounded-sm border border-border bg-card px-4 py-2 text-[13px] font-normal text-foreground hover:bg-muted transition-colors duration-100">
              Cancel
            </button>
            <button className="rounded-sm border border-border bg-card px-4 py-2 text-[13px] font-normal text-foreground hover:bg-muted transition-colors duration-100">
              Edit draft
            </button>
          </Row>
          <Row label="Ghost">
            <button className="rounded-sm px-3 py-1.5 text-[13px] font-normal text-foreground/70 hover:bg-muted hover:text-foreground transition-colors duration-100">
              Dismiss
            </button>
            <button className="inline-flex items-center gap-1 rounded-sm px-3 py-1.5 text-[13px] font-normal text-foreground/70 hover:text-foreground transition-colors">
              See how it works
              <ArrowRight className="size-3" />
            </button>
          </Row>
          <Row label="Destructive">
            <button className="rounded-sm bg-[#C2410C] px-4 py-2 text-[13px] font-normal text-white hover:bg-[#9A330A] transition-colors duration-100">
              Delete contact
            </button>
          </Row>
          <Row label="Icon">
            <button className="flex items-center justify-center size-8 rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors">
              <Plus className="size-3.5" />
            </button>
            <button
              className="flex items-center justify-center size-8 rounded-full text-white hover:opacity-90 transition-colors"
              style={{ backgroundColor: AI_COLOR }}
            >
              <ArrowRight className="size-3.5" />
            </button>
          </Row>
        </div>
      </Group>

      <Group
        eyebrow="AI buttons · rotating gradient"
        title="AI-powered actions get the rotating border."
        description="When Salt does the work — capture, actions, drafts — the button earns the animated gradient ring. Same visual language as the AI thinking indicator."
      >
        <div className="space-y-6">
          <Row label="Capture">
            <AIButton>
              <Sparkles className="size-3.5" />
              Quick capture
            </AIButton>
          </Row>
          <Row label="Actions">
            <AIButton>
              <Zap className="size-3.5" />
              Draft reply
            </AIButton>
            <AIButton>
              <Zap className="size-3.5" />
              Generate summary
            </AIButton>
          </Row>
          <Row label="Icon">
            <AIButton icon>
              <Sparkles className="size-4" />
            </AIButton>
            <AIButton icon>
              <Zap className="size-4" />
            </AIButton>
          </Row>
          <Row label="Small">
            <AIButton size="sm">
              <Sparkles className="size-3" />
              Capture
            </AIButton>
            <AIButton size="sm">
              <Zap className="size-3" />
              Draft reply
            </AIButton>
            <AIButton size="sm">
              <Check className="size-3" />
              Approve
            </AIButton>
          </Row>
        </div>
        <div className="mt-6 bg-muted p-4 border border-border">
          <p className="salt-eyebrow mb-2">When to use AI buttons</p>
          <ul className="text-[13px] leading-relaxed space-y-1.5 text-foreground/80">
            <li>Quick capture (AI-assisted context extraction)</li>
            <li>AI actions — Draft reply, Generate summary</li>
            <li>Approve & send on AI action cards</li>
            <li>Any button where Salt does work autonomously</li>
          </ul>
        </div>
      </Group>

      <Group
        eyebrow="Status pills · relationship colors"
        title="Status is a dot, not a billboard."
        description="Color shows relationship type: mint = revenue, lavender = collab, peach = support, stone = internal. Solid = realized, outline = potential."
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill color="#c1f8ae" label="Client" />
          <StatusPill color="#c1f8ae" label="Prospect" outline />
          <StatusPill color="#b76dfb" label="Partner" />
          <StatusPill color="#ee794d" label="Vendor" />
          <StatusPill color="#cbcfd8" label="Team" />
          <StatusPill color="#cbcfd8" label="Past" outline />
        </div>
      </Group>

      <Group
        eyebrow="Entity chips · for filters"
        title="Relationship color, used to filter."
        description="Solid = realized relationship, outline = potential."
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <EntityChip color="#c1f8ae" label="Clients" count={12} />
          <EntityChip color="#c1f8ae" label="Prospects" count={8} outline />
          <EntityChip color="#b76dfb" label="Partners" count={4} />
          <EntityChip color="#ee794d" label="Vendors" count={2} />
          <EntityChip color="#cbcfd8" label="Team" count={6} />
        </div>
      </Group>

      <Group
        eyebrow="Avatars · initials on relationship tint"
        title="Initials over a pastel tint."
        description="Background is a soft tint of the relationship color. Text is dark for contrast. All in the same bright pastel family."
      >
        <div className="flex flex-wrap items-center gap-2">
          {[
            { name: "SC", color: "#c1f8ae" }, // client (revenue)
            { name: "MH", color: "#c1f8ae" }, // prospect (revenue)
            { name: "JP", color: "#b76dfb" }, // partner (collab)
            { name: "DK", color: "#ee794d" }, // vendor (support)
            { name: "Y", color: "#cbcfd8" }, // team (internal)
          ].map((a) => (
            <Avatar key={a.name} className="size-9">
              <AvatarFallback
                className="text-[11px] font-semibold"
                style={{
                  backgroundColor: a.color,
                  color: "#1C1917",
                }}
              >
                {a.name}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      </Group>

      <Group
        eyebrow="Input · borderless, focus is mint"
        title="Inputs sit on cream. Mint focus ring earns the eye."
      >
        <div className="space-y-3 max-w-md">
          <div>
            <label
              className="salt-eyebrow block mb-1.5"
              htmlFor="sample-input"
            >
              Client name
            </label>
            <input
              id="sample-input"
              type="text"
              placeholder="Acme Corp"
              className="w-full border border-border bg-card px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all duration-100"
            />
          </div>
          <div>
            <label
              className="salt-eyebrow block mb-1.5"
              htmlFor="sample-textarea"
            >
              Notes
            </label>
            <textarea
              id="sample-textarea"
              rows={3}
              placeholder="One sentence on why this matters..."
              className="w-full border border-border bg-card px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all duration-100 resize-none"
            />
          </div>
        </div>
      </Group>
    </div>
  );
}

function Group({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-5">
        <p className="salt-eyebrow mb-2">{eyebrow}</p>
        <h2 className="text-base font-semibold tracking-tight mb-1">{title}</h2>
        {description && (
          <p className="text-[13px] text-muted-foreground max-w-xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="border border-border bg-card p-6">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-[11px] salt-mono text-muted-foreground uppercase tracking-wider w-20 shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function StatusPill({
  color,
  label,
  outline = false,
}: {
  color: string;
  label: string;
  outline?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium bg-foreground/5 text-foreground border border-border salt-mono">
      <span
        className="size-1.5 rounded-full"
        style={
          outline
            ? { border: `1.5px solid ${color}`, backgroundColor: "transparent" }
            : { backgroundColor: color }
        }
      />
      {label}
    </span>
  );
}

function EntityChip({
  color,
  label,
  count,
  outline = false,
}: {
  color: string;
  label: string;
  count: number;
  outline?: boolean;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[12px] font-medium text-foreground border border-border bg-card hover:bg-muted transition-colors"
    >
      <span
        className="size-2 rounded-sm"
        style={
          outline
            ? { border: `1.5px solid ${color}`, backgroundColor: "transparent" }
            : { backgroundColor: color }
        }
      />
      {label}
      <span className="salt-mono text-[10px] text-muted-foreground ml-1">
        {count}
      </span>
    </button>
  );
}

function AIButton({
  children,
  icon = false,
  size = "default",
}: {
  children: React.ReactNode;
  icon?: boolean;
  size?: "default" | "sm";
}) {
  const sizeClasses = {
    default: icon ? "size-9" : "px-4 py-2 text-[13px]",
    sm: icon ? "size-7" : "px-3 py-1.5 text-[11px]",
  };

  return (
    <div className="relative">
      {/* Rotating gradient border — subtle variant for buttons */}
      <div
        className={cn(
          "absolute inset-0 ai-gradient-glow-subtle",
          icon ? "rounded-full" : "rounded-sm"
        )}
      />
      {/* Button content */}
      <button
        type="button"
        className={cn(
          "relative inline-flex items-center justify-center gap-1.5 font-normal bg-card transition-colors",
          icon ? "rounded-full" : "rounded-sm",
          sizeClasses[size]
        )}
        style={{
          color: AI_COLOR,
          margin: "1.5px",
        }}
      >
        {children}
      </button>
    </div>
  );
}


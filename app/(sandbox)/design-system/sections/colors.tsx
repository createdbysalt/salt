"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@repo/utils";

export function ColorsSection() {
  return (
    <div className="space-y-16">
      <header>
        <p className="salt-eyebrow mb-3">Colors · core palette</p>
        <h1 className="text-2xl font-semibold tracking-tight mb-3">
          Six colors. Clear purpose. No confusion.
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          Black for text, blue for action, and four relationship colors that
          map directly to how you work: green = revenue, purple = collab,
          orange = support, gray = internal.
        </p>
      </header>

      {/* The composition — type-led with accent */}
      <section>
        <p className="salt-eyebrow mb-3">The composition · in use</p>
        <h2 className="text-base font-semibold tracking-tight mb-4">
          What the system feels like at rest.
        </h2>
        <div className="border border-border bg-card">
          <div className="px-10 py-12">
            <p className="salt-eyebrow mb-6">Salt · for agency owners</p>
            <p
              className="tracking-tighter leading-[0.95] mb-8 text-foreground"
              style={{
                fontFamily: "var(--salt-font-sans)",
                fontSize: "56px",
                letterSpacing: "-0.03em",
                fontWeight: 500,
              }}
            >
              The agency,
              <br />
              <span className="relative inline-block">
                <span
                  className="absolute left-0 right-1 bottom-1 h-3"
                  style={{ backgroundColor: "#c1f8ae", zIndex: 0 }}
                  aria-hidden
                />
                <span className="relative">smarter</span>
              </span>
              .
            </p>
            <p className="text-[14px] text-muted-foreground max-w-md leading-relaxed mb-8">
              One graph, every relationship, all the context. Built for the
              ten-person studios that don't have time for the wrong tool.
            </p>
            <div className="flex items-center gap-3">
              <button
                className="px-4 py-2 text-[13px] font-medium transition-colors duration-100"
                style={{ backgroundColor: "#2a2928", color: "#ffffff" }}
              >
                Get early access
              </button>
              <button className="text-[13px] font-medium text-foreground/70 hover:text-foreground transition-colors">
                See how it works →
              </button>
            </div>
          </div>
          <div className="border-t border-border px-10 py-5 flex items-center gap-4 flex-wrap">
            <span className="salt-eyebrow shrink-0">Relationships</span>
            <StatusPill color="#c1f8ae" label="Client" />
            <StatusPill color="#c1f8ae" label="Prospect" outline />
            <StatusPill color="#b76dfb" label="Partner" />
            <StatusPill color="#ee794d" label="Vendor" />
            <StatusPill color="#cbcfd8" label="Team" />
          </div>
        </div>
      </section>

      <PaletteGroup
        eyebrow="Core · black + blue accent"
        title="The foundation."
        description="Black for text and primary buttons. Blue for accent and interactive highlights. These two anchor the entire system."
        swatches={[
          { name: "black", token: "bg-[#2a2928]", label: "Black", hex: "#2a2928" },
          { name: "black-hover", token: "bg-[#1a1918]", label: "Black (hover)", hex: "#1a1918" },
          { name: "black-muted", token: "bg-[#5c5856]", label: "Black (muted)", hex: "#5c5856" },
          { name: "blue", token: "bg-[#4e58fc]", label: "Blue", hex: "#4e58fc" },
          { name: "blue-hover", token: "bg-[#3d47eb]", label: "Blue (hover)", hex: "#3d47eb" },
          { name: "blue-tint", token: "bg-[#e8e9fe]", label: "Blue (tint)", hex: "#e8e9fe" },
        ]}
      />

      <PaletteGroup
        eyebrow="Relationship colors · the graph palette"
        title="Four colors. One per relationship type."
        description="Green = revenue. Purple = collab. Orange = support. Gray = internal. Main colors are fixed — tints and hovers derive from them."
        swatches={[
          { name: "green", token: "bg-[#c1f8ae]", label: "Green", hex: "#c1f8ae" },
          { name: "green-hover", token: "bg-[#a8e894]", label: "Green (hover)", hex: "#a8e894" },
          { name: "green-tint", token: "bg-[#eafde4]", label: "Green (tint)", hex: "#eafde4" },
          { name: "purple", token: "bg-[#b76dfb]", label: "Purple", hex: "#b76dfb" },
          { name: "purple-hover", token: "bg-[#a254ea]", label: "Purple (hover)", hex: "#a254ea" },
          { name: "purple-tint", token: "bg-[#f3e8fe]", label: "Purple (tint)", hex: "#f3e8fe" },
          { name: "orange", token: "bg-[#ee794d]", label: "Orange", hex: "#ee794d" },
          { name: "orange-hover", token: "bg-[#dc6438]", label: "Orange (hover)", hex: "#dc6438" },
          { name: "orange-tint", token: "bg-[#fde8e0]", label: "Orange (tint)", hex: "#fde8e0" },
          { name: "gray", token: "bg-[#cbcfd8]", label: "Gray", hex: "#cbcfd8" },
          { name: "gray-hover", token: "bg-[#b8bcc5]", label: "Gray (hover)", hex: "#b8bcc5" },
          { name: "gray-tint", token: "bg-[#f0f1f3]", label: "Gray (tint)", hex: "#f0f1f3" },
        ]}
      />

      <PaletteGroup
        eyebrow="Semantic · status meanings"
        title="Distinct from relationship colors."
        description="Semantic colors communicate system state. Warning uses yellow (not orange) to avoid confusion with vendor color."
        swatches={[
          { name: "success", token: "bg-[#3FA960]", label: "Success", hex: "#3FA960" },
          { name: "success-tint", token: "bg-[#d4f1dd]", label: "Success (tint)", hex: "#d4f1dd" },
          { name: "warning", token: "bg-[#f59e0b]", label: "Warning", hex: "#f59e0b" },
          { name: "warning-tint", token: "bg-[#fef3c7]", label: "Warning (tint)", hex: "#fef3c7" },
          { name: "danger", token: "bg-[#E94B6B]", label: "Danger", hex: "#E94B6B" },
          { name: "danger-tint", token: "bg-[#fbd9dd]", label: "Danger (tint)", hex: "#fbd9dd" },
          { name: "info", token: "bg-[#4e58fc]", label: "Info (uses blue)", hex: "#4e58fc" },
          { name: "info-tint", token: "bg-[#e8e9fe]", label: "Info (tint)", hex: "#e8e9fe" },
        ]}
      />

      {/* Graph shape system */}
      <section>
        <p className="salt-eyebrow mb-3">Graph shapes · four dimensions</p>
        <h2 className="text-base font-semibold tracking-tight mb-2">
          Shape. Color. Fill. Size.
        </h2>
        <p className="text-[13px] text-muted-foreground max-w-xl leading-relaxed mb-6">
          Four visual dimensions — no legend needed. Glance at the graph and
          instantly know what matters, who it is, how it's doing, and how much it weighs.
        </p>

        {/* Dimension legend grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Shape */}
          <div className="border border-border bg-card p-4">
            <p className="text-[11px] text-muted-foreground mb-3 salt-mono uppercase tracking-wider">
              Shape = What
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <ShapeLegendItem shape="circle" label="People" />
              <ShapeLegendItem shape="square" label="Orgs" />
              <ShapeLegendItem shape="diamond" label="Work" />
              <ShapeLegendItem shape="hexagon" label="Self" />
            </div>
          </div>

          {/* Fill */}
          <div className="border border-border bg-card p-4">
            <p className="text-[11px] text-muted-foreground mb-3 salt-mono uppercase tracking-wider">
              Fill = Status
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <FillStateLegendItem state="solid" label="Active" />
              <FillStateLegendItem state="outline" label="Past/Potential" />
              <FillStateLegendItem state="ring" label="Attention" />
            </div>
          </div>

          {/* Color */}
          <div className="border border-border bg-card p-4">
            <p className="text-[11px] text-muted-foreground mb-3 salt-mono uppercase tracking-wider">
              Color = Relationship
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <ColorLegendItem color="#c1f8ae" label="Revenue" />
              <ColorLegendItem color="#b76dfb" label="Collab" />
              <ColorLegendItem color="#ee794d" label="Support" />
              <ColorLegendItem color="#cbcfd8" label="Internal" />
            </div>
          </div>

          {/* Size */}
          <div className="border border-border bg-card p-4">
            <p className="text-[11px] text-muted-foreground mb-3 salt-mono uppercase tracking-wider">
              Size = Weight
            </p>
            <div className="flex items-end gap-3">
              <div className="flex flex-col items-center gap-1">
                <GraphShape shape="circle" color="#c1f8ae" state="solid" size={16} />
                <span className="text-[9px] text-muted-foreground salt-mono">Low</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <GraphShape shape="circle" color="#c1f8ae" state="solid" size={24} />
                <span className="text-[9px] text-muted-foreground salt-mono">Med</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <GraphShape shape="circle" color="#c1f8ae" state="solid" size={36} />
                <span className="text-[9px] text-muted-foreground salt-mono">High</span>
              </div>
              <p className="text-[10px] text-muted-foreground ml-2 leading-snug">
                Big = matters more.<br />One universal truth.
              </p>
            </div>
          </div>
        </div>

        {/* Connections preview */}
        <div className="border border-border bg-card p-6">
          <p className="text-[11px] text-muted-foreground mb-4 salt-mono uppercase tracking-wider">
            Your connections at a glance
          </p>
          <div className="relative h-48 flex items-center justify-center">
            {/* Self at center */}
            <div className="absolute" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
              <GraphShape shape="hexagon" color="#cbcfd8" state="solid" size={40} />
            </div>

            {/* Big client org (revenue) */}
            <div className="absolute" style={{ top: "15%", left: "20%" }}>
              <GraphShape shape="square" color="#c1f8ae" state="solid" size={32} />
            </div>

            {/* Client contact (revenue, high weight) */}
            <div className="absolute" style={{ top: "28%", left: "38%" }}>
              <GraphShape shape="circle" color="#c1f8ae" state="solid" size={28} />
            </div>

            {/* Active project (revenue work) */}
            <div className="absolute" style={{ top: "25%", left: "62%" }}>
              <GraphShape shape="diamond" color="#c1f8ae" state="solid" size={26} />
            </div>

            {/* Prospect org (revenue, outline = potential) */}
            <div className="absolute" style={{ top: "18%", left: "78%" }}>
              <GraphShape shape="square" color="#c1f8ae" state="outline" size={22} />
            </div>

            {/* At-risk project */}
            <div className="absolute" style={{ top: "62%", left: "22%" }}>
              <GraphShape shape="diamond" color="#c1f8ae" state="ring" size={20} />
            </div>

            {/* Partner contact (collab) */}
            <div className="absolute" style={{ top: "68%", left: "42%" }}>
              <GraphShape shape="circle" color="#b76dfb" state="solid" size={22} />
            </div>

            {/* Small prospect contact (revenue, outline) */}
            <div className="absolute" style={{ top: "70%", left: "58%" }}>
              <GraphShape shape="circle" color="#c1f8ae" state="outline" size={14} />
            </div>

            {/* Vendor org (support) */}
            <div className="absolute" style={{ top: "72%", left: "75%" }}>
              <GraphShape shape="square" color="#ee794d" state="solid" size={18} />
            </div>

            {/* Past contact (outline) */}
            <div className="absolute" style={{ top: "42%", left: "12%" }}>
              <GraphShape shape="circle" color="#cbcfd8" state="outline" size={16} />
            </div>

            {/* Team member (internal) */}
            <div className="absolute" style={{ top: "35%", left: "82%" }}>
              <GraphShape shape="circle" color="#cbcfd8" state="solid" size={18} />
            </div>

            {/* Completed work (outline) */}
            <div className="absolute" style={{ top: "58%", left: "88%" }}>
              <GraphShape shape="diamond" color="#cbcfd8" state="outline" size={14} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-4 italic">
            Green = revenue. Purple = collab. Orange = support. Gray = internal.
          </p>
        </div>
      </section>

      {/* Connection proof */}
      <section>
        <p className="salt-eyebrow mb-3">The connection · proof</p>
        <h2 className="text-base font-semibold tracking-tight mb-4">
          Same palette. Different jobs.
        </h2>
        <div className="border border-border bg-card p-6">
          <div className="space-y-4">
            <Row label="CTA">
              <button
                className="px-4 py-2 text-[13px] font-medium transition-colors"
                style={{ backgroundColor: "#2a2928", color: "#ffffff" }}
              >
                Take action
              </button>
              <button className="border border-border bg-card px-4 py-2 text-[13px] font-medium text-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
            </Row>

            <div className="h-px bg-border" />

            <Row label="Status">
              <StatusPill color="#c1f8ae" label="Client" />
              <StatusPill color="#c1f8ae" label="Prospect" outline />
              <StatusPill color="#b76dfb" label="Partner" />
              <StatusPill color="#ee794d" label="Vendor" />
              <StatusPill color="#cbcfd8" label="Team" />
            </Row>

            <div className="h-px bg-border" />

            <Row label="Entities">
              <EntityChip color="#c1f8ae" label="Clients" />
              <EntityChip color="#c1f8ae" label="Prospects" outline />
              <EntityChip color="#b76dfb" label="Partners" />
              <EntityChip color="#ee794d" label="Vendors" />
              <EntityChip color="#cbcfd8" label="Team" />
            </Row>

            <div className="h-px bg-border" />

            <Row label="Graph">
              <div className="flex items-center gap-1.5">
                <GraphNode color="#c1f8ae" size={22} />
                <span className="text-[10px] text-muted-foreground salt-mono">
                  →
                </span>
                <GraphNode color="#b76dfb" size={18} />
                <span className="text-[10px] text-muted-foreground salt-mono">
                  →
                </span>
                <GraphNode color="#ee794d" size={16} />
                <span className="text-[10px] text-muted-foreground salt-mono">
                  →
                </span>
                <GraphNode color="#cbcfd8" size={14} />
              </div>
              <span className="text-[11px] text-muted-foreground italic ml-2">
                One palette, coherent system.
              </span>
            </Row>
          </div>
        </div>
      </section>
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
  outline = false,
}: {
  color: string;
  label: string;
  outline?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-foreground border border-border bg-card salt-mono">
      <span
        className="size-2"
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

function GraphNode({ color, size }: { color: string; size: number }) {
  return (
    <span
      className="rounded-full ring-2 ring-card"
      style={{
        backgroundColor: color,
        width: `${size}px`,
        height: `${size}px`,
      }}
    />
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
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-[11px] text-muted-foreground w-20 shrink-0">
        {label}
      </span>
      {children}
    </div>
  );
}

function PaletteGroup({
  eyebrow,
  title,
  description,
  swatches,
}: {
  eyebrow: string;
  title: string;
  description: string;
  swatches: Array<{
    name: string;
    token: string;
    label: string;
    hex?: string;
  }>;
}) {
  return (
    <section>
      <div className="mb-4">
        <p className="salt-eyebrow mb-2">{eyebrow}</p>
        <h2 className="text-base font-semibold tracking-tight mb-1">{title}</h2>
        <p className="text-[13px] text-muted-foreground max-w-xl leading-relaxed">
          {description}
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {swatches.map((s) => (
          <Swatch key={s.name} {...s} />
        ))}
      </div>
    </section>
  );
}

function Swatch({
  name,
  token,
  label,
  hex,
}: {
  name: string;
  token: string;
  label: string;
  hex?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const copyText = hex ?? token;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "group text-left border border-border bg-card overflow-hidden",
        "hover:border-foreground/25 transition-colors duration-100"
      )}
    >
      <div className={cn("h-14 w-full border-b border-border", token)} />
      <div className="px-3 py-2">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-[12px] font-medium truncate">{label}</span>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">
            {copied ? (
              <Check className="size-3" style={{ color: "#3FA960" }} />
            ) : (
              <Copy className="size-3" />
            )}
          </span>
        </div>
        <code className="salt-mono text-[10px] text-muted-foreground truncate block">
          {hex ?? name}
        </code>
      </div>
    </button>
  );
}

function ShapeLegendItem({
  shape,
  label,
}: {
  shape: "circle" | "square" | "diamond" | "hexagon";
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <GraphShape shape={shape} color="#2a2928" state="solid" size={20} />
      <p className="text-[11px] font-medium">{label}</p>
    </div>
  );
}

function FillStateLegendItem({
  state,
  label,
}: {
  state: "solid" | "outline" | "ring";
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <GraphShape shape="circle" color="#2a2928" state={state} size={20} />
      <p className="text-[11px] font-medium">{label}</p>
    </div>
  );
}

function ColorLegendItem({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="size-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <p className="text-[10px] font-medium salt-mono">{label}</p>
    </div>
  );
}

function GraphShape({
  shape,
  color,
  state,
  size,
}: {
  shape: "circle" | "square" | "diamond" | "hexagon";
  color: string;
  state: "solid" | "outline" | "ring";
  size: number;
}) {
  const isSolid = state === "solid";
  const isOutline = state === "outline";
  const isRing = state === "ring";

  // Full color with glow and white outline for depth
  const glowShadow = `0 0 ${size * 0.4}px ${color}60, 0 0 ${size * 0.2}px ${color}40`;
  const whiteOutline = `0 0 0 1.5px rgba(255,255,255,0.9)`;

  const baseStyles: React.CSSProperties = {
    width: size,
    height: size,
    backgroundColor: isSolid ? color : "transparent",
    border: isOutline ? `2px solid ${color}80` : "none",
    boxShadow: isSolid
      ? `${whiteOutline}, ${glowShadow}`
      : isRing
        ? `${whiteOutline}, 0 0 0 4px ${color}40, ${glowShadow}`
        : isOutline
          ? `${whiteOutline}, 0 0 ${size * 0.3}px ${color}30`
          : undefined,
  };

  if (shape === "circle") {
    return (
      <span
        className="inline-block rounded-full shrink-0"
        style={{
          ...baseStyles,
          backgroundColor: isSolid ? color : isRing ? color : "transparent",
        }}
      />
    );
  }

  if (shape === "square") {
    return (
      <span
        className="inline-block shrink-0 rounded-sm"
        style={{
          ...baseStyles,
          backgroundColor: isSolid ? color : isRing ? color : "transparent",
        }}
      />
    );
  }

  if (shape === "diamond") {
    return (
      <span
        className="inline-block shrink-0"
        style={{
          width: size,
          height: size,
          position: "relative",
        }}
      >
        <span
          style={{
            position: "absolute",
            width: size * 0.7,
            height: size * 0.7,
            backgroundColor: isSolid ? color : isRing ? color : "transparent",
            border: isOutline ? `2px solid ${color}80` : "none",
            boxShadow: isSolid
              ? `${whiteOutline}, ${glowShadow}`
              : isRing
                ? `${whiteOutline}, 0 0 0 4px ${color}40, ${glowShadow}`
                : isOutline
                  ? `${whiteOutline}, 0 0 ${size * 0.3}px ${color}30`
                  : undefined,
            transform: "rotate(45deg)",
            top: "50%",
            left: "50%",
            marginTop: -(size * 0.7) / 2,
            marginLeft: -(size * 0.7) / 2,
            borderRadius: 2,
          }}
        />
      </span>
    );
  }

  if (shape === "hexagon") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="shrink-0"
        style={{
          filter: isSolid
            ? `drop-shadow(0 0 ${size * 0.15}px ${color}60) drop-shadow(0 0 1px rgba(255,255,255,0.9))`
            : isRing
              ? `drop-shadow(0 0 4px ${color}60) drop-shadow(0 0 1px rgba(255,255,255,0.9))`
              : `drop-shadow(0 0 1px rgba(255,255,255,0.9))`,
        }}
      >
        <polygon
          points="12,2 22,7 22,17 12,22 2,17 2,7"
          fill={isSolid || isRing ? color : "none"}
          stroke={isOutline ? `${color}80` : "rgba(255,255,255,0.7)"}
          strokeWidth={isOutline ? 2 : 1.5}
        />
      </svg>
    );
  }

  return null;
}

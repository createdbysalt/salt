"use client";

import * as React from "react";
import {
  Home,
  Sparkles,
  Inbox,
  PenLine,
  Network,
  Users,
  Briefcase,
  Wallet,
  Layers,
  ChevronRight,
  Search,
  Plus,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@repo/ui";
import { cn } from "@repo/utils";

const AI_COLOR = "#4e58fc";

/**
 * Patterns showcase — composed surfaces from the demo.
 */
export function PatternsSection() {
  return (
    <div className="space-y-12">
      <header>
        <p className="salt-eyebrow mb-3">Patterns</p>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Composed surfaces — the recipes that make SALT feel like SALT.
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          These are the building blocks assembled into recognizable SALT surfaces.
          Each pattern combines typography, color, and interaction rules.
        </p>
      </header>

      <Section
        title="Workspace switcher + sidebar actions"
        description="Top of the sidebar — workspace identity + search + AI sparkles"
      >
        <div className="border border-border bg-card p-3">
          <div className="flex items-center gap-1 max-w-xs">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-2 py-1.5 hover:bg-muted/60 transition-colors"
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback
                  className="text-[10px] font-semibold"
                  style={{ backgroundColor: "#c1f8ae", color: "#1C1917" }}
                >
                  MA
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">My Agency</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground rotate-90" />
            </button>
            <div className="ml-auto flex items-center gap-1.5">
              <ActionIconButton>
                <Search className="size-3.5" />
              </ActionIconButton>
              <AIIconButton>
                <Sparkles className="size-3.5" />
              </AIIconButton>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Top section nav"
        description="HQ / Actions / Messages / Capture — the command center quartet"
      >
        <div className="border border-border bg-card p-2 max-w-xs space-y-0.5">
          <NavItem icon={Home} label="HQ" />
          <NavItem icon={Zap} label="Actions" badge={3} active />
          <NavItem icon={Inbox} label="Messages" dot />
          <NavItem icon={PenLine} label="Capture" />
        </div>
      </Section>

      <Section
        title="Collapsible group"
        description="Connections section — clickable parent + chevron toggle"
      >
        <div className="border border-border bg-card p-2 max-w-xs space-y-0.5">
          <div className="flex items-center hover:bg-muted/60 group">
            <button
              type="button"
              className="flex items-center gap-2 flex-1 px-2 py-1.5 text-sm font-medium"
            >
              <Network className="h-4 w-4 text-foreground/70" />
              Connections
            </button>
            <button
              type="button"
              className="flex items-center justify-center w-7 h-7 text-muted-foreground hover:bg-foreground/5"
            >
              <ChevronRight className="h-3.5 w-3.5 rotate-90" />
            </button>
          </div>
          <div className="ml-5 border-l border-border pl-2 py-0.5 space-y-0.5">
            <SubNavItem icon={Users} label="People" />
            <SubNavItem icon={Briefcase} label="Work" />
            <SubNavItem icon={Wallet} label="Payments" />
          </div>
        </div>
      </Section>

      <Section
        title="Page tabs"
        description="Underline tab pattern — used on People / Actions / Connections"
      >
        <div className="border border-border bg-card p-3">
          <div className="flex items-center gap-1 border-b border-border">
            <TabButton active>Worth Attention</TabButton>
            <TabButton>All</TabButton>
            <TabButton>Individuals</TabButton>
            <TabButton>Organizations</TabButton>
            <TabButton>Internal</TabButton>
          </div>
        </div>
      </Section>

      <Section
        title="Floating tool button"
        description="Compact pill button used as graph overlay (Filters, Insights toggle)"
      >
        <div className="border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <FloatingPill>
              <Layers className="size-3.5" />
              Filters
            </FloatingPill>
            <FloatingPill active>
              <Zap className="size-3.5" />
              6 insights
            </FloatingPill>
            <FloatingPill>
              <Plus className="size-3.5" />
              Add filter
            </FloatingPill>
          </div>
        </div>
      </Section>

      <Section
        title="Filter chip"
        description="Entity-type filter with type-colored dot — solid = realized, outline = potential"
      >
        <div className="border border-border bg-card p-3 flex flex-wrap gap-1.5">
          <StatusChip color="#c1f8ae">Clients</StatusChip>
          <StatusChip color="#c1f8ae" outline>Prospects</StatusChip>
          <StatusChip color="#b76dfb">Partners</StatusChip>
          <StatusChip color="#ee794d">Vendors</StatusChip>
          <StatusChip color="#cbcfd8">Team</StatusChip>
          <StatusChip color="#cbcfd8" outline>Past</StatusChip>
        </div>
      </Section>
    </div>
  );
}

// ============================================================================
// COMPONENT HELPERS
// ============================================================================

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-tight mb-1">{title}</h2>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ActionIconButton({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="flex items-center justify-center size-7 rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors"
    >
      {children}
    </button>
  );
}

function AIIconButton({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-full ai-gradient-glow-subtle" />
      <button
        type="button"
        className="relative flex items-center justify-center size-7 rounded-full bg-card transition-colors"
        style={{ color: AI_COLOR, margin: "1.5px" }}
      >
        {children}
      </button>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  badge,
  dot,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  dot?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer",
        active ? "bg-muted text-foreground" : "text-foreground/80 hover:bg-muted/60"
      )}
    >
      <Icon className="size-4 text-muted-foreground/70" />
      <span>{label}</span>
      {badge ? (
        <span
          className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold tabular-nums text-white"
          style={{ backgroundColor: AI_COLOR }}
        >
          {badge}
        </span>
      ) : null}
      {dot && <span className="ml-auto size-1.5 rounded-full" style={{ backgroundColor: AI_COLOR }} />}
    </div>
  );
}

function SubNavItem({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 text-sm text-foreground/70 hover:bg-muted/60 cursor-pointer">
      <Icon className="size-3.5 text-muted-foreground/70" />
      <span>{label}</span>
    </div>
  );
}

function TabButton({
  active,
  children,
}: {
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "relative px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-foreground" />
      )}
    </button>
  );
}

function FloatingPill({
  active,
  children,
}: {
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium",
        "border backdrop-blur transition-colors",
        active
          ? "text-white border-transparent"
          : "bg-card text-foreground hover:bg-muted border-border"
      )}
      style={active ? { backgroundColor: AI_COLOR } : undefined}
    >
      {children}
    </button>
  );
}

function StatusChip({
  color,
  outline = false,
  children,
}: {
  color: string;
  outline?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium bg-foreground/5 text-foreground border border-border salt-mono"
    >
      <span
        className="size-1.5 rounded-full"
        style={
          outline
            ? { border: `1.5px solid ${color}`, backgroundColor: "transparent" }
            : { backgroundColor: color }
        }
      />
      {children}
    </button>
  );
}

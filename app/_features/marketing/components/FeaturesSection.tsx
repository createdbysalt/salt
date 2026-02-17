"use client";

import { FadeUpBlur } from "@/app/_components/effects/fade-up-blur";
import { MockupFrame } from "./MockupFrame";

/**
 * Features section — each feature gets text + product mockup side by side.
 * Linear-style alternating layout for visual variety.
 */
export function FeaturesSection() {
  return (
    <section id="features" className="relative py-28 md:py-36">
      {/* Subtle top divider */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(255,255,255,0.06) 50%, transparent)",
        }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-5xl px-6">
        <FadeUpBlur>
          <h2 className="mx-auto max-w-2xl text-center text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-[#F7F8F8]">
            Everything your studio needs to win, run, and deliver.
          </h2>
        </FadeUpBlur>

        {/* Feature 1: Intelligence — text left, mockup right */}
        <FadeUpBlur delay={0.1} className="mt-20">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
            <div>
              <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-[rgb(100,105,114)]">
                Strategic Intelligence
              </span>
              <h3 className="mt-3 text-[clamp(1.25rem,3vw,1.75rem)] font-semibold leading-[1.2] tracking-[-0.01em] text-[#F7F8F8]">
                Win projects with data, not just designs
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[rgb(138,143,152)]">
                AI-powered competitive audits and market research delivered
                before the pitch meeting. Walk in with intelligence that
                justifies premium pricing.
              </p>
            </div>
            <IntelligenceMockup />
          </div>
        </FadeUpBlur>

        {/* Feature 2: Studio Management — mockup left, text right */}
        <FadeUpBlur delay={0.1} className="mt-24">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
            <div className="order-2 md:order-1">
              <StudioMockup />
            </div>
            <div className="order-1 md:order-2">
              <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-[rgb(100,105,114)]">
                Studio Operations
              </span>
              <h3 className="mt-3 text-[clamp(1.25rem,3vw,1.75rem)] font-semibold leading-[1.2] tracking-[-0.01em] text-[#F7F8F8]">
                One source of truth instead of seven tools
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[rgb(138,143,152)]">
                Projects, tasks, clients, invoices. Everything your studio
                needs in one place, designed by someone who actually runs a
                studio.
              </p>
            </div>
          </div>
        </FadeUpBlur>

        {/* Feature 3: Client Portal — text left, mockup right */}
        <FadeUpBlur delay={0.1} className="mt-24">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
            <div>
              <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-[rgb(100,105,114)]">
                Client Experience
              </span>
              <h3 className="mt-3 text-[clamp(1.25rem,3vw,1.75rem)] font-semibold leading-[1.2] tracking-[-0.01em] text-[#F7F8F8]">
                Look like a studio from day one
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[rgb(138,143,152)]">
                Professional client portal with your branding. Your clients
                see a polished studio experience — even if you're solo.
              </p>
            </div>
            <PortalMockup />
          </div>
        </FadeUpBlur>

      </div>
    </section>
  );
}

/** Competitive audit / intelligence mockup */
function IntelligenceMockup() {
  return (
    <MockupFrame>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <div className="text-[11px] text-white/30">Competitive Audit</div>
            <div className="mt-0.5 text-[13px] font-medium text-white/70">
              Wren & Partners — Brand Refresh
            </div>
          </div>
          <div className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] text-white/40">
            Generated 2m ago
          </div>
        </div>

        {/* Score cards */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <ScoreCard label="SEO Score" value="34" maxValue="/100" />
          <ScoreCard label="Performance" value="61" maxValue="/100" />
          <ScoreCard label="Accessibility" value="48" maxValue="/100" />
        </div>

        {/* Findings */}
        <div className="mt-4 space-y-2">
          <FindingRow
            severity="high"
            text="No mobile optimization — 63% of traffic is mobile"
          />
          <FindingRow
            severity="med"
            text="Missing structured data for local search"
          />
          <FindingRow
            severity="low"
            text="Image compression could reduce load by 2.3s"
          />
        </div>

        {/* Recommendation */}
        <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="text-[10px] font-medium uppercase tracking-wider text-white/30">
            Recommendation
          </div>
          <div className="mt-1 text-[12px] leading-relaxed text-white/50">
            Propose mobile-first redesign with performance optimization.
            Projected ROI: 40% increase in organic traffic within 90 days.
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

function ScoreCard({
  label,
  value,
  maxValue,
}: {
  label: string;
  value: string;
  maxValue: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-center">
      <div className="text-[10px] text-white/30">{label}</div>
      <div className="mt-1">
        <span className="text-[20px] font-semibold tabular-nums text-white/70">
          {value}
        </span>
        <span className="text-[11px] text-white/25">{maxValue}</span>
      </div>
    </div>
  );
}

function FindingRow({
  severity,
  text,
}: {
  severity: "high" | "med" | "low";
  text: string;
}) {
  const dotOpacity =
    severity === "high"
      ? "bg-white/60"
      : severity === "med"
        ? "bg-white/35"
        : "bg-white/15";

  return (
    <div className="flex items-start gap-2.5 rounded-md px-2 py-1.5">
      <span
        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotOpacity}`}
      />
      <span className="text-[12px] leading-relaxed text-white/50">{text}</span>
    </div>
  );
}

/** Studio management / unified dashboard mockup */
function StudioMockup() {
  return (
    <MockupFrame>
      <div className="p-4">
        {/* Mini tab bar */}
        <div className="flex gap-4 border-b border-white/[0.06] pb-2.5">
          <span className="border-b border-white/40 pb-2.5 text-[12px] font-medium text-white/60">
            Board
          </span>
          <span className="text-[12px] text-white/25">List</span>
          <span className="text-[12px] text-white/25">Timeline</span>
        </div>

        {/* Kanban columns */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <KanbanColumn
            title="To Do"
            count={3}
            items={[
              "Wireframes for homepage",
              "Content strategy doc",
              "Brand guidelines V2",
            ]}
          />
          <KanbanColumn
            title="In Progress"
            count={2}
            items={["Landing page build", "Logo explorations"]}
          />
          <KanbanColumn
            title="Review"
            count={1}
            items={["Social media kit"]}
          />
        </div>
      </div>
    </MockupFrame>
  );
}

function KanbanColumn({
  title,
  count,
  items,
}: {
  title: string;
  count: number;
  items: string[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium text-white/50">{title}</span>
        <span className="text-[10px] text-white/20">{count}</span>
      </div>
      <div className="mt-2 space-y-1.5">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-[11px] leading-snug text-white/50"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Client portal mockup */
function PortalMockup() {
  return (
    <MockupFrame>
      <div className="p-4">
        {/* Portal header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.08]">
              <span className="text-[10px] font-bold text-white/60">WP</span>
            </div>
            <div>
              <div className="text-[13px] font-medium text-white/70">
                Wren & Partners
              </div>
              <div className="text-[10px] text-white/30">Client Portal</div>
            </div>
          </div>
          <div className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] text-white/30">
            2 updates
          </div>
        </div>

        {/* Shared documents */}
        <div className="mt-5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-white/25">
            Shared Documents
          </div>
          <div className="mt-2 space-y-1.5">
            <DocRow name="Project Proposal" type="PDF" date="Feb 8" />
            <DocRow name="Brand Strategy Report" type="PDF" date="Feb 5" />
            <DocRow name="Competitive Audit" type="Report" date="Feb 3" />
          </div>
        </div>

        {/* Project status */}
        <div className="mt-5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-white/25">
            Project Status
          </div>
          <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-white/50">
                Brand Refresh — Phase 2
              </span>
              <span className="text-[11px] font-medium tabular-nums text-white/40">
                65%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-white/30"
                style={{ width: "65%" }}
              />
            </div>
            <div className="mt-2 flex gap-4 text-[10px] text-white/25">
              <span>Due Mar 15</span>
              <span>3 tasks remaining</span>
            </div>
          </div>
        </div>
      </div>
    </MockupFrame>
  );
}

function DocRow({
  name,
  type,
  date,
}: {
  name: string;
  type: string;
  date: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-white/[0.02]">
      <div className="flex items-center gap-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-white/[0.05] text-[8px] font-medium text-white/30">
          {type === "PDF" ? "PDF" : "RPT"}
        </div>
        <span className="text-[12px] text-white/50">{name}</span>
      </div>
      <span className="text-[10px] text-white/20">{date}</span>
    </div>
  );
}


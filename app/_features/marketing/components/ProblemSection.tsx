"use client";

import { FadeUpBlur } from "@/app/_components/effects/fade-up-blur";
import { GlassCard } from "@/app/_components/effects/glass-card";
import {
  StaggeredGrid,
  StaggeredGridItem,
} from "@/app/_components/effects/staggered-grid";

/**
 * Problem agitation section with visual illustrations in each card.
 * Each card has a large illustration area at the top showing the pain,
 * followed by a title and description. Monochrome throughout.
 */
export function ProblemSection() {
  return (
    <section className="relative py-28 md:py-36">
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
        {/* Section heading */}
        <FadeUpBlur>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-[#F7F8F8]">
              You design incredible client work.
              <br />
              <span className="text-[rgb(138,143,152)]">
                Then run your business from a spreadsheet.
              </span>
            </h2>
            <p className="mt-5 text-[16px] leading-relaxed text-[rgb(138,143,152)]">
              Your clients get polished deliverables. Your business gets Notion
              docs and hope.
            </p>
          </div>
        </FadeUpBlur>

        {/* Pain point cards with visual illustrations */}
        <StaggeredGrid className="mt-16 grid gap-4 sm:grid-cols-2">
          <StaggeredGridItem>
            <GlassCard className="group h-full">
              <DuctTapeIllustration />
              <div className="px-6 pb-6 sm:px-7 sm:pb-7">
                <h3 className="text-[15px] font-semibold text-[#F7F8F8]">
                  Duct tape stack
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[rgb(138,143,152)]">
                  Notion for CRM. Google Docs for proposals. Stripe for
                  invoices. 7 tools that don&apos;t talk to each other.
                </p>
              </div>
            </GlassCard>
          </StaggeredGridItem>

          <StaggeredGridItem>
            <GlassCard className="group h-full">
              <PricingIllustration />
              <div className="px-6 pb-6 sm:px-7 sm:pb-7">
                <h3 className="text-[15px] font-semibold text-[#F7F8F8]">
                  Pricing paralysis
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[rgb(138,143,152)]">
                  You know you should charge more. But the number that leaves
                  your mouth is always smaller than the one in your head.
                </p>
              </div>
            </GlassCard>
          </StaggeredGridItem>

          <StaggeredGridItem>
            <GlassCard className="group h-full">
              <IdentityIllustration />
              <div className="px-6 pb-6 sm:px-7 sm:pb-7">
                <h3 className="text-[15px] font-semibold text-[#F7F8F8]">
                  Identity confusion
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[rgb(138,143,152)]">
                  Designer? Developer? Business owner? You&apos;re switching
                  roles so fast you don&apos;t know which one you actually are.
                </p>
              </div>
            </GlassCard>
          </StaggeredGridItem>

          <StaggeredGridItem>
            <GlassCard className="group h-full">
              <FeastFamineIllustration />
              <div className="px-6 pb-6 sm:px-7 sm:pb-7">
                <h3 className="text-[15px] font-semibold text-[#F7F8F8]">
                  Feast&ndash;famine
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[rgb(138,143,152)]">
                  Pipeline full one month. Empty the next. That anxiety never
                  quite goes away.
                </p>
              </div>
            </GlassCard>
          </StaggeredGridItem>
        </StaggeredGrid>

        {/* Kicker */}
        <FadeUpBlur delay={0.2} className="mt-14">
          <p className="text-center text-[15px] font-medium leading-relaxed text-[rgb(180,185,192)]">
            The gap between your craft and your business is the gap between $3k
            projects and $10k partnerships.
          </p>
        </FadeUpBlur>
      </div>
    </section>
  );
}

/** Scattered tool tiles — shows the chaos of using 7 disconnected tools */
function DuctTapeIllustration() {
  const tools = [
    { name: "Notion", x: "8%", y: "12%", rotate: "-4deg" },
    { name: "Docs", x: "55%", y: "8%", rotate: "3deg" },
    { name: "Stripe", x: "30%", y: "45%", rotate: "-2deg" },
    { name: "Figma", x: "68%", y: "38%", rotate: "5deg" },
    { name: "Slack", x: "12%", y: "62%", rotate: "-6deg" },
    { name: "Sheets", x: "48%", y: "68%", rotate: "2deg" },
    { name: "Cal", x: "78%", y: "65%", rotate: "-3deg" },
  ];

  return (
    <div className="relative h-[140px] overflow-hidden border-b border-white/[0.06] px-6 pt-6 sm:px-7 sm:pt-7">
      {tools.map((tool) => (
        <div
          key={tool.name}
          className="absolute rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-medium text-white/35 transition-all duration-500 group-hover:border-white/[0.12] group-hover:text-white/45"
          style={{
            left: tool.x,
            top: tool.y,
            transform: `rotate(${tool.rotate})`,
          }}
        >
          {tool.name}
        </div>
      ))}
      {/* Dashed connection lines suggesting broken integrations */}
      <svg
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <line
          x1="22%"
          y1="28%"
          x2="42%"
          y2="55%"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <line
          x1="65%"
          y1="22%"
          x2="45%"
          y2="55%"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <line
          x1="25%"
          y1="72%"
          x2="58%"
          y2="78%"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
      </svg>
    </div>
  );
}

/** Fake proposal with a too-low price — shows underpricing visually */
function PricingIllustration() {
  return (
    <div className="h-[140px] overflow-hidden border-b border-white/[0.06] px-6 pt-5 sm:px-7">
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-medium uppercase tracking-wider text-white/25">
            Project Proposal
          </div>
          <div className="text-[10px] text-white/20">Draft</div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/40">
              Brand Strategy & Research
            </span>
            <span className="text-[11px] tabular-nums text-white/30 line-through decoration-white/15">
              $4,500
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/40">
              Website Design + Dev
            </span>
            <span className="text-[11px] tabular-nums text-white/30 line-through decoration-white/15">
              $8,000
            </span>
          </div>
          <div className="mt-2 border-t border-white/[0.06] pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-white/50">
                Total
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums text-white/20 line-through decoration-white/10">
                  $12,500
                </span>
                <span className="text-[14px] font-semibold tabular-nums text-white/60">
                  $4,800
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Overlapping role badges — shows identity crisis visually */
function IdentityIllustration() {
  const roles = [
    { label: "Designer", opacity: "text-white/50", x: "10%", y: "20%", rotate: "-6deg", border: "border-white/[0.12]" },
    { label: "Developer", opacity: "text-white/40", x: "35%", y: "35%", rotate: "3deg", border: "border-white/[0.09]" },
    { label: "Business Owner", opacity: "text-white/30", x: "15%", y: "55%", rotate: "-2deg", border: "border-white/[0.07]" },
    { label: "Account Manager", opacity: "text-white/20", x: "50%", y: "18%", rotate: "5deg", border: "border-white/[0.05]" },
    { label: "Bookkeeper", opacity: "text-white/15", x: "55%", y: "58%", rotate: "-4deg", border: "border-white/[0.04]" },
  ];

  return (
    <div className="relative h-[140px] overflow-hidden border-b border-white/[0.06] px-6 pt-6 sm:px-7 sm:pt-7">
      {roles.map((role) => (
        <div
          key={role.label}
          className={`absolute rounded-full border ${role.border} bg-white/[0.03] px-3 py-1 text-[11px] font-medium ${role.opacity}`}
          style={{
            left: role.x,
            top: role.y,
            transform: `rotate(${role.rotate})`,
          }}
        >
          {role.label}
        </div>
      ))}
    </div>
  );
}

/** Revenue chart with dramatic peaks and valleys */
function FeastFamineIllustration() {
  return (
    <div className="h-[140px] overflow-hidden border-b border-white/[0.06] px-6 pt-5 sm:px-7">
      <div className="flex h-full flex-col">
        {/* Month labels */}
        <div className="flex justify-between px-1 text-[9px] text-white/20">
          <span>Jan</span>
          <span>Feb</span>
          <span>Mar</span>
          <span>Apr</span>
          <span>May</span>
          <span>Jun</span>
        </div>
        {/* Chart area */}
        <div className="relative mt-2 flex-1">
          <svg
            viewBox="0 0 200 80"
            className="h-full w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {/* Grid lines */}
            <line x1="0" y1="20" x2="200" y2="20" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <line x1="0" y1="40" x2="200" y2="40" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            <line x1="0" y1="60" x2="200" y2="60" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            {/* Area fill */}
            <path
              d="M0 70 L33 25 L66 15 L100 65 L133 60 L166 20 L200 55 L200 80 L0 80 Z"
              fill="rgba(255,255,255,0.03)"
            />
            {/* Revenue line — dramatic peaks and valleys */}
            <path
              d="M0 70 L33 25 L66 15 L100 65 L133 60 L166 20 L200 55"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Peak dot */}
            <circle cx="66" cy="15" r="2.5" fill="rgba(255,255,255,0.4)" />
            {/* Valley dot */}
            <circle cx="100" cy="65" r="2.5" fill="rgba(255,255,255,0.2)" />
          </svg>
          {/* Revenue labels */}
          <div className="absolute left-[30%] top-0 -translate-x-1/2 rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[9px] tabular-nums text-white/40">
            $12k
          </div>
          <div className="absolute left-[50%] bottom-[15%] -translate-x-1/2 rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[9px] tabular-nums text-white/25">
            $1.2k
          </div>
        </div>
      </div>
    </div>
  );
}

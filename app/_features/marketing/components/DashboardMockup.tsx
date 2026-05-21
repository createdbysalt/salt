// ds-guardian-ignore: marketing hero illustration with dark theme - uses custom color palette for visual impact
"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { useAnimationTier } from "@/app/_lib/animations/hooks";

/**
 * Salt hero illustration — Studio dashboard mockup
 * with 3D perspective (Linear's exact matrix3d transform).
 * Shows real Salt UI with mock data that sells the product.
 *
 * MOCK DATA SOURCE: brand-identity/voice/mock-data-persona.md
 * All values here must match the "Sarah Chen" persona — the aspirational
 * user at 6-18 months with Salt. Do not change numbers without
 * updating the persona doc first.
 *
 * SIDEBAR: Mirrors the exact structure of DashboardSidebar.tsx
 * MICRO INTERACTIONS: Subtle animations that make UI feel alive
 */
export function DashboardMockup() {
  const tier = useAnimationTier();
  const shouldAnimate = tier !== "none";

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 40 } : undefined}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        delay: 1.4,
        duration: 1.0,
        ease: [0.23, 1, 0.32, 1],
      }}
      className="relative"
    >
      {/* Perspective container — creates the 3D space (Linear's exact values) */}
      <div
        className="relative mx-auto"
        style={{
          perspective: "4000px",
          perspectiveOrigin: "100% 0%",
          transformStyle: "preserve-3d",
          maxWidth: "1800px",
        }}
      >
        {/* 3D surface — Linear's exact matrix3d transform */}
        <div
          className="relative"
          style={{
            transform: "matrix3d(0.832156, -0.115359, -0.71405, 0, 0.604596, 0.927783, 0.385215, 0, 0.618046, -0.752271, 0.584587, 0, 32, 0, 0, 1)",
            transformStyle: "preserve-3d",
            transformOrigin: "0px 0px",
          }}
        >
          {/* ─── Main composition: 2-panel Salt dashboard ─── */}
          <div className="relative flex items-start">
            {/* Left panel: Sidebar + Client List */}
            <motion.div
              className="relative z-10 w-[480px] shrink-0"
              initial={shouldAnimate ? { opacity: 0, x: -30 } : undefined}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1.6, duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
            >
              <SidebarPanel shouldAnimate={shouldAnimate} />
            </motion.div>

            {/* Main panel: Client Detail (single focal point) */}
            <motion.div
              className="relative z-20 -ml-[50px] w-[820px] shrink-0"
              initial={shouldAnimate ? { opacity: 0, y: 30 } : undefined}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1.5, duration: 1, ease: [0.23, 1, 0.32, 1] }}
            >
              <MainContentPanel shouldAnimate={shouldAnimate} />
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Lucide-style SVG Icons ─── */

function IconPanelLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconInbox({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconFolderKanban({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      <path d="M8 10v4" />
      <path d="M12 10v2" />
      <path d="M16 10v6" />
    </svg>
  );
}

function IconWallet({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconFile({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

/* ─── Animated Number Counter ─── */

function AnimatedNumber({ value, prefix = "", suffix = "", delay = 0 }: { value: number; prefix?: string; suffix?: string; delay?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    const timer = setTimeout(() => {
      const duration = 1500;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.floor(eased * value));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [isInView, value, delay]);

  return (
    <span ref={ref}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}

/* ─── Sidebar Panel (Exact Salt structure) ─── */

function SidebarPanel({ shouldAnimate }: { shouldAnimate: boolean }) {
  const navItems = [
    { icon: <IconInbox className="h-4 w-4" />, label: "Inbox", badge: 3 },
    { icon: <IconUsers className="h-4 w-4" />, label: "Clients", active: true },
    { icon: <IconFolderKanban className="h-4 w-4" />, label: "Projects" },
    { icon: <IconWallet className="h-4 w-4" />, label: "Billing" },
  ];

  const recentItems = [
    { icon: <IconUser className="h-3.5 w-3.5" />, label: "Wren & Partners" },
    { icon: <IconFile className="h-3.5 w-3.5" />, label: "Brand Refresh" },
    { icon: <IconUser className="h-3.5 w-3.5" />, label: "Acme Corp" },
    { icon: <IconFile className="h-3.5 w-3.5" />, label: "SEO Audit" },
  ];

  return (
    <div
      className="overflow-hidden rounded-lg border border-white/[0.08] bg-[rgb(15,15,16)]"
      style={{
        boxShadow: `
          0 50px 100px -20px rgba(0,0,0,0.7),
          0 25px 50px -12px rgba(0,0,0,0.4),
          0 0 0 1px rgba(255,255,255,0.03) inset
        `,
      }}
    >
      {/* Window chrome */}
      <div className="flex h-8 items-center gap-2 border-b border-white/[0.06] bg-[rgb(20,21,22)] px-3">
        <div className="flex gap-1.5">
          <motion.span
            className="h-[10px] w-[10px] rounded-full bg-[#ff5f57]"
            whileHover={{ scale: 1.2 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          />
          <motion.span
            className="h-[10px] w-[10px] rounded-full bg-[#febc2e]"
            whileHover={{ scale: 1.2 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          />
          <motion.span
            className="h-[10px] w-[10px] rounded-full bg-[#28c840]"
            whileHover={{ scale: 1.2 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          />
        </div>
      </div>

      <div className="flex" style={{ minHeight: "560px" }}>
        {/* ─── Left Sidebar Navigation (mirrors DashboardSidebar.tsx) ─── */}
        <div className="w-[240px] shrink-0 border-r border-white/[0.06] flex flex-col">
          {/* Header: Logo + Collapse toggle */}
          <div className="flex items-center justify-between h-[52px] px-4">
            <div className="flex items-center gap-2">
              <motion.div
                className="flex h-6 w-6 items-center justify-center rounded-md bg-white"
                whileHover={{ scale: 1.05, rotate: 2 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <span className="text-[10px] font-bold text-black">S</span>
              </motion.div>
              <span className="text-[13px] font-semibold text-white/90">Chen Studio</span>
            </div>
            <motion.button
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 hover:bg-white/[0.06]"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <IconPanelLeft className="h-[18px] w-[18px]" />
            </motion.button>
          </div>

          {/* Mode Switcher (matches ModeSwitcher.tsx exactly) */}
          <div className="px-3 pb-2">
            <div
              className="relative flex p-1.5 rounded-lg"
              style={{ backgroundColor: '#3d3d3d' }}
            >
              {/* Active indicator with spring animation */}
              <motion.div
                className="absolute rounded-md pointer-events-none"
                style={{
                  width: 'calc((100% - 12px) / 3)',
                  height: 'calc(100% - 12px)',
                  top: '6px',
                  backgroundColor: '#1a1a1a',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}
                initial={{ left: 'calc(6px + (100% - 12px) / 3)' }}
                animate={{ left: 'calc(6px + (100% - 12px) / 3)' }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
              {/* Tab buttons */}
              <motion.button
                className="relative z-10 flex-1 py-2 px-3 rounded-md text-[12px] font-medium text-white/50"
                whileHover={{ color: 'rgba(255,255,255,0.7)' }}
              >
                Strategy
              </motion.button>
              <motion.button
                className="relative z-10 flex-1 py-2 px-3 rounded-md text-[12px] font-medium text-white"
                whileHover={{ scale: 1.02 }}
              >
                Studio
              </motion.button>
              <motion.button
                className="relative z-10 flex-1 py-2 px-3 rounded-md text-[12px] font-medium text-white/50"
                whileHover={{ color: 'rgba(255,255,255,0.7)' }}
              >
                Serve
              </motion.button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-3 py-2 space-y-1">
            <motion.button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-[13px] font-[450] text-white/70 hover:bg-white/[0.06]"
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
            >
              <IconPlus className="h-4 w-4" />
              New Project
            </motion.button>
            <motion.button
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-[13px] font-[450] text-white/70 hover:bg-white/[0.06]"
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="flex items-center gap-2">
                <IconSearch className="h-4 w-4" />
                Search
              </span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-white/30 bg-white/[0.06] border border-white/[0.08] rounded">
                ⌘K
              </kbd>
            </motion.button>
          </div>

          {/* Divider */}
          <div className="mx-3 border-t border-white/[0.06] my-2" />

          {/* Nav Items (Studio mode) - Staggered animation */}
          <div className="px-3 space-y-0.5">
            {navItems.map((item, i) => (
              <motion.div
                key={item.label}
                initial={shouldAnimate ? { opacity: 0, x: -10 } : undefined}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1.8 + i * 0.08, duration: 0.4 }}
              >
                <NavItem {...item} />
              </motion.div>
            ))}
          </div>

          {/* Divider */}
          <div className="mx-3 border-t border-white/[0.06] my-2" />

          {/* Recents */}
          <div className="px-3 flex-1">
            <div className="px-3 py-1.5 text-[11px] font-medium text-white/30">
              Recents
            </div>
            <div className="space-y-0.5">
              {recentItems.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={shouldAnimate ? { opacity: 0, x: -10 } : undefined}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 2.1 + i * 0.06, duration: 0.4 }}
                >
                  <RecentItem {...item} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* User Profile (at bottom) */}
          <motion.div
            className="mt-auto px-3 py-3 border-t border-white/[0.06] bg-white/[0.02]"
            initial={shouldAnimate ? { opacity: 0 } : undefined}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 2.4, duration: 0.5 }}
          >
            <motion.div
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-white/[0.06] cursor-pointer"
              whileHover={{ x: 2 }}
            >
              <motion.div
                className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-[10px] font-semibold text-white"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                SC
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-white/80 truncate">Sarah Chen</div>
                <div className="text-[10px] text-white/40 truncate">Pro Plan</div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ─── Client List Content ─── */}
        <div className="flex-1 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[13px] font-medium text-white/70">Clients</div>
            <div className="flex items-center gap-1 text-[11px] text-white/40">
              <span className="rounded bg-white/[0.08] px-2 py-1">Grid</span>
              <span className="rounded px-2 py-1 hover:bg-white/[0.04]">Table</span>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { name: "Wren & Partners", status: "active" as const, projects: 3, revenue: "$18,200", health: "healthy" as const, active: true },
              { name: "Acme Corp", status: "active" as const, projects: 2, revenue: "$12,400", health: "healthy" as const },
              { name: "Bloom Studio", status: "active" as const, projects: 1, revenue: "$6,800", health: "attention" as const },
              { name: "Vertex Labs", status: "proposal" as const, projects: 0, revenue: "—" },
              { name: "Drift Coffee", status: "active" as const, projects: 1, revenue: "$3,200", health: "healthy" as const },
            ].map((client, i) => (
              <motion.div
                key={client.name}
                initial={shouldAnimate ? { opacity: 0, y: 10 } : undefined}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1.9 + i * 0.08, duration: 0.4 }}
              >
                <ClientRow {...client} />
              </motion.div>
            ))}
          </div>

          {/* Pipeline summary */}
          <motion.div
            className="mt-5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
            initial={shouldAnimate ? { opacity: 0, y: 10 } : undefined}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 2.3, duration: 0.5 }}
          >
            <div className="text-[10px] font-medium uppercase tracking-wider text-white/30">Pipeline</div>
            <div className="mt-2 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <motion.span
                  className="h-2 w-2 rounded-full bg-emerald-400"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                />
                <span className="text-[11px] text-white/50">5 active</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.span
                  className="h-2 w-2 rounded-full bg-blue-400"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, delay: 0.5 }}
                />
                <span className="text-[11px] text-white/50">3 proposals</span>
              </div>
            </div>
            <div className="mt-2 text-[12px] font-medium text-white/60">
              $<AnimatedNumber value={14200} delay={2.5} /> in pipeline
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Content Panel (Client Detail) ─── */

function MainContentPanel({ shouldAnimate }: { shouldAnimate: boolean }) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-white/[0.10] bg-[rgb(17,18,19)]"
      style={{
        boxShadow: `
          0 60px 120px -30px rgba(0,0,0,0.8),
          0 30px 60px -15px rgba(0,0,0,0.5),
          0 0 0 1px rgba(255,255,255,0.05) inset,
          0 1px 0 0 rgba(255,255,255,0.08) inset
        `,
        minHeight: "560px",
      }}
    >
      {/* Header bar with breadcrumb */}
      <div className="flex h-11 items-center justify-between border-b border-white/[0.06] bg-[rgb(22,23,24)] px-5">
        <div className="flex items-center gap-2 text-[11px] text-white/40">
          <span>Clients</span>
          <span className="text-white/20">/</span>
          <span className="text-white/70">Wren & Partners</span>
        </div>
        <motion.div
          className="flex items-center gap-2"
          initial={shouldAnimate ? { opacity: 0, scale: 0.9 } : undefined}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.8, type: "spring", stiffness: 400, damping: 25 }}
        >
          <span className="rounded bg-emerald-500/20 px-2 py-1 text-[10px] font-medium text-emerald-400">
            Active
          </span>
        </motion.div>
      </div>

      {/* Client detail content */}
      <div className="p-6">
        {/* Client header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="mb-1 text-[22px] font-semibold leading-tight tracking-[-0.01em] text-white/90">
              Wren & Partners
            </h3>
            <p className="text-[13px] text-white/40">Brand & Digital Agency • 3 active projects</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              className="rounded-md bg-white/[0.06] px-3 py-2 text-[11px] font-medium text-white/60"
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.97 }}
            >
              Message
            </motion.button>
            {/* View Bridge button — highlighted as key feature */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 2.0, type: "spring", stiffness: 400, damping: 20 }}
            >
              {/* Pulsing glow ring */}
              <motion.div
                className="absolute -inset-1 rounded-lg bg-gradient-to-r from-blue-500/40 to-purple-500/40 blur-md"
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.button
                className="relative rounded-md bg-white px-3 py-2 text-[11px] font-medium text-black"
                whileHover={{ scale: 1.02, backgroundColor: '#f0f0f0' }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                View Bridge
              </motion.button>
            </motion.div>
          </div>
        </div>

        {/* Stats row - Staggered with animated numbers */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          {[
            { label: "Lifetime Value", value: 18200, prefix: "$", trend: "+8%" },
            { label: "Projects", value: 3 },
            { label: "Portal Users", value: 4 },
            { label: "Avg Project", value: 4200, prefix: "$" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={shouldAnimate ? { opacity: 0, y: 15 } : undefined}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1.7 + i * 0.1, duration: 0.5 }}
            >
              <StatCard
                label={stat.label}
                value={stat.value}
                prefix={stat.prefix}
                trend={stat.trend}
                delay={1.9 + i * 0.15}
              />
            </motion.div>
          ))}
        </div>

        {/* Projects section */}
        <motion.div
          className="rounded-lg border border-white/[0.06] bg-white/[0.02]"
          initial={shouldAnimate ? { opacity: 0, y: 15 } : undefined}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 2.1, duration: 0.5 }}
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <span className="text-[12px] font-medium text-white/60">Active Projects</span>
            <motion.button
              className="text-[10px] text-white/40 hover:text-white/60"
              whileHover={{ scale: 1.1 }}
            >
              + New
            </motion.button>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {[
              { name: "Brand Refresh — Phase 2", status: "In Progress", progress: 65, dueDate: "Mar 15", value: "$6,400" },
              { name: "Website Redesign", status: "In Review", progress: 90, dueDate: "Mar 8", value: "$8,200" },
              { name: "SEO Optimization", status: "Planning", progress: 15, dueDate: "Apr 1", value: "$3,600" },
            ].map((project, i) => (
              <motion.div
                key={project.name}
                initial={shouldAnimate ? { opacity: 0 } : undefined}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 2.2 + i * 0.1, duration: 0.4 }}
              >
                <ProjectRow {...project} shouldAnimate={shouldAnimate} delay={2.3 + i * 0.15} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Revenue sparkline */}
        <motion.div
          className="mt-5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
          initial={shouldAnimate ? { opacity: 0, y: 15 } : undefined}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 2.5, duration: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-medium uppercase tracking-wider text-white/30">Revenue Trend</div>
            <div className="text-[11px] text-white/40">Last 6 months</div>
          </div>
          <div className="mt-3 flex items-end gap-1.5 h-10">
            {[35, 48, 42, 58, 52, 68].map((height, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-sm bg-gradient-to-t from-white/10 to-white/25"
                initial={shouldAnimate ? { height: 0 } : undefined}
                whileInView={{ height: `${height}%` }}
                viewport={{ once: true }}
                transition={{ delay: 2.6 + i * 0.08, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                whileHover={{
                  backgroundColor: 'rgba(255,255,255,0.35)',
                  transition: { duration: 0.15 }
                }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[9px] text-white/25">
            <span>Oct</span>
            <span>Nov</span>
            <span>Dec</span>
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
          </div>
        </motion.div>

        {/* Recent activity indicator */}
        <motion.div
          className="mt-5 flex items-center gap-2 text-[11px] text-white/35"
          initial={shouldAnimate ? { opacity: 0 } : undefined}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 2.9, duration: 0.5 }}
        >
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-emerald-400"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [1, 0.7, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <span>Last activity 2 hours ago • Invoice #1042 viewed</span>
        </motion.div>
      </div>
    </div>
  );
}

/* ─── Helper Components ─── */

function NavItem({
  icon,
  label,
  active,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <motion.div
      className={`flex items-center justify-between rounded-md px-3 py-2.5 text-[13px] font-[450] transition-colors cursor-pointer ${
        active
          ? "bg-white/[0.08] text-white/90"
          : "text-white/60 hover:bg-white/[0.04]"
      }`}
      whileHover={{ x: active ? 0 : 2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-3">
        <span className={active ? "text-white/90" : "text-white/40"}>{icon}</span>
        <span>{label}</span>
      </div>
      {badge && (
        <motion.span
          className="rounded bg-red-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white min-w-[20px] text-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          {badge}
        </motion.span>
      )}
    </motion.div>
  );
}

function RecentItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <motion.div
      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[12px] text-white/50 hover:bg-white/[0.04] cursor-pointer"
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="text-white/30">{icon}</span>
      <span className="truncate">{label}</span>
    </motion.div>
  );
}

function ClientRow({
  name,
  status,
  projects,
  revenue,
  health,
  active,
}: {
  name: string;
  status: "active" | "proposal" | "inactive";
  projects: number;
  revenue: string;
  health?: "healthy" | "attention";
  active?: boolean;
}) {
  const statusColors = {
    active: "bg-emerald-500/20 text-emerald-400",
    proposal: "bg-blue-500/20 text-blue-400",
    inactive: "bg-white/10 text-white/40",
  };

  return (
    <motion.div
      className={`flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer ${
        active ? "bg-white/[0.06] ring-1 ring-white/[0.10]" : "hover:bg-white/[0.03]"
      }`}
      whileHover={{
        y: -1,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        transition: { duration: 0.15 }
      }}
      whileTap={{ scale: 0.995 }}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <motion.div
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-white/20 to-white/5 text-[10px] font-bold text-white/60"
            whileHover={{ scale: 1.05 }}
          >
            {name.slice(0, 2).toUpperCase()}
          </motion.div>
          {health === "attention" && (
            <motion.span
              className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 border-2 border-[rgb(15,15,16)]"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>
        <div>
          <div className="text-[12px] font-medium text-white/75">{name}</div>
          <div className="text-[10px] text-white/35">{projects} project{projects !== 1 ? 's' : ''}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-medium text-white/50">{revenue}</span>
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${statusColors[status]}`}>
          {status}
        </span>
      </div>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  prefix = "",
  trend,
  delay = 0,
}: {
  label: string;
  value: number;
  prefix?: string;
  trend?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className="rounded-lg bg-white/[0.03] p-3"
      whileHover={{
        backgroundColor: 'rgba(255,255,255,0.05)',
        y: -2,
        transition: { duration: 0.15 }
      }}
    >
      <div className="text-[10px] text-white/35">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[16px] font-semibold text-white/85">
          <AnimatedNumber value={value} prefix={prefix} delay={delay} />
        </span>
        {trend && (
          <motion.span
            className="text-[10px] font-medium text-emerald-400"
            initial={{ opacity: 0, x: -5 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: delay + 0.5, duration: 0.3 }}
          >
            {trend}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

function ProjectRow({
  name,
  status,
  progress,
  dueDate,
  value,
  shouldAnimate = true,
  delay = 0,
}: {
  name: string;
  status: string;
  progress: number;
  dueDate: string;
  value?: string;
  shouldAnimate?: boolean;
  delay?: number;
}) {
  const statusColors: Record<string, string> = {
    "In Progress": "text-blue-400",
    "In Review": "text-amber-400",
    Planning: "text-white/40",
  };

  return (
    <motion.div
      className="flex items-center justify-between px-4 py-3 cursor-pointer"
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
    >
      <div className="flex-1">
        <div className="text-[12px] font-medium text-white/75">{name}</div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.08]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
              initial={shouldAnimate ? { width: 0 } : undefined}
              whileInView={{ width: `${progress}%` }}
              viewport={{ once: true }}
              transition={{ delay, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            />
          </div>
          <span className="text-[10px] text-white/35">{progress}%</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {value && <span className="text-[11px] font-medium text-white/45">{value}</span>}
        <span className={`text-[11px] font-medium ${statusColors[status] || "text-white/40"}`}>
          {status}
        </span>
        <span className="text-[10px] text-white/35">{dueDate}</span>
      </div>
    </motion.div>
  );
}

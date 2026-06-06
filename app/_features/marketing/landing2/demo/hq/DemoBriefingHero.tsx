import { Play, ArrowRight, Sparkles } from "lucide-react";

const stats = [
  { label: "Cleared", value: "$4.2k", tone: "flame" as const },
  { label: "Auto-sent", value: "12", tone: "sky" as const },
  { label: "Need you", value: "3", tone: "violet" as const },
];

export function BriefingHero({ demoMode = false }: { demoMode?: boolean }) {
  return (
    <section className="relative overflow-hidden rounded-[28px] surface-aurora text-white animate-rise">
      <div
        className={
          demoMode
            ? "relative z-10 grid grid-cols-[1fr_auto] items-end gap-8 p-10"
            : "relative z-10 grid items-end gap-8 p-7 lg:grid-cols-[1fr_auto] lg:p-10"
        }
      >
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-5">
            <span className="chip">
              <span className="size-1.5 rounded-full bg-white animate-pulse-glow" /> Monday · May 25
            </span>
            <span className="chip">
              <Sparkles className="size-3" /> Today's briefing
            </span>
          </div>

          <h1
            className={
              demoMode
                ? "font-display text-[68px] font-medium leading-[0.98] tracking-[-0.02em]"
                : "font-display text-5xl font-medium leading-[0.98] tracking-[-0.02em] lg:text-[68px]"
            }
          >
            Good morning,<br />
            <span className="text-white/85">Alex.</span>
          </h1>

          <p className="mt-5 text-white/85 text-lg leading-[1.55] max-w-xl">
            Salt ran <span className="font-semibold text-white">3 plays</span> for you today.
            Three more are waiting on your approval — about 90 seconds of work.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button className="group h-11 pl-4 pr-5 flex items-center gap-2 rounded-full bg-white text-neutral-900 text-sm font-semibold hover-lift">
              <Play className="size-4 fill-neutral-900" /> Review 3 plays
            </button>
            <button className="h-11 px-5 flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur border border-white/20 text-sm font-medium transition">
              Listen — 45s <ArrowRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Stats column */}
        <div
          className={
            demoMode
              ? "grid w-[200px] grid-cols-1 gap-2.5"
              : "grid grid-cols-3 gap-2.5 lg:w-[200px] lg:grid-cols-1"
          }
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="rounded-2xl bg-white/12 backdrop-blur border border-white/20 p-3.5 hover:bg-white/18 transition cursor-pointer"
              style={{ animation: `rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both`, animationDelay: `${i * 80 + 100}ms` }}
            >
              <p className="text-[11px] uppercase tracking-wider text-white/70 font-medium">{s.label}</p>
              <p className="mt-1 font-display text-3xl leading-none tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Floating glass orbs */}
      <div className="pointer-events-none absolute -top-10 -right-10 size-72 rounded-full bg-white/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 size-64 rounded-full bg-flame/40 blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
    </section>
  );
}

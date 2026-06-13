"use client";

import { MapPin, Clock, Target } from "lucide-react";
import { toast } from "sonner";
import { SaltActionButton } from "@/app/_features/memory/components/SaltActionButton";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import { ME, EMPTY_ME } from "../data";

export function MeHero() {
  const mockContent = useMockContent();
  const me = mockContent ? ME : EMPTY_ME;

  const stats = [
    { label: "Active goals", value: String(me.goals.length) },
    { label: "Connected", value: `${me.accounts.filter((a) => a.status === "connected").length}/${me.accounts.length}` },
    { label: "Autonomy rules", value: String(me.autonomyRules.length) },
    { label: "Memory facts", value: String(me.saltMemory.length) },
  ];

  return (
    <section className="relative overflow-hidden rounded-[28px] surface-aurora text-white animate-rise">
      <div className="relative z-10 p-7 lg:p-10">
        <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-start">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
                <span className="size-1.5 rounded-full bg-flame animate-pulse-glow" />
                You
              </span>
              <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
                <MapPin className="size-3" strokeWidth={2} />
                {me.location}
              </span>
              <span className="chip bg-white/15 text-white/90 backdrop-blur border-white/20">
                <Clock className="size-3" strokeWidth={2} />
                {me.timezone}
              </span>
            </div>

            <div className="flex items-center gap-5">
              <div className="size-16 rounded-2xl bg-white/15 backdrop-blur border border-white/25 grid place-items-center text-xl font-semibold text-white shrink-0">
                {me.initials}
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-5xl lg:text-[58px] leading-[0.95] tracking-tight">
                  {me.name}
                </h1>
                <p className="mt-2 text-white/80 text-base">{me.role}</p>
              </div>
            </div>

            <p className="mt-5 text-white/85 text-lg leading-snug">{me.tagline}</p>

            <div className="mt-5 flex items-start gap-2 rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3.5">
              <Target className="size-4 text-white/80 mt-0.5 shrink-0" strokeWidth={2} />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">Current focus</p>
                <p className="mt-0.5 text-sm text-white/90 leading-snug">{me.currentFocus}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <SaltActionButton
                variant="hero"
                onClick={() => toast.success("Salt is updating your profile…")}
                title="Tell Salt something new about you"
              >
                Tell Salt about you
              </SaltActionButton>
              <button
                type="button"
                onClick={() => toast("Edit profile (coming soon)")}
                className="h-11 px-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur border border-white/20 text-sm font-medium text-white transition"
              >
                Edit profile
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 lg:w-[200px]">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="rounded-2xl bg-white/12 backdrop-blur border border-white/20 p-3.5"
                style={{ animation: `rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both`, animationDelay: `${i * 80 + 100}ms` }}
              >
                <p className="text-[11px] uppercase tracking-wider text-white/70 font-medium">{s.label}</p>
                <p className="mt-1 font-display text-2xl leading-none tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -top-10 -right-10 size-72 rounded-full bg-white/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 size-64 rounded-full bg-flame/40 blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
    </section>
  );
}

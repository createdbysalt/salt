"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  ChevronDown,
  Search,
  Sparkles,
  User,
  AlertTriangle,
  Compass,
} from "lucide-react";
import { cn } from "@repo/utils";
import { PATHS_BY_TARGET, TARGETS, type PathCategory, type Target } from "@/app/_lib/demo/connections-paths-data";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import { PathRow } from "./PathRow";

const CATEGORY_META: Record<
  PathCategory,
  { label: string; description: string; icon: typeof Sparkles; tone: string }
> = {
  warm_intro: {
    label: "Warm intro paths",
    description: "People who can connect you, ranked by reply odds.",
    icon: ArrowRight,
    tone: "text-sky-700 dark:text-sky-300 bg-sky/10 border-sky/30",
  },
  context: {
    label: "Context paths",
    description: "Shared history that gives you something to lead with.",
    icon: Compass,
    tone: "text-violet-700 dark:text-violet-300 bg-violet/10 border-violet/30",
  },
  risk: {
    label: "Risk paths",
    description: "Things that could complicate this relationship.",
    icon: AlertTriangle,
    tone: "text-destructive bg-destructive/10 border-destructive/30",
  },
  opportunity: {
    label: "Opportunity paths",
    description: "Patterns Salt has seen play out well before.",
    icon: Sparkles,
    tone: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  },
};

const CATEGORY_ORDER: PathCategory[] = ["warm_intro", "context", "risk", "opportunity"];

export function PathsView() {
  const mockContent = useMockContent();
  const [selected, setSelected] = useState<Target | null>(mockContent ? TARGETS[0] : null);
  const [query, setQuery] = useState("");
  const [openCats, setOpenCats] = useState<Record<PathCategory, boolean>>({
    warm_intro: true,
    context: true,
    risk: true,
    opportunity: true,
  });

  const filteredTargets = useMemo(() => {
    if (!mockContent) return [];
    if (!query.trim()) return TARGETS;
    const q = query.toLowerCase();
    return TARGETS.filter(
      (t) => t.name.toLowerCase().includes(q) || t.subtitle.toLowerCase().includes(q),
    );
  }, [query, mockContent]);

  const paths = mockContent && selected ? PATHS_BY_TARGET[selected.id] ?? [] : [];
  const grouped = useMemo(() => {
    const out: Record<PathCategory, typeof paths> = {
      warm_intro: [],
      context: [],
      risk: [],
      opportunity: [],
    };
    for (const p of paths) out[p.category].push(p);
    return out;
  }, [paths]);

  function toggle(cat: PathCategory) {
    setOpenCats((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  if (!mockContent) {
    return (
      <MockContentEmptyState
        title="No warm paths yet"
        description="Salt will suggest intros and context paths once people and orgs are connected."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
      {/* Left rail */}
      <aside className="rounded-3xl border border-border/60 bg-card p-4 flex flex-col gap-3 h-fit lg:sticky lg:top-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            From you, to…
          </p>
          <h3 className="font-display text-lg tracking-tight mt-1">Pick a target</h3>
        </div>
        <div className="relative">
          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people or orgs"
            className="w-full rounded-full border border-border/60 bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
          />
        </div>
        <ul className="space-y-1">
          {filteredTargets.map((t) => {
            const active = selected?.id === t.id;
            const Icon = t.kind === "person" ? User : Building2;
            return (
              <li key={t.id}>
                <button
                  onClick={() => setSelected(t)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition text-left",
                    active
                      ? "bg-foreground text-background"
                      : "hover:bg-muted text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "size-8 rounded-full grid place-items-center shrink-0 border",
                      active
                        ? "border-background/20 bg-background/10"
                        : "border-border/60 bg-muted",
                    )}
                  >
                    <Icon className="size-3.5" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{t.name}</span>
                    <span
                      className={cn(
                        "block text-[11px] truncate",
                        active ? "text-background/70" : "text-muted-foreground",
                      )}
                    >
                      {t.subtitle}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {filteredTargets.length === 0 && (
            <li className="text-xs text-muted-foreground px-3 py-2">No matches.</li>
          )}
        </ul>
      </aside>

      {/* Right pane */}
      <section className="min-w-0 flex flex-col gap-5">
        {!selected ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Pick a person or org to see how you connect.
            </p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3">
              <span className="size-10 rounded-full bg-muted border border-border/60 grid place-items-center shrink-0">
                {selected.kind === "person" ? (
                  <User className="size-4 text-foreground/70" />
                ) : (
                  <Building2 className="size-4 text-foreground/70" />
                )}
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Paths to
                </p>
                <h2 className="font-display text-2xl tracking-tight leading-tight">
                  {selected.name}
                </h2>
                <p className="text-xs text-muted-foreground">{selected.subtitle}</p>
              </div>
            </header>

            {CATEGORY_ORDER.map((cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              const list = grouped[cat];
              const open = openCats[cat];
              return (
                <section key={cat} className="rounded-3xl border border-border/60 bg-card overflow-hidden">
                  <button
                    onClick={() => toggle(cat)}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition"
                  >
                    <span
                      className={cn(
                        "size-9 rounded-full grid place-items-center border shrink-0",
                        meta.tone,
                      )}
                    >
                      <Icon className="size-4" strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-base tracking-tight">
                        {meta.label}
                        <span className="ml-2 text-sm text-muted-foreground tabular-nums font-medium">
                          {list.length}
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground">{meta.description}</p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-4 text-muted-foreground transition-transform shrink-0",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                  {open && (
                    <div className="px-3 pb-3 space-y-2">
                      {list.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-3 py-4">
                          Nothing in this category yet.
                        </p>
                      ) : (
                        list.map((p) => <PathRow key={p.id} path={p} />)
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </>
        )}
      </section>
    </div>
  );
}

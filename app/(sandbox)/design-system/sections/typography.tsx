"use client";

export function TypographySection() {
  return (
    <div className="space-y-12">
      <header>
        <p className="salt-eyebrow mb-3">Typography · professional minimal</p>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Inter for body and display. SF Mono for data.
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          Inter is the modern professional standard — clean, neutral, highly legible.
          SF Mono for numbers, metadata, status, hotkeys — anywhere data needs to feel
          authoritative. Simple, professional, minimal.
        </p>
      </header>

      {/* Marketing display — Inter (sans) */}
      <section>
        <p className="salt-eyebrow mb-3">Marketing display · Inter</p>
        <h2 className="text-base font-semibold tracking-tight mb-4">
          Sans at display, mono for data accents.
        </h2>
        <div className="border border-border bg-card p-10 space-y-10">
          {/* Hero sample */}
          <div>
            <p
              className="salt-eyebrow mb-5"
              style={{ color: "var(--muted-foreground)" }}
            >
              SALT · for agency owners
            </p>
            <p
              className="tracking-tighter leading-[0.95]"
              style={{
                fontFamily: "var(--salt-font-sans)",
                fontSize: "72px",
                letterSpacing: "-0.03em",
                fontWeight: 500,
              }}
            >
              The agency,
              <br />
              smarter.
            </p>
            <p className="text-[12px] text-muted-foreground mt-4 max-w-md leading-relaxed">
              Sample marketing hero. Inter · 72px · weight 500 · tracking
              -0.03em · line-height 0.95.
            </p>
          </div>

          <div className="h-px bg-border" />

          {/* Section header sample */}
          <div>
            <p
              className="salt-eyebrow mb-3"
              style={{ color: "var(--muted-foreground)" }}
            >
              How it works
            </p>
            <p
              className="tracking-tight leading-[1.05]"
              style={{
                fontFamily: "var(--salt-font-sans)",
                fontSize: "44px",
                letterSpacing: "-0.025em",
                fontWeight: 500,
              }}
            >
              One graph.
              <br />
              Every relationship.
            </p>
            <p className="text-[12px] text-muted-foreground mt-3 max-w-md leading-relaxed">
              Section heading. Inter · 44px · weight 500 · tracking
              -0.025em.
            </p>
          </div>

          <div className="h-px bg-border" />

          {/* Why it works callout */}
          <div className="bg-muted p-4 border border-border">
            <p className="salt-eyebrow mb-2">Why Inter + SF Mono</p>
            <ul className="text-[13px] leading-relaxed space-y-1.5 text-foreground/80">
              <li>
                Inter is the modern standard — clean, neutral, highly readable
                at any size.
              </li>
              <li>
                Tight tracking (-0.025 to -0.03em) at display sizes creates
                confident, professional headlines.
              </li>
              <li>
                SF Mono for data: eyebrows, numbers, hotkey hints, metadata,
                status — never display copy.
              </li>
              <li>
                Weight 500 (medium), not bold. Medium weight reads as confident
                without shouting.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Product scale (sans) */}
      <section>
        <p className="salt-eyebrow mb-3">Product scale · Inter</p>
        <h2 className="text-base font-semibold tracking-tight mb-4">
          Inside the product — all sans.
        </h2>
        <div className="border border-border bg-card p-6">
          <div className="space-y-4 divide-y divide-border">
            <TypeRow
              label="Page hero"
              sample="The agency, smarter."
              spec="32px · 1.15 · 600 · -0.01em"
              className="text-[32px] font-semibold tracking-tight leading-[1.15]"
            />
            <TypeRow
              label="H1"
              sample="Worth your attention today"
              spec="24px · 1.2 · 600 · -0.01em"
              className="text-2xl font-semibold tracking-tight leading-tight pt-4"
            />
            <TypeRow
              label="H2"
              sample="Recent captures"
              spec="18px · 1.3 · 600 · -0.005em"
              className="text-lg font-semibold tracking-tight pt-4"
            />
            <TypeRow
              label="H3"
              sample="Acme Corp · client"
              spec="15px · 1.35 · 600"
              className="text-[15px] font-semibold pt-4"
            />
            <TypeRow
              label="Body"
              sample="Sarah Chen mentioned the Q3 rebrand again — worth a follow-up by Thursday."
              spec="14px · 1.5 · 400"
              className="text-sm leading-relaxed pt-4"
            />
            <TypeRow
              label="Body sm"
              sample="35 days quiet · last contact: April 28"
              spec="13px · 1.5 · 400"
              className="text-[13px] leading-relaxed pt-4"
            />
            <TypeRow
              label="Caption"
              sample="Auto-routed via Capture · view activity"
              spec="12px · 1.4 · 500 · muted"
              className="text-xs font-medium text-muted-foreground pt-4"
            />
          </div>
        </div>
      </section>

      {/* Mono — the canonical use cases */}
      <section>
        <p className="salt-eyebrow mb-3">Mono · canonical use</p>
        <h2 className="text-base font-semibold tracking-tight mb-1">
          Where SF Mono lands.
        </h2>
        <p className="text-[13px] text-muted-foreground mb-4 max-w-xl leading-relaxed">
          Outside of marketing display, mono is reserved for the seven surfaces
          where it earns trust: numbers, metadata, hotkeys, status, eyebrows,
          IDs, and AI confidence.
        </p>
        <div className="border border-border bg-card p-6 space-y-5">
          {/* Eyebrow — the canonical case */}
          <MonoExample
            title="Eyebrow labels"
            note="The most common mono use. Above section titles, hero entries, every page header."
          >
            <p className="salt-eyebrow">WORTH ATTENTION</p>
            <p className="salt-eyebrow mt-1.5">AVG $14K LTV</p>
            <p className="salt-eyebrow mt-1.5">3 RENEWALS DUE</p>
          </MonoExample>

          {/* Tabular numbers */}
          <MonoExample
            title="Tabular numbers"
            note="Currency, percentages, large numbers — always tabular for alignment."
          >
            <div className="salt-mono text-[14px] leading-relaxed">
              <p>$12,500.00 MRR</p>
              <p>$ 8,000.00 MRR</p>
              <p>$&nbsp;&nbsp;&nbsp;&nbsp;250.00 invoice</p>
              <p className="mt-2">94% confidence</p>
              <p>12 days · 4 messages · 1 open task</p>
            </div>
          </MonoExample>

          {/* Hotkey hints */}
          <MonoExample
            title="Hotkey hints"
            note="Boxed mono. Subtle border. Lives next to action labels."
          >
            <div className="flex items-center gap-2">
              <span>Quick capture</span>
              <span className="salt-hotkey">⌘⇧N</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span>Ask SALT</span>
              <span className="salt-hotkey">⌘K</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span>Submit</span>
              <span className="salt-hotkey">⌘↵</span>
            </div>
          </MonoExample>

          {/* AI confidence */}
          <MonoExample
            title="AI confidence + timestamps"
            note="AI surfaces use mono for confidence scores. Activity log timestamps use mono."
          >
            <div className="text-[13px]">
              <p>
                Match confidence:{" "}
                <span className="salt-mono font-semibold">94%</span>
              </p>
              <p className="mt-1.5">
                Last contact:{" "}
                <span className="salt-mono text-muted-foreground">
                  2026-04-28 · 14:32
                </span>
              </p>
              <p className="mt-1.5">
                Entity ID:{" "}
                <span className="salt-mono text-muted-foreground">
                  org_8x4kfp2
                </span>
              </p>
            </div>
          </MonoExample>
        </div>
      </section>

      {/* Weights */}
      <section>
        <p className="salt-eyebrow mb-3">Weights</p>
        <h2 className="text-base font-semibold tracking-tight mb-4">
          Onest + JetBrains Mono — same family weights.
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { weight: 400, label: "Regular" },
            { weight: 500, label: "Medium" },
            { weight: 600, label: "Semibold" },
            { weight: 700, label: "Bold" },
          ].map((w) => (
            <div
              key={w.weight}
              className="border border-border bg-card p-4"
            >
              <p
                className="text-3xl tracking-tight mb-2"
                style={{ fontWeight: w.weight }}
              >
                Aa
              </p>
              <p
                className="font-mono text-2xl tracking-tight mb-2"
                style={{ fontWeight: w.weight }}
              >
                Aa
              </p>
              <p className="salt-eyebrow">
                {w.label} · {w.weight}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TypeRow({
  label,
  sample,
  spec,
  className,
}: {
  label: string;
  sample: string;
  spec: string;
  className?: string;
}) {
  return (
    <div className="flex items-baseline gap-6">
      <div className="w-28 shrink-0">
        <p className="salt-eyebrow">{label}</p>
        <p className="text-[10px] salt-mono text-muted-foreground mt-1">
          {spec}
        </p>
      </div>
      <p className={className}>{sample}</p>
    </div>
  );
}

function MonoExample({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-6 items-start">
      <div>
        <p className="text-[13px] font-medium">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
          {note}
        </p>
      </div>
      <div>{children}</div>
    </div>
  );
}

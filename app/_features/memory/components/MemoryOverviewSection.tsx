import { Sparkles } from "lucide-react";

export function MemoryOverviewSection({
  title,
  salt,
  variant = "label",
  id,
  actions,
  children,
}: {
  title: string;
  salt?: boolean;
  variant?: "label" | "heading";
  id?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (variant === "heading") {
    return (
      <section id={id} className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex min-w-0 items-center gap-2 font-display text-2xl tracking-tight text-foreground">
            {salt && <Sparkles className="size-4 text-flame shrink-0" strokeWidth={2.25} aria-hidden />}
            {title}
          </h2>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
        {children}
      </section>
    );
  }

  return (
    <section id={id} className="space-y-3">
      <h3 className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
        {salt && <Sparkles className="size-3 text-flame shrink-0" strokeWidth={2.25} aria-hidden />}
        {title}
      </h3>
      {children}
    </section>
  );
}

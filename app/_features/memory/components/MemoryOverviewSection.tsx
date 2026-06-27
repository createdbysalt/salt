import { Sparkles } from "lucide-react";

export function MemoryOverviewSection({
  title,
  salt,
  variant = "label",
  children,
}: {
  title: string;
  salt?: boolean;
  variant?: "label" | "heading";
  children: React.ReactNode;
}) {
  if (variant === "heading") {
    return (
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-2xl tracking-tight text-foreground">
          {salt && <Sparkles className="size-4 text-flame shrink-0" strokeWidth={2.25} aria-hidden />}
          {title}
        </h2>
        {children}
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
        {salt && <Sparkles className="size-3 text-flame shrink-0" strokeWidth={2.25} aria-hidden />}
        {title}
      </h3>
      {children}
    </section>
  );
}

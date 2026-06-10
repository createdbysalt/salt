import { Sparkles } from "lucide-react";

export function MemoryOverviewSection({
  title,
  salt,
  children,
}: {
  title: string;
  salt?: boolean;
  children: React.ReactNode;
}) {
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

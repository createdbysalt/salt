import Link from "next/link";
import { cn } from "@repo/utils";

/**
 * Page-level pill tabs for /ops surfaces — same pattern as MemoryTabs
 * (rounded-full pill nav). Use when a page gains peer sub-views, e.g.
 * Connectors → Review queue / Catalog / Health. Not rendered by the shell;
 * import into the page that needs it.
 */
export function AdminTabs({
  tabs,
  active,
  ariaLabel = "Admin sections",
}: {
  tabs: readonly { href: string; label: string }[];
  active: string;
  ariaLabel?: string;
}) {
  return (
    <div className="-mx-1 max-w-full overflow-x-auto pb-0.5">
      <nav
        aria-label={ariaLabel}
        className="inline-flex min-w-max items-center rounded-full border border-border/60 bg-muted/70 p-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] dark:border-border dark:bg-background/60"
      >
        {tabs.map((tab) => {
          const isActive = tab.href === active;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative rounded-full px-4 py-2 text-sm transition-colors duration-200 sm:px-6",
                isActive
                  ? "bg-card font-semibold text-foreground shadow-sm ring-1 ring-black/[0.04] dark:bg-foreground dark:text-background dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)] dark:ring-foreground/20"
                  : "font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

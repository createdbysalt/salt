import { cn } from "@repo/utils";

const chipBase =
  "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-medium uppercase tracking-[0.04em] transition";

/** Category filter pill — inactive uses landing2 `.chip`; active uses solid foreground. */
export function blogCategoryChipClass(isActive = false) {
  return cn(
    chipBase,
    isActive
      ? "bg-foreground text-background hover:opacity-90"
      : "chip hover:bg-foreground/[0.08]"
  );
}

/** Inline category label (non-link) for article cards and list items. */
export function blogCategoryLabelClass() {
  return "chip w-fit";
}

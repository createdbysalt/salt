/** Shared responsive layout tokens for Memory list + detail surfaces. */

export const memoryListShellClass = "mx-auto w-full max-w-[1400px] space-y-6 sm:space-y-8";

export const memoryDetailShellClass =
  "mx-auto w-full max-w-[1400px] space-y-5 sm:space-y-6 pb-8 lg:pb-10";

export const memoryHeroSectionClass =
  "relative overflow-hidden rounded-2xl sm:rounded-[28px] surface-aurora text-white animate-rise";

export const memoryHeroInnerClass = "relative z-10 p-5 sm:p-7 lg:p-10";

export const memoryHeroTitleClass =
  "font-display text-3xl sm:text-4xl md:text-5xl lg:text-[58px] leading-[0.95] tracking-tight";

export const memoryHeroSummaryClass =
  "mt-4 sm:mt-5 text-white/85 text-base sm:text-lg leading-snug";

export const memorySectionTitleClass =
  "font-display font-semibold text-3xl sm:text-4xl md:text-5xl lg:text-[58px] leading-[1.02]";

export const memoryTabsListClass =
  "bg-card border border-border/60 rounded-full p-1 h-auto w-full max-w-full justify-start overflow-x-auto flex-nowrap sm:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export const memoryTabTriggerClass =
  "rounded-full shrink-0 data-[state=active]:bg-foreground data-[state=active]:text-background px-3 sm:px-4 text-sm capitalize";

/** Full-width equal segments — for small tab sets (e.g. Billing detail: 3 tabs). */
export const memoryTabsListEqualClass =
  "bg-card border border-border/60 rounded-full p-1 h-auto w-full grid grid-cols-3 gap-0.5";

export const memoryTabTriggerEqualClass =
  "rounded-full min-w-0 w-full h-8 flex items-center justify-center px-2 sm:px-3 text-sm font-medium capitalize transition";

export const memoryTabPanelClass =
  "rounded-2xl sm:rounded-3xl border border-border/60 bg-card/60 p-4 sm:p-6";

export const memoryDetailGridClass =
  "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)] gap-5 sm:gap-6";

export const memoryTableScrollClass = "overflow-x-auto";

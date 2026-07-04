const SYSTEM_PILL = {
  idle:
    "border border-dashed border-border/45 bg-transparent text-muted-foreground/55 hover:border-border hover:bg-muted/20 hover:text-muted-foreground",
  assigned:
    "border border-solid border-foreground/15 bg-muted/90 text-foreground shadow-sm hover:bg-muted",
} as const;

const CUSTOM_PILL = {
  idle:
    "border border-dashed border-border/45 bg-transparent text-muted-foreground/55 hover:border-foreground/20 hover:bg-muted/25 hover:text-foreground/75",
  assigned:
    "border border-solid border-transparent bg-foreground text-background shadow-sm hover:bg-foreground/90",
} as const;

export function getTagPillClasses(
  tag: { isSystem: boolean },
  isAssigned: boolean
): string {
  const palette = tag.isSystem ? SYSTEM_PILL : CUSTOM_PILL;
  return palette[isAssigned ? "assigned" : "idle"];
}

export function getTagBadgeClasses(tag: { isSystem: boolean }): string {
  if (!tag.isSystem) {
    return "";
  }

  return "border-border/60 bg-muted/40 text-muted-foreground";
}

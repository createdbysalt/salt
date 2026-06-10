import { cn } from "@repo/utils";

export const onboardingActionButtonBase =
  "h-11 rounded-full px-6 text-sm font-semibold transition disabled:cursor-not-allowed";

export function onboardingActionButtonClassName({ ready = true }: { ready?: boolean } = {}) {
  return cn(
    onboardingActionButtonBase,
    ready
      ? "hover-lift text-white surface-aurora hover:opacity-90 disabled:opacity-30"
      : "bg-muted text-muted-foreground hover:text-foreground hover:opacity-100 disabled:opacity-40",
  );
}

/** Same tokens as disabled Continue; explicit opacity matches `disabled:opacity-40`. */
export function onboardingBackButtonClassName() {
  return cn(
    onboardingActionButtonClassName({ ready: false }),
    "shrink-0 opacity-40 hover:opacity-100",
  );
}

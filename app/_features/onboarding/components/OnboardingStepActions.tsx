import Link from "next/link";
import type { ReactNode } from "react";
import { OnboardingStepBack } from "./OnboardingStepBack";

export { onboardingActionButtonClassName } from "./onboarding-button-styles";

type Props = {
  primary: ReactNode;
  hint?: string;
  onBack?: () => void;
  showSkip?: boolean;
  skipHref?: string;
  /** Welcome: centered CTA + skip below. Other steps: back + continue row (skip lives in shell header). */
  layout?: "centered" | "default";
};

export function OnboardingStepActions({
  primary,
  hint,
  onBack,
  showSkip = true,
  skipHref = "/hq",
  layout = "default",
}: Props) {
  if (layout === "centered") {
    return (
      <div className="flex flex-col items-center gap-3 pt-2">
        {primary}
        {showSkip ? (
          <Link
            href={skipHref}
            className="text-[12px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            Skip for now
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 pt-2 sm:gap-4">
      {onBack ? <OnboardingStepBack onClick={onBack} /> : null}
      {primary}
      {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

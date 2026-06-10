import { onboardingBackButtonClassName } from "./onboarding-button-styles";

export function OnboardingStepBack({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={onboardingBackButtonClassName()}>
      Back
    </button>
  );
}

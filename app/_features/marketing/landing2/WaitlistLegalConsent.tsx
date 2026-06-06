import Link from "next/link";
import { cn } from "@repo/utils";

type WaitlistLegalConsentProps = {
  className?: string;
  onAurora?: boolean;
};

export function WaitlistLegalConsent({
  className,
  onAurora = false,
}: WaitlistLegalConsentProps) {
  const linkClass = cn(
    "underline underline-offset-2 transition",
    onAurora ? "hover:text-white/90" : "hover:text-foreground/80"
  );

  const textClass = cn(
    "text-center text-xs leading-snug text-muted-foreground/65",
    onAurora && "text-white/50",
    className
  );

  return (
    <p className={textClass}>
      By joining, you agree to our{" "}
      <Link href="/privacy-policy" className={linkClass}>
        Privacy Policy
      </Link>{" "}
      and{" "}
      <Link href="/early-access" className={linkClass}>
        Early Access Terms
      </Link>
      .
    </p>
  );
}

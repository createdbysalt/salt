import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  step: number;
  totalSteps: number;
  showSkip?: boolean;
  skipHref?: string;
  children: ReactNode;
};

export function OnboardingShell({
  step,
  totalSteps,
  showSkip = false,
  skipHref = "/hq",
  children,
}: Props) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/4 top-0 size-[600px] rounded-full bg-sky/20 blur-[120px]" />
        <div className="absolute right-0 top-1/3 size-[500px] rounded-full bg-flame/15 blur-[120px]" />
        <div className="absolute bottom-0 left-0 size-[500px] rounded-full bg-violet/15 blur-[120px]" />
      </div>

      <header className="shrink-0">
        <div
          className="h-1 w-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={totalSteps}
          aria-valuenow={step + 1}
          aria-label={`Step ${step + 1} of ${totalSteps}`}
        >
          <div
            className="h-full surface-aurora transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-6 py-5 lg:px-10">
          <Link href="/" aria-label="Salt home">
            <span
              aria-label="Salt"
              role="img"
              className="block h-5 w-[40px] bg-foreground"
              style={{
                maskImage: "url(/salt-logo.svg)",
                WebkitMaskImage: "url(/salt-logo.svg)",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
            />
          </Link>
          {showSkip ? (
            <Link
              href={skipHref}
              className="text-[12px] font-medium text-muted-foreground transition hover:text-foreground"
            >
              Skip for now
            </Link>
          ) : null}
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-8 lg:px-10">
        <div className="w-full max-w-[960px]">{children}</div>
      </main>
    </div>
  );
}

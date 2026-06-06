import { isStagingDeployment } from "@/app/_lib/env/deployment";

/**
 * Visible on hosted staging so the team never confuses environments.
 */
export function StagingBanner() {
  if (!isStagingDeployment()) {
    return null;
  }

  return (
    <div
      role="status"
      className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm font-medium text-amber-950 dark:text-amber-100"
    >
      Staging environment — not production. Data and billing are test-only.
    </div>
  );
}

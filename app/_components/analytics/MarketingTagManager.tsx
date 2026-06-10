import { GoogleTagManager } from "@next/third-parties/google";
import { analyticsConfig } from "@/app/_lib/analytics/config";

export function MarketingTagManager({ gtmId }: { gtmId: string }) {
  if (!analyticsConfig.enabled || !gtmId) return null;
  return <GoogleTagManager gtmId={gtmId} />;
}

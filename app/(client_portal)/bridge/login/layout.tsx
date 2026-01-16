import { ReactNode } from "react";
import { getSEOTags } from "@/libs/seo";
import { AuthTokenHandler } from "@/app/_features/auth/components/AuthTokenHandler";

export const metadata = getSEOTags({
  title: "Bridge Login",
  canonicalUrlRelative: "/bridge/login",
});

export default function BridgeLoginLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Handle magic link tokens in URL fragments */}
      <AuthTokenHandler />
      {children}
    </>
  );
}
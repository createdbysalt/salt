import { ReactNode } from "react";
import config from "@/config";
import { getSEOTags } from "@/libs/seo";
import { AuthTokenHandler } from "@/app/_features/auth/components/AuthTokenHandler";

export const metadata = getSEOTags({
  title: `Sign-in to ${config.appName}`,
  canonicalUrlRelative: "/auth/signin",
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Handle magic link tokens in URL fragments */}
      <AuthTokenHandler />
      {children}
    </>
  );
}

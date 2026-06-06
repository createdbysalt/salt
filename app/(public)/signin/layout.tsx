import { ReactNode } from "react";
import { redirect } from "next/navigation";
import config from "@/config";
import { getSEOTags } from "@/app/_lib/seo";
import { AuthTokenHandler } from "@/app/_features/auth/components/AuthTokenHandler";
import {
  getProductAuthRedirectPath,
  isProductAuthEnabled,
} from "@/app/_lib/env/product-auth";

export const metadata = getSEOTags({
  title: `Sign-in to ${config.appName}`,
  canonicalUrlRelative: "/auth/signin",
});

export default function Layout({ children }: { children: ReactNode }) {
  if (!isProductAuthEnabled()) {
    redirect(getProductAuthRedirectPath());
  }

  return (
    <>
      {/* Handle magic link tokens in URL fragments */}
      <AuthTokenHandler />
      {children}
    </>
  );
}

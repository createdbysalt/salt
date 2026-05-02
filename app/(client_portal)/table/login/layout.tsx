import { ReactNode } from "react";
import { AuthTokenHandler } from "@/app/_features/auth/components/AuthTokenHandler";

export const metadata = {
  title: "Bridge Login",
};

export default function BridgeLoginLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Handle magic link tokens in URL fragments */}
      <AuthTokenHandler />
      {children}
    </>
  );
}

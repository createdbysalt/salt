import { AuthTokenHandler } from "@/components/AuthTokenHandler";

export default function BridgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Handle magic link tokens in URL fragments */}
      <AuthTokenHandler />
      {children}
    </>
  );
}


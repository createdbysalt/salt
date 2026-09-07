import { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import { getPlatformAdmin } from "@/app/_lib/admin/platform-admin";
import { AdminShell } from "./_components/AdminShell";

/**
 * Admin route group — Salt Ops runs in its own app shell, separate from the
 * product chrome (no sidebar, command palette, or workspace context).
 * Platform ops is not the product.
 *
 * Shell-level gate: signed-out → /signin; signed-in non-founder → 404.
 * Pages keep their own getPlatformAdmin checks (defense in depth).
 */
export default async function AdminGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin");
  }

  const admin = await getPlatformAdmin();
  if (!admin.ok) {
    notFound();
  }

  // The badge answers "which database am I looking at?" — derived from the
  // Supabase URL, not VERCEL_ENV, because local dev can point at either
  // project (dev:op → production data, dev:staging:op → staging data).
  // Staging project ref: <project-ref> (see .env.staging.1password).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const environment = supabaseUrl.includes("<project-ref>")
    ? "staging"
    : supabaseUrl.includes("supabase.co")
      ? "production"
      : "development";

  return (
    <AdminShell email={admin.email} environment={environment}>
      {children}
    </AdminShell>
  );
}

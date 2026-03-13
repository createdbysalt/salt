import { getTenantContext } from "@/app/_lib/tenancy";
import { safeRedirectPath } from "@/app/_lib/security/safe-redirect";
import { redirect } from "next/navigation";
import { ClientPickerForm } from "./ClientPickerForm";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@repo/ui";
import { getStudiosForPicker } from "./queries";

export const dynamic = "force-dynamic";

/**
 * Client selection page for multi-client Bridge users.
 * Shown when a user has access to 2+ clients and needs to choose which one to view.
 */
export default async function BridgeSelectPage() {
  const { context, redirectTo } = await getTenantContext();

  // Honor tenant resolver redirects (e.g. studio members hitting /bridge/select → /dashboard)
  const safeRedirectTo = safeRedirectPath(redirectTo);
  if (safeRedirectTo) redirect(safeRedirectTo);

  // Redirect to sign-in if not authenticated
  if (!context.userId) {
    redirect("/bridge");
  }

  // If no client memberships, redirect to no-access page
  if (!context.clientMemberships || context.clientMemberships.length === 0) {
    redirect("/bridge/no-access");
  }

  // If only 1 client, shouldn't reach here (auto-selected), but handle gracefully
  if (context.clientMemberships.length === 1) {
    redirect("/bridge");
  }

  // Fetch studio branding for each membership
  const studioIds = [...new Set(context.clientMemberships.map((m) => m.studioId))];
  const studioBranding = await getStudiosForPicker(studioIds);

  // Enrich memberships with studio branding
  const enrichedMemberships = context.clientMemberships.map((m) => ({
    ...m,
    studio: studioBranding.get(m.studioId),
  }));

  // Show client picker for 2+ clients
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Choose your portal</CardTitle>
          <CardDescription>
            You have access to multiple portals. Select one to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClientPickerForm memberships={enrichedMemberships} />

          <p className="text-center text-sm text-muted-foreground">
            You can switch anytime from the portal menu
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

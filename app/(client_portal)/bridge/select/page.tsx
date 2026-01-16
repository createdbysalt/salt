import { getTenantContext } from "@/libs/tenancy";
import { safeRedirectPath } from "@/libs/safe-redirect";
import { redirect } from "next/navigation";
import { ClientPickerForm } from "./ClientPickerForm";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/app/_components/ui/card";

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
    redirect("/bridge/login");
  }
  
  // If no client memberships, show no access
  if (!context.clientMemberships || context.clientMemberships.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">No Access</CardTitle>
            <CardDescription>
              You don&apos;t have access to any clients.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Contact your studio for access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // If only 1 client, shouldn't reach here (auto-selected), but handle gracefully
  if (context.clientMemberships.length === 1) {
    redirect("/bridge");
  }
  
  // Show client picker for 2+ clients
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            Choose a client to open the bridge
          </CardTitle>
          <CardDescription>
            You have access to multiple clients. Select one to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClientPickerForm memberships={context.clientMemberships} />
          
          <p className="text-center text-sm text-muted-foreground">
            You can switch clients anytime
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

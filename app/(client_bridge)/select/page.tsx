import { getTenantContext } from "@/libs/tenancy";
import { safeRedirectPath } from "@/libs/safe-redirect";
import { redirect } from "next/navigation";
import { ClientPickerForm } from "./ClientPickerForm";

export const dynamic = "force-dynamic";

/**
 * Client selection page for multi-client Bridge users (production route group).
 * Shown when a user has access to 2+ clients and needs to choose which one to view.
 */
export default async function BridgeSelectPage() {
  const { context, redirectTo, allowed } = await getTenantContext();

  const safeRedirectTo = safeRedirectPath(redirectTo);
  if (safeRedirectTo) redirect(safeRedirectTo);
  
  // Redirect to Bridge login if not authenticated
  if (!context.userId) {
    redirect("/bridge/login");
  }
  
  // If no client memberships, show no access
  if (!context.clientMemberships || context.clientMemberships.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="card bg-card shadow-xl max-w-md">
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold text-error justify-center">No Access</h2>
            <p>You don&apos;t have access to any clients.</p>
            <p className="text-sm text-muted-foreground">
              Contact your studio for access.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // If only 1 client, shouldn't reach here (auto-selected), but handle gracefully
  if (context.clientMemberships.length === 1) {
    redirect("/bridge");
  }
  
  // Show client picker for 2+ clients
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="card bg-card shadow-xl w-full max-w-lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-2xl justify-center mb-2">
            Choose a client to open the bridge
          </h2>
          <p className="text-center text-muted-foreground mb-6">
            You have access to multiple clients. Select one to continue.
          </p>
          
          <ClientPickerForm memberships={context.clientMemberships} />
          
          <p className="text-center text-sm text-muted-foreground mt-4">
            You can switch clients anytime
          </p>
        </div>
      </div>
    </div>
  );
}


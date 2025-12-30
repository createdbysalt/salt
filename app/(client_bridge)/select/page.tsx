import { getTenantContext } from "@/libs/tenancy";
import { redirect } from "next/navigation";
import { ClientPickerForm } from "./ClientPickerForm";

export const dynamic = "force-dynamic";

/**
 * Client selection page for multi-client Bridge users (production route group).
 * Shown when a user has access to 2+ clients and needs to choose which one to view.
 */
export default async function BridgeSelectPage() {
  const { context } = await getTenantContext();
  
  // Redirect to sign-in if not authenticated
  if (!context.userId) {
    redirect("/signin");
  }
  
  // If no client memberships, show no access
  if (!context.clientMemberships || context.clientMemberships.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card bg-base-100 shadow-xl max-w-md">
          <div className="card-body text-center">
            <h2 className="card-title text-error justify-center">No Access</h2>
            <p>You don&apos;t have access to any clients.</p>
            <p className="text-sm text-base-content/70">
              Contact your studio for access.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // If only 1 client, shouldn't reach here (auto-selected), but handle gracefully
  if (context.clientMemberships.length === 1) {
    redirect("/");
  }
  
  // Show client picker for 2+ clients
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card bg-base-100 shadow-xl w-full max-w-lg">
        <div className="card-body">
          <h2 className="card-title text-2xl justify-center mb-2">
            Choose a client to open the bridge
          </h2>
          <p className="text-center text-base-content/70 mb-6">
            You have access to multiple clients. Select one to continue.
          </p>
          
          <ClientPickerForm memberships={context.clientMemberships} />
          
          <p className="text-center text-sm text-base-content/50 mt-4">
            You can switch clients anytime
          </p>
        </div>
      </div>
    </div>
  );
}


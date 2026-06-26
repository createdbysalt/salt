import { NextResponse } from "next/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { extractClientContext } from "@/app/_features/intelligence/generators";

/**
 * GET /api/intelligence/client-context
 *
 * Fetch client intelligence context for proposal generation.
 * Includes health score, LTV, project history, payment history, and pricing suggestions.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 }
      );
    }

    // Verify authentication and studio membership
    const { context } = await getTenantContext();
    requireWorkspaceMember(context);

    // Extract client context
    const clientContext = await extractClientContext({
      clientId,
      includeProjectHistory: true,
      includePaymentHistory: true,
      includeHealthScore: true,
    });

    if (!clientContext) {
      return NextResponse.json(
        { error: "Client not found or no context available" },
        { status: 404 }
      );
    }

    return NextResponse.json(clientContext);
  } catch (error) {
    console.error("Error fetching client context:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch client context" },
      { status: 500 }
    );
  }
}

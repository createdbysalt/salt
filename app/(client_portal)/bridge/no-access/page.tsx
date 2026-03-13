import { getTenantContext } from "@/app/_lib/tenancy";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from "@repo/ui";
import { ShieldXIcon, MailIcon, ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * No Access page for Bridge users who don't have any client memberships.
 * Shows a helpful message and contact options.
 */
export default async function BridgeNoAccessPage() {
  const { context } = await getTenantContext();

  // If not authenticated, redirect to login
  if (!context.userId) {
    redirect("/bridge");
  }

  // If user actually has access, redirect to Bridge
  if (context.clientMemberships && context.clientMemberships.length > 0) {
    redirect("/bridge");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ShieldXIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">No Portal Access</CardTitle>
          <CardDescription className="text-base">
            Your account doesn&apos;t have access to any client portals yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p>
              If you&apos;re expecting access, please contact the studio or agency
              that invited you. They can add you to their client portal.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button variant="outline" asChild className="w-full">
              <Link href="/bridge">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Try a different email
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            <MailIcon className="inline h-3 w-3 mr-1" />
            Signed in as: {context.metadata?.userAgent ? "authenticated user" : "unknown"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

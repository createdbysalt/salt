import { notFound } from "next/navigation";
import { getPlatformAdmin } from "@/app/_features/connectors/admin/platform-admin";
import { getReviewQueueData } from "@/app/_features/connectors/admin/queries";
import { ClassificationReviewQueue } from "@/app/_features/connectors/admin/components/ClassificationReviewQueue";

export const dynamic = "force-dynamic";

/**
 * Platform-admin classification review queue (connector-platform Phase 2.6).
 * Not in the nav — reachable only by PLATFORM_ADMIN_EMAILS; everyone else 404s.
 */
export default async function ConnectorAdminPage() {
  const admin = await getPlatformAdmin();
  if (!admin.ok) {
    notFound();
  }

  const data = await getReviewQueueData();
  if (!data) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-10">
      <header className="space-y-1">
        <p className="salt-eyebrow text-muted-foreground">Platform admin</p>
        <h1 className="font-display text-2xl text-foreground">
          Tool classification review
        </h1>
        <p className="text-sm text-muted-foreground">
          Every tool starts unusable. Salt proposes a risk class; you approve.
          Approved tools become executable under the trust ladder —
          destructive tools never execute.
        </p>
      </header>
      <ClassificationReviewQueue data={data} />
    </div>
  );
}

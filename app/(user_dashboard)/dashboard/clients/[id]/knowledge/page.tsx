import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KnowledgePageClient } from "./KnowledgePageClient";
import { listKnowledgeItems, getKnowledgeTags } from "@/app/_features/knowledge/queries";
import { PageHeader } from "@repo/patterns";

export const dynamic = "force-dynamic";

export default async function KnowledgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { studio, supabase } = await getStudioContext();

  // Get client details
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, name, slug")
    .eq("id", id)
    .eq("studio_id", studio.id)
    .single();

  if (error || !client) {
    notFound();
  }

  // Fetch initial knowledge items
  const itemsResult = await listKnowledgeItems(id);
  const items = itemsResult.success ? itemsResult.data.items : [];
  const totalItems = itemsResult.success ? itemsResult.data.total : 0;

  // Fetch available tags for filtering
  const tagsResult = await getKnowledgeTags(id);
  const availableTags = tagsResult.success ? tagsResult.data : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Knowledge Base"
        description={`${totalItems} ${totalItems === 1 ? "item" : "items"} for ${client.name}`}
        breadcrumbs={
          <Link
            href={`/dashboard/clients/${id}`}
            className="hover:text-foreground inline-flex items-center gap-1"
          >
            ← Back to {client.name}
          </Link>
        }
        noBorder
      />

      {/* Client component for interactive search/filter/list */}
      <KnowledgePageClient
        clientId={id}
        clientName={client.name}
        initialItems={items}
        initialTags={availableTags}
      />
    </div>
  );
}

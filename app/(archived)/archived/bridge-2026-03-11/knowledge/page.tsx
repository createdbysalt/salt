import { getTenantContext } from "@/app/_lib/tenancy";
import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import {
  listPublicKnowledgeItems,
  getPublicKnowledgeTags,
} from "@/app/_features/knowledge/queries";
import { BridgeKnowledgePageClient } from "./BridgeKnowledgePageClient";

export const dynamic = "force-dynamic";

export default async function BridgeKnowledgePage() {
  const { context } = await getTenantContext();

  if (!context.userId) {
    redirect("/");
  }

  if (!context.client) {
    redirect("/select");
  }

  const supabase = await createClient();

  // Fetch knowledge items and tags in parallel
  const [itemsResult, tagsResult] = await Promise.all([
    listPublicKnowledgeItems(context.client.id, supabase),
    getPublicKnowledgeTags(context.client.id, supabase),
  ]);

  const items = itemsResult.success ? itemsResult.data : [];
  const availableTags = tagsResult.success ? tagsResult.data : [];

  return (
    <BridgeKnowledgePageClient
      initialItems={items}
      availableTags={availableTags}
    />
  );
}

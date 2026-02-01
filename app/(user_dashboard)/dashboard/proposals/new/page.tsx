import { NewProposalForm } from "./NewProposalForm";
import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import { getTemplateKeys, defaultTemplates } from "@/app/_features/proposals/templates";
import Link from "next/link";
import { PageHeader } from "@repo/patterns";

export const dynamic = "force-dynamic";

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{
    client?: string;
    template?: string;
  }>;
}) {
  const params = await searchParams;
  const { studio, supabase } = await getStudioContext();

  // Fetch clients for the dropdown
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, contact_email")
    .eq("studio_id", studio.id)
    .order("name");

  // Get available code-based templates
  const templateKeys = getTemplateKeys();
  const templates = templateKeys.map((key) => ({
    id: key,
    name: defaultTemplates[key].name,
    description: defaultTemplates[key].description,
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="New Proposal"
        description="Create a new proposal for a client"
        breadcrumbs={
          <Link
            href="/dashboard/proposals"
            className="hover:text-foreground inline-flex items-center gap-1"
          >
            ← Back to Proposals
          </Link>
        }
        noBorder
      />

      <NewProposalForm
        clients={clients || []}
        templates={templates}
        preselectedClientId={params.client}
        preselectedTemplateId={params.template}
      />
    </div>
  );
}

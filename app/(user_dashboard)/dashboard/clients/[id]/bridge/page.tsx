import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BridgeConfigEditor } from "@/app/_features/portal/components/bridge-config-editor";
import {
  getDefaultBridgeOverviewConfig,
  mergeBridgeOverviewConfig,
} from "@/app/_lib/bridge/overview-config";

export const dynamic = "force-dynamic";

export default async function ClientBridgeConfigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  let studio, supabase;
  try {
    const context = await getStudioContext();
    studio = context.studio;
    supabase = context.supabase;
  } catch (error) {
    console.error("Error getting studio context:", error);
    notFound();
  }

  // Get client details with settings
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, name, settings")
    .eq("id", id)
    .eq("studio_id", studio.id)
    .single();

  if (error || !client) {
    notFound();
  }

  // Get or create Bridge config
  const savedConfig = client.settings?.bridge?.overview;
  const config = savedConfig
    ? mergeBridgeOverviewConfig(savedConfig)
    : getDefaultBridgeOverviewConfig();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/clients/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"
        >
          ← Back to {client.name}
        </Link>
      </div>

      <BridgeConfigEditor
        clientId={id}
        clientName={client.name}
        initialConfig={config}
      />
    </div>
  );
}


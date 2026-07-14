import { checkConnectionHealth } from "@/app/_lib/composio/connections";
import { getAskSaltToolkits } from "@/app/_lib/composio/unified-connector-registry";
import { createClient } from "@/app/_lib/supabase/server";

export const dynamic = "force-dynamic";

async function getWorkspaceId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  return membership?.workspace_id ?? null;
}

export default async function ConnectionHealthPage() {
  const workspaceId = await getWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Connection Health Check</h1>
        <p className="text-red-500">Not authenticated or no workspace found.</p>
      </div>
    );
  }

  // Use the unified registry as source of truth for Ask Salt enabled connectors
  const providers = getAskSaltToolkits();

  const healthChecks = await Promise.all(
    providers.map(async (provider) => {
      const health = await checkConnectionHealth(provider, workspaceId);
      return { provider, health };
    }),
  );

  const connected = healthChecks.filter(({ health }) => health.composioConnectionId);
  const disconnected = healthChecks.filter(({ health }) => !health.composioConnectionId);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Connection Health Check</h1>
      <p className="text-muted-foreground mb-6">
        Workspace: <code className="bg-muted px-1 rounded">{workspaceId}</code>
      </p>

      <h2 className="text-xl font-semibold mb-4">Connected ({connected.length})</h2>
      {connected.length === 0 ? (
        <p className="text-muted-foreground mb-8">No connectors connected.</p>
      ) : (
        <div className="space-y-4 mb-8">
          {connected.map(({ provider, health }) => (
            <div
              key={provider}
              className={`border rounded-lg p-4 ${
                health.healthy ? "border-green-500 bg-green-500/5" : "border-red-500 bg-red-500/5"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{provider}</h3>
                <span
                  className={`px-2 py-0.5 rounded text-sm ${
                    health.healthy ? "bg-green-500/20 text-green-700" : "bg-red-500/20 text-red-700"
                  }`}
                >
                  {health.healthy ? "Healthy" : "Unhealthy"}
                </span>
              </div>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Connection ID:</span>{" "}
                  <code className="bg-muted px-1 rounded text-xs">{health.composioConnectionId}</code>
                </p>
                <p>
                  <span className="text-muted-foreground">Local Status:</span>{" "}
                  <span className={health.localStatus === "connected" ? "text-green-600" : "text-red-600"}>
                    {health.localStatus ?? "unknown"}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Remote Status:</span>{" "}
                  <span className={health.remoteStatus === "connected" ? "text-green-600" : "text-red-600"}>
                    {health.remoteStatus ?? "unknown"}
                  </span>
                </p>
                {health.localStatus !== health.remoteStatus && (
                  <p className="text-orange-600 font-medium">
                    Status drift detected! Local and remote status don&apos;t match.
                  </p>
                )}
                {health.diagnostics.rawStatus && (
                  <p>
                    <span className="text-muted-foreground">Raw Composio Status:</span>{" "}
                    {health.diagnostics.rawStatus}
                  </p>
                )}
                {health.diagnostics.createdAt && (
                  <p>
                    <span className="text-muted-foreground">Created:</span>{" "}
                    {new Date(health.diagnostics.createdAt).toLocaleString()}
                  </p>
                )}
                {health.diagnostics.updatedAt && (
                  <p>
                    <span className="text-muted-foreground">Updated:</span>{" "}
                    {new Date(health.diagnostics.updatedAt).toLocaleString()}
                  </p>
                )}
                {health.diagnostics.tokenExpiresAt && (
                  <p>
                    <span className="text-muted-foreground">Token Expires:</span>{" "}
                    {new Date(health.diagnostics.tokenExpiresAt).toLocaleString()}
                  </p>
                )}
                {health.diagnostics.errorMessage && (
                  <p className="text-red-600">
                    <span className="text-muted-foreground">Error:</span>{" "}
                    {health.diagnostics.errorMessage}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">Not Connected ({disconnected.length})</h2>
      <div className="flex flex-wrap gap-2">
        {disconnected.map(({ provider }) => (
          <span key={provider} className="px-2 py-1 bg-muted rounded text-sm">
            {provider}
          </span>
        ))}
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Debug Tips</h3>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>Check server logs for <code>[composio-health]</code> entries</li>
          <li>Check server logs for <code>[composio-tool-exec]</code> on tool failures</li>
          <li>If status is &quot;expired&quot;, disconnect and reconnect at /connections</li>
          <li>Token expiry times help predict when connections will fail</li>
        </ul>
      </div>
    </div>
  );
}

import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { resolveAskSaltCapabilities } from "@/app/_lib/composio/ask-salt-capabilities";
import { getAskSaltConnectionStatuses } from "@/app/_lib/composio/ask-salt-capabilities";
import { isComposioConfigured } from "@/app/_lib/composio/connections";
import { CONNECTOR_REGISTRY, getAskSaltManifest } from "@/app/_lib/composio/unified-connector-registry";

export default async function ComposioTestPage() {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);

  const composioConfigured = isComposioConfigured();
  const connectionStatuses = await getAskSaltConnectionStatuses(workspace.id);
  const capabilities = await resolveAskSaltCapabilities(workspace.id, context.userId ?? undefined);

  // Source of truth: unified registry
  const allConnectors = Object.entries(CONNECTOR_REGISTRY).map(([key, def]) => ({
    key,
    name: def.meta.displayName,
    category: def.category,
    askSaltEnabled: def.askSalt.enabled,
    slugPrefix: def.askSalt.slugPrefix,
    phase: def.phase,
  }));

  const askSaltEnabledConnectors = allConnectors.filter((c) => c.askSaltEnabled);
  const askSaltDisabledConnectors = allConnectors.filter((c) => !c.askSaltEnabled);
  const askSaltManifest = getAskSaltManifest();

  return (
    <div className="p-8 font-mono text-sm space-y-8">
      <h1 className="text-2xl font-bold">Composio Connector Diagnostic</h1>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded">
        <strong>Source of Truth:</strong> <code>app/_lib/composio/unified-connector-registry.ts</code>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2">Environment</h2>
        <pre className="bg-muted p-4 rounded overflow-auto">
          {JSON.stringify(
            {
              composioConfigured,
              workspaceId: workspace.id,
              userId: context.userId,
            },
            null,
            2
          )}
        </pre>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Unified Registry Summary</h2>
        <pre className="bg-muted p-4 rounded overflow-auto">
          {JSON.stringify(
            {
              totalConnectors: allConnectors.length,
              askSaltEnabled: askSaltEnabledConnectors.length,
              askSaltDisabled: askSaltDisabledConnectors.length,
              manifestToolkits: askSaltManifest.map((m) => m.toolkit),
            },
            null,
            2
          )}
        </pre>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2 text-green-700">
          Ask Salt ENABLED ({askSaltEnabledConnectors.length})
        </h2>
        <pre className="bg-green-50 p-4 rounded overflow-auto">
          {JSON.stringify(askSaltEnabledConnectors, null, 2)}
        </pre>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2 text-orange-700">
          Ask Salt DISABLED ({askSaltDisabledConnectors.length})
        </h2>
        <pre className="bg-orange-50 p-4 rounded overflow-auto">
          {JSON.stringify(askSaltDisabledConnectors, null, 2)}
        </pre>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Workspace Connection Statuses</h2>
        <pre className="bg-muted p-4 rounded overflow-auto">
          {JSON.stringify(connectionStatuses, null, 2)}
        </pre>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Capabilities Result (runtime)</h2>
        <pre className="bg-muted p-4 rounded overflow-auto">
          {JSON.stringify(
            {
              composioConfigured: capabilities.composioConfigured,
              loadError: capabilities.loadError,
              providers: capabilities.providers,
              composioToolCount: Object.keys(capabilities.composioTools).length,
              composioToolNames: Object.keys(capabilities.composioTools).slice(0, 30),
            },
            null,
            2
          )}
        </pre>
      </section>

      {capabilities.loadError && (
        <section className="bg-destructive/10 border border-destructive p-4 rounded">
          <h2 className="text-lg font-semibold mb-2 text-destructive">Load Error</h2>
          <pre className="text-destructive">{capabilities.loadError}</pre>
        </section>
      )}
    </div>
  );
}

interface SettingsPageProps {
  title: string
  children: React.ReactNode
}

const SETTINGS_PAGE_DESCRIPTIONS: Record<string, string> = {
  General: "Tune interface preferences and how Salt gets your attention.",
  Account: "Manage your identity, email, and account actions.",
  Privacy: "Control data permissions, retention, and privacy defaults.",
  Billing: "Manage your Salt subscription, invoices, and payment method.",
  Usage: "Track AI credits, limits, and workspace consumption.",
  Connectors: "Connect the accounts Salt reads from and acts through.",
  Business: "Set workspace, brand, voice, service, and team defaults.",
  Plays: "Configure how Salt prepares and runs approved playbooks.",
  Capture: "Control what Salt captures and how incoming context is routed.",
  Memory: "Organize people, work, tags, and durable business context.",
  Profile: "Set the workspace identity Salt uses across your business.",
  Brand: "Shape the visual defaults for client-facing work and generated materials.",
  Services: "Define the offers, deliverables, and pricing Salt can reference.",
  Tags: "Organize people and work with consistent labels.",
  Team: "Invite collaborators and manage workspace access.",
  Spaces: "Set workspace defaults for role-aware collaboration spaces.",
}

export function SettingsPage({ title, children }: SettingsPageProps) {
  const description = SETTINGS_PAGE_DESCRIPTIONS[title]

  return (
    <div className="relative flex min-h-full flex-col px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-3xl pb-10">
        <div className="mb-8 max-w-2xl">
          <h1 className="font-display text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        <div className="space-y-8">
          {children}
        </div>
      </div>
    </div>
  )
}

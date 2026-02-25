"use client"

import * as React from "react"
import { Globe, Plus, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Button, Badge, Skeleton } from "@repo/ui"
import { SettingsPage } from "../SettingsPage"
import { SettingsSection } from "../SettingsSection"
import { DomainWizard } from "@/app/_features/serve/components/domain-wizard"
import { DomainStatusCard } from "@/app/_features/serve/components/domain-status-card"
import { getStudioDomains } from "@/app/_features/serve/actions"
import { useStudioProfile } from "@/app/_features/studio/hooks/useStudioProfile"

interface Domain {
  id: string
  hostname: string
  status: string
  ssl_status: string | null
  verified_at: string | null
  created_at: string
}

export function StudioDomainsSection() {
  const { studio, isLoading: studioLoading, error: studioError } = useStudioProfile()
  const [domains, setDomains] = React.useState<Domain[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [showWizard, setShowWizard] = React.useState(false)

  const loadDomains = React.useCallback(async () => {
    if (!studio?.id) return

    setIsLoading(true)
    const result = await getStudioDomains(studio.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      setDomains(result.domains)
    }
    setIsLoading(false)
  }, [studio?.id])

  React.useEffect(() => {
    if (studio?.id) {
      loadDomains()
    }
  }, [studio?.id, loadDomains])

  const handleDomainAdded = () => {
    setShowWizard(false)
    loadDomains()
  }

  const handleDomainRemoved = () => {
    loadDomains()
  }

  if (studioLoading) {
    return (
      <SettingsPage title="Domain">
        <SettingsSection title="Custom Domain" description="Use your own domain for your client portal">
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </SettingsSection>
      </SettingsPage>
    )
  }

  if (!studio || studioError) {
    return (
      <SettingsPage title="Domain">
        <SettingsSection title="Custom Domain" description="Use your own domain for your client portal">
          <div className="rounded-lg border-2 border-dashed bg-muted/30 p-6">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-3">
                <Globe className="size-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">Studio Not Found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Unable to load your studio profile. Please try refreshing the page.
              </p>
            </div>
          </div>
        </SettingsSection>
      </SettingsPage>
    )
  }

  if (isLoading) {
    return (
      <SettingsPage title="Domain">
        <SettingsSection title="Custom Domain" description="Use your own domain for your client portal">
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </SettingsSection>
      </SettingsPage>
    )
  }

  const defaultBridgeUrl = `bridge.saltcore.io/${studio?.slug || "your-studio"}`

  return (
    <SettingsPage title="Domain">
      {/* Default Portal URL */}
      <SettingsSection
        title="Default Portal URL"
        description="Your clients can always access their portal at this URL"
      >
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Globe className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-mono text-sm">{defaultBridgeUrl}</p>
                <p className="text-xs text-muted-foreground">
                  Salt Core hosted URL
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`https://${defaultBridgeUrl}`, "_blank")}
            >
              <ExternalLink className="size-4" />
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* Custom Domain */}
      <SettingsSection
        title="Custom Domain"
        description="Connect your own domain for a branded client experience"
      >
        {/* Show wizard when adding */}
        {showWizard ? (
          <div className="space-y-3">
            <DomainWizard
              studioId={studio?.id || ""}
              onDomainAdded={handleDomainAdded}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWizard(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        ) : domains.length > 0 ? (
          /* Has domains - show compact list with inline add button */
          <div className="space-y-3">
            {domains.map((domain) => (
              <DomainStatusCard
                key={domain.id}
                domain={domain}
                onRemoved={handleDomainRemoved}
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWizard(true)}
              className="w-full"
            >
              <Plus className="size-4 mr-2" />
              Add Another Domain
            </Button>
          </div>
        ) : (
          /* No domains - show empty state with setup instructions */
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-dashed bg-muted/30 p-6">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-3">
                  <Globe className="size-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">Add Custom Domain</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Use your own domain like portal.yourstudio.com for a fully branded experience
                </p>
                <Button onClick={() => setShowWizard(true)}>
                  <Plus className="size-4 mr-2" />
                  Add Domain
                </Button>
              </div>
            </div>

            {/* Only show "How it works" when no domains exist */}
            <div className="rounded-lg bg-muted/50 p-4 text-sm">
              <p className="font-medium mb-2">How it works</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Enter your domain (e.g., portal.yourstudio.com)</li>
                <li>Add DNS records at your domain provider</li>
                <li>Wait for verification (usually within minutes)</li>
                <li>SSL certificate is automatically provisioned</li>
              </ol>
            </div>
          </div>
        )}
      </SettingsSection>
    </SettingsPage>
  )
}

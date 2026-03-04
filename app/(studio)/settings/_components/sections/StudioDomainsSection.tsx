"use client"

import * as React from "react"
import { Globe, Plus, ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button, Badge, Skeleton, Input } from "@repo/ui"
import { SettingsPage } from "../SettingsPage"
import { SettingsSection } from "../SettingsSection"
import { SettingsCard } from "../SettingsCard"
import { SettingsRow } from "../SettingsRow"
import { DomainWizard } from "@/app/_features/serve/components/domain-wizard"
import { DomainStatusCard } from "@/app/_features/serve/components/domain-status-card"
import { getStudioDomains } from "@/app/_features/serve/actions"
import { useStudioProfile } from "@/app/_features/studio/hooks/useStudioProfile"
import { updateStudioProfile } from "@/app/_features/studio/actions"

interface Domain {
  id: string
  hostname: string
  status: string
  ssl_status: string | null
  verified_at: string | null
  created_at: string
}

export function StudioDomainsSection() {
  const { studio, isLoading: studioLoading, error: studioError, mutate } = useStudioProfile()
  const [domains, setDomains] = React.useState<Domain[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [showWizard, setShowWizard] = React.useState(false)
  const [slug, setSlug] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  // Sync slug with studio data
  React.useEffect(() => {
    if (studio?.slug) {
      setSlug(studio.slug)
    }
  }, [studio?.slug])

  const handleSlugBlur = async () => {
    if (slug !== studio?.slug && slug.trim()) {
      // Validate slug format
      if (!/^[a-z0-9-]+$/.test(slug)) {
        toast.error("URL can only contain lowercase letters, numbers, and hyphens")
        setSlug(studio?.slug || "")
        return
      }
      setIsSaving(true)
      const result = await updateStudioProfile({ slug })
      if (result.error) {
        toast.error(result.error)
        setSlug(studio?.slug || "")
      } else {
        toast.success("Portal URL updated")
        mutate()
      }
      setIsSaving(false)
    }
  }

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

  const defaultBridgeUrl = `bridge.saltcore.io/${slug || "your-studio"}`

  return (
    <SettingsPage title="Domain">
      {/* Default Portal URL */}
      <SettingsSection
        title="Portal URL"
        description="Your client portal address on Salt Core"
      >
        <SettingsCard>
          <SettingsRow label="Portal URL" description="Your client portal address">
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">bridge.saltcore.io/</span>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className="w-32"
                onBlur={handleSlugBlur}
                disabled={isSaving}
                placeholder="your-studio"
              />
              {isSaving && <Loader2 className="size-4 animate-spin ml-2" />}
            </div>
          </SettingsRow>
        </SettingsCard>
        <div className="flex items-center justify-between px-1 pt-2">
          <p className="text-xs text-muted-foreground">
            Full URL: <span className="font-mono">{defaultBridgeUrl}</span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => window.open(`https://${defaultBridgeUrl}`, "_blank")}
          >
            <ExternalLink className="size-3 mr-1" />
            Preview
          </Button>
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

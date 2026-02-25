"use client"

import * as React from "react"
import { ArrowUpRight, ChevronDown, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter, useSearchParams } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui"
import {
  startStripeConnectOnboardingAction,
  refreshStripeConnectStatusAction,
  disconnectStripeConnectAction,
} from "@/app/actions/integrations/stripe-connect-actions"
import { SettingsPage } from "../SettingsPage"

// Brand logos as SVG components
function GoogleCalendarLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="2" fill="#fff"/>
      <rect x="2" y="2" width="20" height="5" rx="1" fill="#4285F4"/>
      <rect x="5" y="9" width="3" height="3" rx="0.5" fill="#EA4335"/>
      <rect x="10.5" y="9" width="3" height="3" rx="0.5" fill="#FBBC05"/>
      <rect x="16" y="9" width="3" height="3" rx="0.5" fill="#34A853"/>
      <rect x="5" y="14" width="3" height="3" rx="0.5" fill="#4285F4"/>
      <rect x="10.5" y="14" width="3" height="3" rx="0.5" fill="#EA4335"/>
      <rect x="16" y="14" width="3" height="3" rx="0.5" fill="#FBBC05"/>
    </svg>
  )
}

function StripeLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="4" fill="#635BFF"/>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.088 8.412c0-.792.648-1.098 1.722-1.098 1.539 0 3.48.468 5.019 1.302V4.992c-1.683-.666-3.348-.936-5.019-.936-4.104 0-6.831 2.142-6.831 5.724 0 5.58 7.686 4.686 7.686 7.092 0 .936-.81 1.242-1.944 1.242-1.683 0-3.834-.702-5.535-1.638v3.672c1.881.81 3.78 1.152 5.535 1.152 4.203 0 7.092-2.079 7.092-5.706-.018-6.03-7.725-4.95-7.725-7.182z"
        fill="#fff"
      />
    </svg>
  )
}

function CalcomLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="4" fill="#111827"/>
      <path
        d="M12 4C7.582 4 4 7.582 4 12s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8zm0 14.4A6.407 6.407 0 015.6 12 6.407 6.407 0 0112 5.6a6.407 6.407 0 016.4 6.4 6.407 6.407 0 01-6.4 6.4z"
        fill="#fff"
      />
      <path
        d="M12 7.2a4.8 4.8 0 100 9.6 4.8 4.8 0 000-9.6zm0 7.68a2.88 2.88 0 110-5.76 2.88 2.88 0 010 5.76z"
        fill="#fff"
      />
    </svg>
  )
}

interface IntegrationsSectionProps {
  integrations?: {
    googleCalendar?: {
      connected: boolean
      email?: string
    }
    stripe?: {
      connected: boolean
      accountId?: string
      status?: string
      chargesEnabled?: boolean
    }
    calcom?: {
      connected: boolean
      username?: string
    }
  }
}

interface IntegrationCardProps {
  icon: React.ReactNode
  name: string
  description: string
  connected: boolean
  connectedLabel?: string
  onConnect: () => void
  onDisconnect: () => void
  disabled?: boolean
  loading?: boolean
}

function IntegrationCard({
  icon,
  name,
  description,
  connected,
  connectedLabel,
  onConnect,
  onDisconnect,
  disabled,
  loading,
}: IntegrationCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
      {/* Icon */}
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted overflow-hidden">
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-medium">{name}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>

      {/* Action */}
      <div className="shrink-0">
        {connected ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-2 text-sm font-medium outline-none"
              disabled={disabled || loading}
            >
              <span className="size-2 rounded-full bg-green-500" />
              {connectedLabel || "Connected"}
              <ChevronDown className="size-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={onDisconnect}
                className="text-destructive focus:text-destructive"
              >
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={onConnect}
            disabled={disabled || loading}
            className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-muted-foreground transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                Connect
                <ArrowUpRight className="size-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export function IntegrationsSection({ integrations }: IntegrationsSectionProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isConnecting, setIsConnecting] = React.useState<string | null>(null)

  const googleCalendar = integrations?.googleCalendar || { connected: false }
  const stripe = integrations?.stripe || { connected: false }
  const calcom = integrations?.calcom || { connected: false }

  // Handle Stripe return status from query params
  const stripeReturnStatus = searchParams.get("stripe") as "complete" | "refresh" | null

  React.useEffect(() => {
    if (stripeReturnStatus === "complete") {
      // User returned from Stripe onboarding - refresh status
      refreshStripeConnectStatusAction().then((result) => {
        if (result.success) {
          if (result.data.chargesEnabled) {
            toast.success("Stripe connected successfully!")
          } else {
            toast.info("Stripe setup incomplete. Please complete the remaining steps.")
          }
        }
        // Remove the query param
        router.replace("/settings/integrations")
      })
    } else if (stripeReturnStatus === "refresh") {
      // User needs to restart onboarding
      toast.info("Please complete Stripe setup to start accepting payments.")
      router.replace("/settings/integrations")
    }
  }, [stripeReturnStatus, router])

  const handleConnectGoogle = async () => {
    setIsConnecting("google")
    toast.info("Google Calendar connection coming soon")
    setIsConnecting(null)
  }

  const handleDisconnectGoogle = async () => {
    setIsConnecting("google")
    toast.success("Google Calendar disconnected")
    setIsConnecting(null)
  }

  const handleConnectStripe = async () => {
    setIsConnecting("stripe")

    const result = await startStripeConnectOnboardingAction()

    if (result.success) {
      // Redirect to Stripe onboarding
      window.location.href = result.data.url
    } else {
      toast.error(result.error)
      setIsConnecting(null)
    }
  }

  const handleDisconnectStripe = async () => {
    setIsConnecting("stripe")

    const result = await disconnectStripeConnectAction()

    if (result.success) {
      toast.success("Stripe disconnected")
    } else {
      toast.error(result.error)
    }
    setIsConnecting(null)
  }

  const handleConnectCalcom = async () => {
    setIsConnecting("calcom")
    toast.info("Cal.com connection coming soon")
    setIsConnecting(null)
  }

  const handleDisconnectCalcom = async () => {
    setIsConnecting("calcom")
    toast.success("Cal.com disconnected")
    setIsConnecting(null)
  }

  return (
    <SettingsPage title="Integrations">
      <div className="space-y-3">
        <IntegrationCard
          icon={<GoogleCalendarLogo className="size-7" />}
          name="Google Calendar"
          description="Sync your calendar to manage availability and meetings"
          connected={googleCalendar.connected}
          onConnect={handleConnectGoogle}
          onDisconnect={handleDisconnectGoogle}
          disabled={isConnecting === "google"}
          loading={isConnecting === "google"}
        />

        <IntegrationCard
          icon={<CalcomLogo className="size-7" />}
          name="Cal.com"
          description="Schedule meetings with clients using your booking page"
          connected={calcom.connected}
          onConnect={handleConnectCalcom}
          onDisconnect={handleDisconnectCalcom}
          disabled={isConnecting === "calcom"}
          loading={isConnecting === "calcom"}
        />

        <IntegrationCard
          icon={<StripeLogo className="size-7" />}
          name="Stripe"
          description="Connect to receive payments and manage invoices"
          connected={stripe.connected}
          onConnect={handleConnectStripe}
          onDisconnect={handleDisconnectStripe}
          disabled={isConnecting === "stripe"}
          loading={isConnecting === "stripe"}
        />
      </div>
    </SettingsPage>
  )
}

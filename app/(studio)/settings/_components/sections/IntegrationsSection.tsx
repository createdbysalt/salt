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
import { connectGoogle } from "@/app/actions/gmail/connect"
import { disconnectGmail } from "@/app/actions/gmail/disconnect"
import { SettingsPage } from "../SettingsPage"

// Brand logos as SVG components
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="4" fill="#fff"/>
      <path d="M21.8055 10.0415H21V10H12V14H17.6515C16.827 16.3285 14.6115 18 12 18C8.6865 18 6 15.3135 6 12C6 8.6865 8.6865 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C6.4775 2 2 6.4775 2 12C2 17.5225 6.4775 22 12 22C17.5225 22 22 17.5225 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#FFC107"/>
      <path d="M3.15295 7.3455L6.43845 9.755C7.32745 7.554 9.48045 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C8.15895 2 4.82795 4.1685 3.15295 7.3455Z" fill="#FF3D00"/>
      <path d="M12 22C14.583 22 16.93 21.0115 18.7045 19.404L15.6095 16.785C14.5718 17.5742 13.3038 18.001 12 18C9.39903 18 7.19053 16.3415 6.35853 14.027L3.09753 16.5395C4.75253 19.778 8.11353 22 12 22Z" fill="#4CAF50"/>
      <path d="M21.8055 10.0415H21V10H12V14H17.6515C17.2571 15.1082 16.5467 16.0766 15.608 16.7855L15.6095 16.7845L18.7045 19.4035C18.4855 19.6025 22 17 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#1976D2"/>
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
    google?: {
      connected: boolean
      email?: string
      studioId?: string
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
  // Prevent hydration mismatch from Radix DropdownMenu random IDs
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

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
        {connected && mounted ? (
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
        ) : connected ? (
          // Server-side placeholder to prevent layout shift
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="size-2 rounded-full bg-green-500" />
            {connectedLabel || "Connected"}
            <ChevronDown className="size-4 text-muted-foreground" />
          </div>
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
  const [mounted, setMounted] = React.useState(false)

  const google = integrations?.google || { connected: false }
  const stripe = integrations?.stripe || { connected: false }
  const calcom = integrations?.calcom || { connected: false }

  // Handle Stripe return status from query params
  const stripeReturnStatus = searchParams.get("stripe") as "complete" | "refresh" | null
  const googleConnected = searchParams.get("gmail_connected") || searchParams.get("google_connected")
  const googleError = searchParams.get("gmail_error") || searchParams.get("google_error")

  // Set mounted after hydration
  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!mounted) return
    if (stripeReturnStatus === "complete") {
      refreshStripeConnectStatusAction().then((result) => {
        if (result.success) {
          if (result.data.chargesEnabled) {
            toast.success("Stripe connected successfully!")
          } else {
            toast("Stripe setup incomplete. Please complete the remaining steps.")
          }
        }
        router.replace("/settings/integrations")
      })
    } else if (stripeReturnStatus === "refresh") {
      toast("Please complete Stripe setup to start accepting payments.")
      router.replace("/settings/integrations")
    }
  }, [stripeReturnStatus, router, mounted])

  React.useEffect(() => {
    if (!mounted) return
    if (googleConnected === "true") {
      toast.success("Google connected! Gmail and Calendar are now available.")
      // Use history API to clean URL without causing React re-render
      window.history.replaceState({}, "", "/settings/integrations")
    } else if (googleError) {
      toast.error(`Failed to connect Google: ${googleError}`)
      window.history.replaceState({}, "", "/settings/integrations")
    }
  }, [googleConnected, googleError, mounted])

  const handleConnectGoogle = async () => {
    if (!integrations?.google?.studioId) {
      toast.error("No studio found. Please ensure you're part of a studio.")
      return
    }
    setIsConnecting("google")

    const result = await connectGoogle(integrations.google.studioId)

    if (result.success) {
      // Redirect to Google OAuth
      window.location.href = result.url
    } else {
      toast.error(result.error || "Failed to connect Google")
      setIsConnecting(null)
    }
  }

  const handleDisconnectGoogle = async () => {
    if (!integrations?.google?.studioId) {
      toast.error("No studio found")
      return
    }
    setIsConnecting("google")
    const result = await disconnectGmail(integrations.google.studioId)
    if (result.success) {
      toast.success("Google disconnected")
      router.refresh()
    } else {
      toast.error(result.error || "Failed to disconnect Google")
    }
    setIsConnecting(null)
  }

  const handleConnectStripe = async () => {
    setIsConnecting("stripe")

    const result = await startStripeConnectOnboardingAction()

    if (result.success) {
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
      router.refresh()
    } else {
      toast.error(result.error)
    }
    setIsConnecting(null)
  }

  const handleConnectCalcom = async () => {
    setIsConnecting("calcom")
    toast("Cal.com connection coming soon")
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
          icon={<GoogleLogo className="size-7" />}
          name="Google"
          description="Connect Gmail to send messages and Calendar to sync availability"
          connected={google.connected}
          connectedLabel={google.email || "Connected"}
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

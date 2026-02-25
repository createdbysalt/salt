"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@repo/ui"
import {
  updateNotificationBatchingAction,
  updateQuietHoursAction,
} from "@/app/_features/auth/actions"
import { SettingsPage } from "../SettingsPage"
import { SettingsSection } from "../SettingsSection"
import { SettingsCard } from "../SettingsCard"
import { SettingsRow } from "../SettingsRow"

// Generate time options in 30-minute increments
const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2)
  const minutes = i % 2 === 0 ? "00" : "30"
  const value = `${hours.toString().padStart(2, "0")}:${minutes}`
  const period = hours >= 12 ? "PM" : "AM"
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const label = `${displayHours}:${minutes} ${period}`
  return { value, label }
})

interface NotificationsSectionProps {
  preferences?: {
    batching: "immediate" | "hourly" | "daily"
    quietHoursEnabled: boolean
    quietHoursStart: string
    quietHoursEnd: string
  }
}

export function NotificationsSection({ preferences }: NotificationsSectionProps) {
  const [batching, setBatching] = React.useState(preferences?.batching || "immediate")
  const [quietHoursEnabled, setQuietHoursEnabled] = React.useState(preferences?.quietHoursEnabled || false)
  const [quietHoursStart, setQuietHoursStart] = React.useState(preferences?.quietHoursStart || "08:00")
  const [quietHoursEnd, setQuietHoursEnd] = React.useState(preferences?.quietHoursEnd || "20:00")

  const handleBatchingChange = async (value: "immediate" | "hourly" | "daily") => {
    const previousValue = batching
    setBatching(value)

    const result = await updateNotificationBatchingAction(value)
    if (result.success) {
      toast.success(`Notification delivery set to ${value}`)
    } else {
      setBatching(previousValue)
      toast.error(result.error)
    }
  }

  const handleQuietHoursToggle = async (enabled: boolean) => {
    const previousEnabled = quietHoursEnabled
    setQuietHoursEnabled(enabled)

    const result = await updateQuietHoursAction({
      enabled,
      start: quietHoursStart,
      end: quietHoursEnd,
    })

    if (result.success) {
      toast.success(enabled ? "Notification hours enabled" : "Notification hours disabled")
    } else {
      setQuietHoursEnabled(previousEnabled)
      toast.error(result.error)
    }
  }

  const handleQuietHoursStartChange = async (value: string) => {
    const previousValue = quietHoursStart
    setQuietHoursStart(value)

    const result = await updateQuietHoursAction({
      enabled: true,
      start: value,
      end: quietHoursEnd,
    })

    if (result.success) {
      toast.success("Notification hours updated")
    } else {
      setQuietHoursStart(previousValue)
      toast.error(result.error)
    }
  }

  const handleQuietHoursEndChange = async (value: string) => {
    const previousValue = quietHoursEnd
    setQuietHoursEnd(value)

    const result = await updateQuietHoursAction({
      enabled: true,
      start: quietHoursStart,
      end: value,
    })

    if (result.success) {
      toast.success("Notification hours updated")
    } else {
      setQuietHoursEnd(previousValue)
      toast.error(result.error)
    }
  }

  return (
    <SettingsPage title="Notifications">
      {/* Email Notifications */}
      <SettingsSection title="Email notifications">
        <SettingsCard>
          <SettingsRow
            label={
              <span className="flex items-center gap-2">
                Notification delivery
                <Badge variant="secondary" className="text-[10px] font-normal">Coming soon</Badge>
              </span>
            }
            description="Choose how often to receive email notifications"
          >
            <Select value={batching} onValueChange={handleBatchingChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="hourly">Hourly digest</SelectItem>
                <SelectItem value="daily">Daily digest</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      {/* Notification Hours */}
      <SettingsSection title="Notification hours">
        <SettingsCard>
          <SettingsRow
            label="Limit notification hours"
            description="Only receive notifications during specific times"
          >
            <Switch
              checked={quietHoursEnabled}
              onCheckedChange={handleQuietHoursToggle}
            />
          </SettingsRow>

          {quietHoursEnabled && (
            <>
              <SettingsRow label="From">
                <Select value={quietHoursStart} onValueChange={handleQuietHoursStartChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingsRow>

              <SettingsRow label="To">
                <Select value={quietHoursEnd} onValueChange={handleQuietHoursEndChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingsRow>
            </>
          )}
        </SettingsCard>
      </SettingsSection>
    </SettingsPage>
  )
}

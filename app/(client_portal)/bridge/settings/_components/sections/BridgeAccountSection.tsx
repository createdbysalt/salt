"use client"

import * as React from "react"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui"
import {
  updateProfileAction,
  uploadAvatarAction,
  changeEmailAction,
} from "@/app/_features/auth/actions"
import { BridgeSettingsPage } from "../BridgeSettingsPage"
import { BridgeSettingsSection } from "../BridgeSettingsSection"
import { BridgeSettingsCard } from "../BridgeSettingsCard"
import { BridgeSettingsRow } from "../BridgeSettingsRow"

// Common timezones
const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
]

const CONTACT_METHODS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "portal", label: "Portal Messages" },
]

interface BridgeAccountSectionProps {
  user?: {
    name: string
    email: string
    avatar: string | null
    firstName: string
    lastName: string
    phone: string | null
    companyName: string | null
    jobTitle: string | null
    timezone: string
    preferredContactMethod: "email" | "phone" | "portal"
  } | null
}

export function BridgeAccountSection({ user }: BridgeAccountSectionProps) {
  const [firstName, setFirstName] = React.useState(user?.firstName || "")
  const [lastName, setLastName] = React.useState(user?.lastName || "")
  const [avatarUrl, setAvatarUrl] = React.useState(user?.avatar || "")
  const [email, setEmail] = React.useState(user?.email || "")
  const [phone, setPhone] = React.useState(user?.phone || "")
  const [companyName, setCompanyName] = React.useState(user?.companyName || "")
  const [jobTitle, setJobTitle] = React.useState(user?.jobTitle || "")
  const [timezone, setTimezone] = React.useState(user?.timezone || "America/New_York")
  const [preferredContactMethod, setPreferredContactMethod] = React.useState<"email" | "phone" | "portal">(
    user?.preferredContactMethod || "email"
  )
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false)
  const [newEmail, setNewEmail] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsSaving(true)
    const formData = new FormData()
    formData.append("avatar", file)

    const result = await uploadAvatarAction(formData)

    if (result.success) {
      setAvatarUrl(result.data)
      toast.success("Profile picture updated")
    } else {
      toast.error(result.error)
    }
    setIsSaving(false)
  }

  const handleRemoveAvatar = async () => {
    setAvatarUrl("")
    toast.success("Profile picture removed")
  }

  const handleEmailEdit = () => {
    setNewEmail(email)
    setEmailDialogOpen(true)
  }

  const handleEmailSave = async () => {
    setIsSaving(true)
    const result = await changeEmailAction(newEmail)

    if (result.success) {
      toast.success("Verification email sent to your new address")
      setEmailDialogOpen(false)
    } else {
      toast.error(result.error)
    }
    setIsSaving(false)
  }

  const handleFieldSave = async (field: string, value: string) => {
    setIsSaving(true)

    const updateData: Record<string, string> = {}

    switch (field) {
      case "firstName":
        updateData.firstName = value
        updateData.lastName = lastName
        break
      case "lastName":
        updateData.firstName = firstName
        updateData.lastName = value
        break
      case "phone":
        updateData.phone = value
        break
      case "companyName":
        updateData.companyName = value
        break
      case "jobTitle":
        updateData.jobTitle = value
        break
    }

    const result = await updateProfileAction(updateData)

    if (result.success) {
      toast.success("Saved")
    } else {
      toast.error(result.error)
    }
    setIsSaving(false)
  }

  const handleTimezoneChange = async (value: string) => {
    setTimezone(value)
    setIsSaving(true)

    const result = await updateProfileAction({ timezone: value })

    if (result.success) {
      toast.success("Timezone updated")
    } else {
      toast.error(result.error)
    }
    setIsSaving(false)
  }

  const handleContactMethodChange = async (value: "email" | "phone" | "portal") => {
    setPreferredContactMethod(value)
    setIsSaving(true)

    const result = await updateProfileAction({ preferredContactMethod: value })

    if (result.success) {
      toast.success("Contact preference updated")
    } else {
      toast.error(result.error)
    }
    setIsSaving(false)
  }

  const getInitials = () => {
    const first = firstName?.[0] || ""
    const last = lastName?.[0] || ""
    return (first + last).toUpperCase() || "?"
  }

  return (
    <BridgeSettingsPage title="Account">
      {/* Profile */}
      <BridgeSettingsSection title="Profile">
        <BridgeSettingsCard>
          <BridgeSettingsRow label="Profile picture">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative group cursor-pointer rounded-full" disabled={isSaving}>
                  <Avatar className="size-10">
                    <AvatarImage src={avatarUrl} className="object-cover" />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="size-4 text-white" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" data-surface="bridge">
                <DropdownMenuItem onClick={handleAvatarClick}>
                  Change avatar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleRemoveAvatar}
                  className="text-destructive focus:text-destructive"
                >
                  Remove avatar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </BridgeSettingsRow>

          <BridgeSettingsRow label="Email">
            <div className="flex items-center gap-2">
              <span className="text-sm">{email}</span>
              <Button variant="ghost" size="icon" className="size-8" onClick={handleEmailEdit}>
                <Pencil className="size-4" />
              </Button>
            </div>
          </BridgeSettingsRow>

          <BridgeSettingsRow label="First name">
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-48 text-right"
              onBlur={() => handleFieldSave("firstName", firstName)}
              disabled={isSaving}
            />
          </BridgeSettingsRow>

          <BridgeSettingsRow label="Last name">
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-48 text-right"
              onBlur={() => handleFieldSave("lastName", lastName)}
              disabled={isSaving}
            />
          </BridgeSettingsRow>
        </BridgeSettingsCard>
      </BridgeSettingsSection>

      {/* Contact Information */}
      <BridgeSettingsSection title="Contact Information">
        <BridgeSettingsCard>
          <BridgeSettingsRow label="Phone number">
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-48 text-right"
              placeholder="(555) 123-4567"
              onBlur={() => handleFieldSave("phone", phone)}
              disabled={isSaving}
            />
          </BridgeSettingsRow>

          <BridgeSettingsRow label="Company">
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-48 text-right"
              placeholder="Company name"
              onBlur={() => handleFieldSave("companyName", companyName)}
              disabled={isSaving}
            />
          </BridgeSettingsRow>

          <BridgeSettingsRow label="Job title">
            <Input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-48 text-right"
              placeholder="Your role"
              onBlur={() => handleFieldSave("jobTitle", jobTitle)}
              disabled={isSaving}
            />
          </BridgeSettingsRow>
        </BridgeSettingsCard>
      </BridgeSettingsSection>

      {/* Preferences */}
      <BridgeSettingsSection title="Preferences">
        <BridgeSettingsCard>
          <BridgeSettingsRow label="Timezone" description="Used for scheduling and notifications">
            <Select value={timezone} onValueChange={handleTimezoneChange} disabled={isSaving}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-surface="bridge">
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </BridgeSettingsRow>

          <BridgeSettingsRow label="Preferred contact method" description="How you'd like us to reach you">
            <Select value={preferredContactMethod} onValueChange={handleContactMethodChange} disabled={isSaving}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-surface="bridge">
                {CONTACT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </BridgeSettingsRow>
        </BridgeSettingsCard>
      </BridgeSettingsSection>

      {/* Account Actions */}
      <BridgeSettingsSection title="Account">
        <BridgeSettingsCard>
          <BridgeSettingsRow label="Sign out of all devices">
            <Button variant="link" className="text-muted-foreground h-auto p-0">
              Sign out everywhere
            </Button>
          </BridgeSettingsRow>

          <BridgeSettingsRow label="Permanently delete account">
            <Button variant="link" className="text-destructive h-auto p-0">
              Delete account
            </Button>
          </BridgeSettingsRow>
        </BridgeSettingsCard>
      </BridgeSettingsSection>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent data-surface="bridge">
          <DialogHeader>
            <DialogTitle>Change email</DialogTitle>
            <DialogDescription>
              Enter your new email address. You'll receive a verification email before the change takes effect.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Enter new email"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEmailSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BridgeSettingsPage>
  )
}

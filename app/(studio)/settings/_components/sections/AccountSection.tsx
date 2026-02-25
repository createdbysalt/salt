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
import { useTheme } from "@/app/_components/theme-provider"
import {
  updateProfileAction,
  uploadAvatarAction,
  changeEmailAction,
  updateThemeSettingsAction,
} from "@/app/_features/auth/actions"
import { SettingsPage } from "../SettingsPage"
import { SettingsSection } from "../SettingsSection"
import { SettingsCard } from "../SettingsCard"
import { SettingsRow } from "../SettingsRow"

interface AccountSectionProps {
  user?: {
    email?: string
    firstName?: string
    lastName?: string
    avatarUrl?: string
  }
}

export function AccountSection({ user }: AccountSectionProps) {
  const [firstName, setFirstName] = React.useState(user?.firstName || "")
  const [lastName, setLastName] = React.useState(user?.lastName || "")
  const [avatarUrl, setAvatarUrl] = React.useState(user?.avatarUrl || "")
  const [email, setEmail] = React.useState(user?.email || "")
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false)
  const [newEmail, setNewEmail] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const { theme, setTheme } = useTheme()

  const handleThemeChange = async (value: "light" | "dark") => {
    setTheme(value)
    const result = await updateThemeSettingsAction({ ui_theme: value })
    if (result.success) {
      toast.success(`Theme changed to ${value} mode`)
    } else {
      toast.error(result.error)
    }
  }

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
    // For now, just clear the local state
    // TODO: Add a removeAvatarAction if needed
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

  const handleNameSave = async (field: "firstName" | "lastName") => {
    setIsSaving(true)
    const result = await updateProfileAction({
      firstName,
      lastName,
    })

    if (result.success) {
      toast.success(`${field === "firstName" ? "First name" : "Last name"} updated`)
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
    <SettingsPage title="Preferences">
      {/* Profile */}
      <SettingsSection title="Profile">
        <SettingsCard>
          <SettingsRow label="Profile picture">
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
              <DropdownMenuContent align="end">
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
          </SettingsRow>

          <SettingsRow label="Email">
            <div className="flex items-center gap-2">
              <span className="text-sm">{email}</span>
              <Button variant="ghost" size="icon" className="size-8" onClick={handleEmailEdit}>
                <Pencil className="size-4" />
              </Button>
            </div>
          </SettingsRow>

          <SettingsRow label="First name">
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-48 text-right"
              onBlur={() => handleNameSave("firstName")}
              disabled={isSaving}
            />
          </SettingsRow>

          <SettingsRow label="Last name">
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-48 text-right"
              onBlur={() => handleNameSave("lastName")}
              disabled={isSaving}
            />
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      {/* Theme */}
      <SettingsSection title="Theme">
        <SettingsCard>
          <SettingsRow label="Interface theme" description="Select or customize your interface color scheme">
            <Select value={theme} onValueChange={handleThemeChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      {/* Account Actions */}
      <SettingsSection title="Account">
        <SettingsCard>
          <SettingsRow label="Sign out of all devices">
            <Button variant="link" className="text-muted-foreground h-auto p-0">
              Sign out everywhere
            </Button>
          </SettingsRow>

          <SettingsRow label="Permanently delete account">
            <Button variant="link" className="text-destructive h-auto p-0">
              Delete account
            </Button>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
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
    </SettingsPage>
  )
}

"use client"

import * as React from "react"
import {
  Globe,
  Linkedin,
  Instagram,
  Loader2,
  Youtube,
  Github,
} from "lucide-react"
import { toast } from "sonner"
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Skeleton,
} from "@repo/ui"
import { useStudioProfile } from "@/app/_features/studio/hooks/useStudioProfile"
import { updateStudioProfile } from "@/app/_features/studio/actions"
import { SettingsPage } from "../SettingsPage"
import { SettingsSection } from "../SettingsSection"
import { SettingsCard } from "../SettingsCard"
import { SettingsRow } from "../SettingsRow"

// X (Twitter) logo - official X mark
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

// Behance logo
function BehanceIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M22 7h-7v-2h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14h-8.027c.13 3.211 3.483 3.312 4.588 2.029h3.168zm-7.686-4h4.965c-.105-1.547-1.136-2.219-2.477-2.219-1.466 0-2.277.768-2.488 2.219zm-9.574 6.988h-6.466v-14.967h6.953c5.476.081 5.58 5.444 2.72 6.906 3.461 1.26 3.577 8.061-3.207 8.061zm-3.466-8.988h3.584c2.508 0 2.906-3-.312-3h-3.272v3zm3.391 3h-3.391v3.016h3.341c3.055 0 2.868-3.016.05-3.016z" />
    </svg>
  )
}

// Dribbble logo
function DribbbleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0c-6.628 0-12 5.373-12 12s5.372 12 12 12 12-5.373 12-12-5.372-12-12-12zm9.885 11.441c-2.575-.422-4.943-.445-7.103-.073-.244-.563-.497-1.125-.767-1.68 2.31-1 4.165-2.358 5.548-4.082 1.35 1.594 2.197 3.619 2.322 5.835zm-3.842-7.282c-1.205 1.554-2.868 2.783-4.986 3.68-1.016-1.861-2.178-3.676-3.488-5.438.779-.197 1.591-.314 2.431-.314 2.275 0 4.368.779 6.043 2.072zm-10.516-.993c1.331 1.742 2.511 3.538 3.537 5.381-2.43.715-5.331 1.082-8.684 1.105.692-2.835 2.601-5.193 5.147-6.486zm-5.44 8.834l.013-.256c3.849-.005 7.169-.448 9.95-1.322.233.475.456.952.67 1.432-3.38 1.057-6.165 3.222-8.337 6.48-1.432-1.719-2.296-3.927-2.296-6.334zm3.829 7.81c1.969-3.088 4.482-5.098 7.598-6.027.928 2.42 1.609 4.91 2.043 7.46-3.349 1.291-6.953.666-9.641-1.433zm11.586.43c-.438-2.353-1.08-4.653-1.92-6.897 1.876-.265 3.94-.196 6.199.196-.437 2.786-2.028 5.192-4.279 6.701z" />
    </svg>
  )
}

// TikTok logo
function TiktokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  )
}

// Vimeo logo
function VimeoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.084 3.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.493 4.797l-.013.01z" />
    </svg>
  )
}

type SocialPlatform = "x" | "linkedin" | "instagram" | "youtube" | "behance" | "dribbble" | "tiktok" | "vimeo" | "github"

export function StudioProfileSection() {
  const { studio, isLoading, mutate } = useStudioProfile()
  const [isSaving, setIsSaving] = React.useState(false)

  // Local state for form fields
  const [name, setName] = React.useState("")
  const [tagline, setTagline] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [websiteUrl, setWebsiteUrl] = React.useState("")
  const [teamSize, setTeamSize] = React.useState<string>("")
  const [foundedYear, setFoundedYear] = React.useState("")

  // Social links
  const [x, setX] = React.useState("")
  const [linkedin, setLinkedin] = React.useState("")
  const [instagram, setInstagram] = React.useState("")
  const [youtube, setYoutube] = React.useState("")
  const [behance, setBehance] = React.useState("")
  const [dribbble, setDribbble] = React.useState("")
  const [tiktok, setTiktok] = React.useState("")
  const [vimeo, setVimeo] = React.useState("")
  const [github, setGithub] = React.useState("")

  // Sync state with studio data
  React.useEffect(() => {
    if (studio) {
      setName(studio.name || "")
      setTagline(studio.tagline || "")
      setDescription(studio.description || "")
      setWebsiteUrl(studio.website_url || "")
      setTeamSize(studio.team_size || "")
      setFoundedYear(studio.founded_year?.toString() || "")
      // Social links - support both old "twitter" key and new "x" key
      setX(studio.social_links?.x || studio.social_links?.twitter || "")
      setLinkedin(studio.social_links?.linkedin || "")
      setInstagram(studio.social_links?.instagram || "")
      setYoutube(studio.social_links?.youtube || "")
      setBehance(studio.social_links?.behance || "")
      setDribbble(studio.social_links?.dribbble || "")
      setTiktok(studio.social_links?.tiktok || "")
      setVimeo(studio.social_links?.vimeo || "")
      setGithub(studio.social_links?.github || "")
    }
  }, [studio])

  const saveField = async (field: string, value: unknown) => {
    setIsSaving(true)
    const result = await updateStudioProfile({ [field]: value })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Saved")
      mutate()
    }
    setIsSaving(false)
  }

  const handleNameBlur = () => {
    if (name !== studio?.name && name.trim()) {
      saveField("name", name)
    }
  }

  const handleTaglineBlur = () => {
    if (tagline !== (studio?.tagline || "")) {
      saveField("tagline", tagline || null)
    }
  }

  const handleDescriptionBlur = () => {
    if (description !== (studio?.description || "")) {
      saveField("description", description || null)
    }
  }

  const handleWebsiteBlur = () => {
    if (websiteUrl !== (studio?.website_url || "")) {
      saveField("website_url", websiteUrl || null)
    }
  }

  const handleTeamSizeChange = (value: string) => {
    setTeamSize(value)
    saveField("team_size", value)
  }

  const handleFoundedYearBlur = () => {
    const year = foundedYear ? parseInt(foundedYear, 10) : null
    if (year !== studio?.founded_year) {
      saveField("founded_year", year)
    }
  }

  const socialValues: Record<SocialPlatform, string> = {
    x, linkedin, instagram, youtube, behance, dribbble, tiktok, vimeo, github
  }

  const handleSocialBlur = (platform: SocialPlatform) => {
    const currentLinks = studio?.social_links || {}
    const currentValue = platform === "x"
      ? (currentLinks.x || currentLinks.twitter || "")
      : (currentLinks[platform] || "")

    if (socialValues[platform] !== currentValue) {
      // Remove old twitter key when saving x
      const updatedLinks = { ...currentLinks }
      if (platform === "x") {
        delete updatedLinks.twitter
      }
      saveField("social_links", {
        ...updatedLinks,
        [platform]: socialValues[platform] || null,
      })
    }
  }

  if (isLoading) {
    return (
      <SettingsPage title="Profile">
        <SettingsSection title="About">
          <SettingsCard>
            <SettingsRow label="Studio name">
              <Skeleton className="h-9 w-full max-w-md" />
            </SettingsRow>
            <SettingsRow label="Website">
              <Skeleton className="h-9 w-full max-w-sm" />
            </SettingsRow>
            <div className="px-4 py-4 space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="px-4 py-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-24 w-full" />
            </div>
          </SettingsCard>
        </SettingsSection>
      </SettingsPage>
    )
  }

  return (
    <SettingsPage title="Profile">
      {/* About Section */}
      <SettingsSection title="About">
        <SettingsCard>
          <SettingsRow label="Studio name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full max-w-md text-right"
              onBlur={handleNameBlur}
              disabled={isSaving}
              placeholder="Your Studio Name"
            />
          </SettingsRow>

          <SettingsRow label="Website">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-muted-foreground" />
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full max-w-sm text-right"
                onBlur={handleWebsiteBlur}
                disabled={isSaving}
                placeholder="https://yourstudio.com"
              />
            </div>
          </SettingsRow>

          {/* Tagline - Full width inside card */}
          <div className="px-4 py-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <label className="text-sm font-medium">Tagline</label>
                <p className="text-xs text-muted-foreground mt-0.5">A short phrase that captures what you do</p>
              </div>
              <span className="text-xs text-muted-foreground">{tagline.length}/140</span>
            </div>
            <Textarea
              value={tagline}
              onChange={(e) => setTagline(e.target.value.slice(0, 140))}
              onBlur={handleTaglineBlur}
              disabled={isSaving}
              placeholder="We build things that matter"
              rows={2}
              maxLength={140}
              className="resize-y"
            />
          </div>

          {/* Description - Full width inside card */}
          <div className="px-4 py-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-xs text-muted-foreground mt-0.5">Describe your studio to potential clients</p>
              </div>
              <span className="text-xs text-muted-foreground">{description.length}/1000</span>
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              disabled={isSaving}
              placeholder="Tell clients about your studio, your approach, and what makes you unique..."
              rows={4}
              maxLength={1000}
              className="resize-y"
            />
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* Details */}
      <SettingsSection title="Details">
        <SettingsCard>
          <SettingsRow label="Team size">
            <Select value={teamSize} onValueChange={handleTeamSizeChange} disabled={isSaving}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solo">Solo (Just me)</SelectItem>
                <SelectItem value="2-5">2-5 people</SelectItem>
                <SelectItem value="6-10">6-10 people</SelectItem>
                <SelectItem value="11-25">11-25 people</SelectItem>
                <SelectItem value="25+">25+ people</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>

          <SettingsRow label="Founded">
            <Input
              type="number"
              value={foundedYear}
              onChange={(e) => setFoundedYear(e.target.value)}
              className="w-24 text-right"
              onBlur={handleFoundedYearBlur}
              disabled={isSaving}
              placeholder={new Date().getFullYear().toString()}
              min={1900}
              max={new Date().getFullYear()}
            />
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      {/* Social Links */}
      <SettingsSection title="Social Links">
        <SettingsCard>
          <SettingsRow label="X">
            <div className="flex items-center gap-2">
              <XIcon className="size-4 text-muted-foreground" />
              <Input
                value={x}
                onChange={(e) => setX(e.target.value)}
                className="w-48 text-right"
                onBlur={() => handleSocialBlur("x")}
                disabled={isSaving}
                placeholder="@yourstudio"
              />
            </div>
          </SettingsRow>

          <SettingsRow label="LinkedIn">
            <div className="flex items-center gap-2">
              <Linkedin className="size-4 text-muted-foreground" />
              <Input
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                className="w-48 text-right"
                onBlur={() => handleSocialBlur("linkedin")}
                disabled={isSaving}
                placeholder="company/yourstudio"
              />
            </div>
          </SettingsRow>

          <SettingsRow label="Instagram">
            <div className="flex items-center gap-2">
              <Instagram className="size-4 text-muted-foreground" />
              <Input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-48 text-right"
                onBlur={() => handleSocialBlur("instagram")}
                disabled={isSaving}
                placeholder="@yourstudio"
              />
            </div>
          </SettingsRow>

          <SettingsRow label="YouTube">
            <div className="flex items-center gap-2">
              <Youtube className="size-4 text-muted-foreground" />
              <Input
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                className="w-48 text-right"
                onBlur={() => handleSocialBlur("youtube")}
                disabled={isSaving}
                placeholder="@yourstudio"
              />
            </div>
          </SettingsRow>

          <SettingsRow label="Behance">
            <div className="flex items-center gap-2">
              <BehanceIcon className="size-4 text-muted-foreground" />
              <Input
                value={behance}
                onChange={(e) => setBehance(e.target.value)}
                className="w-48 text-right"
                onBlur={() => handleSocialBlur("behance")}
                disabled={isSaving}
                placeholder="yourstudio"
              />
            </div>
          </SettingsRow>

          <SettingsRow label="Dribbble">
            <div className="flex items-center gap-2">
              <DribbbleIcon className="size-4 text-muted-foreground" />
              <Input
                value={dribbble}
                onChange={(e) => setDribbble(e.target.value)}
                className="w-48 text-right"
                onBlur={() => handleSocialBlur("dribbble")}
                disabled={isSaving}
                placeholder="yourstudio"
              />
            </div>
          </SettingsRow>

          <SettingsRow label="TikTok">
            <div className="flex items-center gap-2">
              <TiktokIcon className="size-4 text-muted-foreground" />
              <Input
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                className="w-48 text-right"
                onBlur={() => handleSocialBlur("tiktok")}
                disabled={isSaving}
                placeholder="@yourstudio"
              />
            </div>
          </SettingsRow>

          <SettingsRow label="Vimeo">
            <div className="flex items-center gap-2">
              <VimeoIcon className="size-4 text-muted-foreground" />
              <Input
                value={vimeo}
                onChange={(e) => setVimeo(e.target.value)}
                className="w-48 text-right"
                onBlur={() => handleSocialBlur("vimeo")}
                disabled={isSaving}
                placeholder="yourstudio"
              />
            </div>
          </SettingsRow>

          <SettingsRow label="GitHub">
            <div className="flex items-center gap-2">
              <Github className="size-4 text-muted-foreground" />
              <Input
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                className="w-48 text-right"
                onBlur={() => handleSocialBlur("github")}
                disabled={isSaving}
                placeholder="yourstudio"
              />
            </div>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      {/* Saving indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg bg-card border px-4 py-2 shadow-lg">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Saving...</span>
        </div>
      )}
    </SettingsPage>
  )
}

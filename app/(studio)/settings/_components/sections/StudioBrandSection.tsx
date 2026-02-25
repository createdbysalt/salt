"use client"

import * as React from "react"
import { Loader2, Plus, X, Upload, ImageIcon, GraduationCap, Compass, Handshake, Briefcase, Sparkles, Check } from "lucide-react"
import { cn } from "@repo/utils"
import { toast } from "sonner"
import {
  Badge,
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
  Skeleton,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from "@repo/ui"
import { useStudioBrandConfig } from "@/app/_features/studio/hooks/useStudioBrandConfig"
import { updateStudioBrandConfig } from "@/app/_features/studio/actions"
import { useStudioProfile } from "@/app/_features/studio/hooks/useStudioProfile"
import { getBridgeBranding, updateBridgeBranding, uploadBrandingAsset, deleteBrandingAsset } from "@/app/_features/serve/actions"
import type { BridgeBrandingConfig } from "@/app/_lib/bridge/branding-config"
import { getContrastingColor, isValidHexColor } from "@/app/_lib/bridge/branding-config"
import { SettingsPage } from "../SettingsPage"
import { SettingsSection } from "../SettingsSection"
import { SettingsCard } from "../SettingsCard"
import { SettingsRow } from "../SettingsRow"

// Voice spectrum dimensions - simplified labels
const VOICE_SPECTRUMS = [
  { key: "formality", left: "Casual", right: "Formal" },
  { key: "complexity", left: "Simple", right: "Technical" },
  { key: "warmth", left: "Neutral", right: "Warm" },
  { key: "brevity", left: "Concise", right: "Detailed" },
] as const

// Voice archetypes - pre-built starting points with icons
const VOICE_ARCHETYPES = [
  {
    value: "expert",
    label: "Expert",
    description: "Authoritative",
    icon: GraduationCap,
    defaults: { formality: 70, complexity: 75, warmth: 40, brevity: 50 }
  },
  {
    value: "guide",
    label: "Guide",
    description: "Helpful",
    icon: Compass,
    defaults: { formality: 50, complexity: 30, warmth: 70, brevity: 40 }
  },
  {
    value: "partner",
    label: "Partner",
    description: "Supportive",
    icon: Handshake,
    defaults: { formality: 40, complexity: 40, warmth: 80, brevity: 50 }
  },
  {
    value: "professional",
    label: "Professional",
    description: "Polished",
    icon: Briefcase,
    defaults: { formality: 80, complexity: 50, warmth: 50, brevity: 60 }
  },
  {
    value: "creative",
    label: "Creative",
    description: "Distinctive",
    icon: Sparkles,
    defaults: { formality: 30, complexity: 40, warmth: 60, brevity: 30 }
  },
] as const

// Font options for typography selection
const HEADING_FONT_OPTIONS = [
  { value: "inter", label: "Inter", description: "Modern, clean" },
  { value: "geist", label: "Geist", description: "Contemporary, sharp" },
  { value: "plus-jakarta-sans", label: "Plus Jakarta Sans", description: "Geometric, friendly" },
  { value: "dm-sans", label: "DM Sans", description: "Minimal, elegant" },
  { value: "poppins", label: "Poppins", description: "Rounded, approachable" },
  { value: "manrope", label: "Manrope", description: "Professional, versatile" },
  { value: "space-grotesk", label: "Space Grotesk", description: "Bold, distinctive" },
  { value: "outfit", label: "Outfit", description: "Modern, geometric" },
] as const

const BODY_FONT_OPTIONS = [
  { value: "inter", label: "Inter", description: "Highly readable" },
  { value: "geist", label: "Geist", description: "Clean, modern" },
  { value: "plus-jakarta-sans", label: "Plus Jakarta Sans", description: "Friendly, clear" },
  { value: "dm-sans", label: "DM Sans", description: "Minimal, legible" },
  { value: "source-sans-pro", label: "Source Sans Pro", description: "Classic, readable" },
  { value: "nunito-sans", label: "Nunito Sans", description: "Warm, approachable" },
  { value: "lato", label: "Lato", description: "Balanced, neutral" },
  { value: "open-sans", label: "Open Sans", description: "Universal, clear" },
] as const

// Color input component
function ColorInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const inputId = React.useId()

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="size-8 rounded-md border cursor-pointer shrink-0 disabled:opacity-50"
        style={{ backgroundColor: value || "#ffffff" }}
        onClick={() => document.getElementById(inputId)?.click()}
        disabled={disabled}
      />
      <input
        type="color"
        id={inputId}
        value={value || "#ffffff"}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        disabled={disabled}
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        className="w-28 font-mono text-right"
        disabled={disabled}
      />
    </div>
  )
}

export function StudioBrandSection() {
  const { brandConfig, isLoading, mutate } = useStudioBrandConfig()
  const [isSaving, setIsSaving] = React.useState(false)

  // Local state for form fields
  const [colorPrimary, setColorPrimary] = React.useState("")
  const [colorSecondary, setColorSecondary] = React.useState("")
  const [colorNeutral, setColorNeutral] = React.useState("")
  const [colorAccent, setColorAccent] = React.useState("")
  const [fontHeading, setFontHeading] = React.useState("")
  const [fontBody, setFontBody] = React.useState("")
  const [voiceSpectrums, setVoiceSpectrums] = React.useState<Record<string, number>>({
    formality: 50,
    complexity: 50,
    warmth: 50,
    brevity: 50,
  })
  const [selectedArchetype, setSelectedArchetype] = React.useState<string | null>(null)
  const [voiceStyleGuide, setVoiceStyleGuide] = React.useState("")
  const [terminology, setTerminology] = React.useState<{ preferred: string[]; avoid: string[] }>({
    preferred: [],
    avoid: [],
  })

  // Dialog states
  const [styleGuideDialogOpen, setStyleGuideDialogOpen] = React.useState(false)
  const [tempStyleGuide, setTempStyleGuide] = React.useState("")
  const [terminologyDialogOpen, setTerminologyDialogOpen] = React.useState(false)
  const [newPreferredTerm, setNewPreferredTerm] = React.useState("")
  const [newAvoidTerm, setNewAvoidTerm] = React.useState("")

  // Bridge Portal branding state
  const { studio } = useStudioProfile()
  const [bridgeBranding, setBridgeBranding] = React.useState<BridgeBrandingConfig>({})
  const [bridgeAccentColor, setBridgeAccentColor] = React.useState("#6366F1")
  const [showPoweredBy, setShowPoweredBy] = React.useState(true)
  const [bridgeBrandingLoading, setBridgeBrandingLoading] = React.useState(true)

  // Load Bridge branding
  React.useEffect(() => {
    async function loadBridgeBranding() {
      if (!studio?.id) return
      const result = await getBridgeBranding(studio.id)
      if (result.branding) {
        setBridgeBranding(result.branding)
        setBridgeAccentColor(result.branding.colors?.accent || "#6366F1")
        setShowPoweredBy(result.branding.footer?.showPoweredBy !== false)
      }
      setBridgeBrandingLoading(false)
    }
    loadBridgeBranding()
  }, [studio?.id])

  // Save Bridge branding field
  const saveBridgeField = async (field: string, value: unknown) => {
    if (!studio?.id) return
    setIsSaving(true)
    const updatedBranding = {
      ...bridgeBranding,
      [field]: value,
    }
    const result = await updateBridgeBranding(studio.id, updatedBranding)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Portal appearance updated")
      setBridgeBranding(updatedBranding)
    }
    setIsSaving(false)
  }

  // Sync state with brand config data
  React.useEffect(() => {
    if (brandConfig) {
      setColorPrimary(brandConfig.color_primary || "")
      setColorSecondary(brandConfig.color_secondary || "")
      setColorNeutral(brandConfig.color_neutral || "")
      setColorAccent(brandConfig.color_accent || "")
      setFontHeading(brandConfig.font_heading || "")
      setFontBody(brandConfig.font_body || "")
      setVoiceSpectrums(brandConfig.voice_spectrums || {
        formality: 50,
        complexity: 50,
        warmth: 50,
        brevity: 50,
      })
      setSelectedArchetype(brandConfig.voice_archetype || null)
      setVoiceStyleGuide(brandConfig.voice_style_guide || "")
      setTerminology(brandConfig.voice_terminology || { preferred: [], avoid: [] })
    }
  }, [brandConfig])

  const saveField = async (field: string, value: unknown) => {
    setIsSaving(true)
    const result = await updateStudioBrandConfig({ [field]: value })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Brand settings updated")
      mutate()
    }
    setIsSaving(false)
  }

  // Color handlers
  const handleColorChange = (field: string, value: string, setter: (v: string) => void) => {
    setter(value)
  }

  const handleColorBlur = (field: string, value: string, originalValue: string | null) => {
    if (value !== (originalValue || "")) {
      saveField(field, value || null)
    }
  }

  // Font handlers
  const handleFontBlur = (field: string, value: string, originalValue: string | null) => {
    if (value !== (originalValue || "")) {
      saveField(field, value || null)
    }
  }

  // Voice spectrum handler
  const handleSpectrumChange = (key: string, value: number) => {
    const newSpectrums = { ...voiceSpectrums, [key]: value }
    setVoiceSpectrums(newSpectrums)
    setSelectedArchetype(null) // Clear archetype when manually adjusting
  }

  const handleSpectrumCommit = (key: string, value: number) => {
    const newSpectrums = { ...voiceSpectrums, [key]: value }
    saveField("voice_spectrums", newSpectrums)
    saveField("voice_archetype", null)
  }

  // Voice archetype handler
  const handleArchetypeSelect = (archetypeValue: string) => {
    const archetype = VOICE_ARCHETYPES.find(a => a.value === archetypeValue)
    if (archetype) {
      setSelectedArchetype(archetypeValue)
      setVoiceSpectrums(archetype.defaults)
      saveField("voice_archetype", archetypeValue)
      saveField("voice_spectrums", archetype.defaults)
      toast.success(`Applied "${archetype.label}" voice preset`)
    }
  }

  // Style guide handlers
  const openStyleGuideDialog = () => {
    setTempStyleGuide(voiceStyleGuide)
    setStyleGuideDialogOpen(true)
  }

  const handleStyleGuideSave = () => {
    if (tempStyleGuide !== (brandConfig?.voice_style_guide || "")) {
      saveField("voice_style_guide", tempStyleGuide || null)
    }
    setVoiceStyleGuide(tempStyleGuide)
    setStyleGuideDialogOpen(false)
  }

  // Terminology handlers
  const addPreferredTerm = () => {
    if (newPreferredTerm.trim() && !terminology.preferred.includes(newPreferredTerm.trim())) {
      const newTerminology = {
        ...terminology,
        preferred: [...terminology.preferred, newPreferredTerm.trim()],
      }
      setTerminology(newTerminology)
      setNewPreferredTerm("")
      saveField("voice_terminology", newTerminology)
    }
  }

  const removePreferredTerm = (term: string) => {
    const newTerminology = {
      ...terminology,
      preferred: terminology.preferred.filter((t) => t !== term),
    }
    setTerminology(newTerminology)
    saveField("voice_terminology", newTerminology)
  }

  const addAvoidTerm = () => {
    if (newAvoidTerm.trim() && !terminology.avoid.includes(newAvoidTerm.trim())) {
      const newTerminology = {
        ...terminology,
        avoid: [...terminology.avoid, newAvoidTerm.trim()],
      }
      setTerminology(newTerminology)
      setNewAvoidTerm("")
      saveField("voice_terminology", newTerminology)
    }
  }

  const removeAvoidTerm = (term: string) => {
    const newTerminology = {
      ...terminology,
      avoid: terminology.avoid.filter((t) => t !== term),
    }
    setTerminology(newTerminology)
    saveField("voice_terminology", newTerminology)
  }

  // Logo upload state
  const [logoLightUrl, setLogoLightUrl] = React.useState<string | null>(null)
  const [logoDarkUrl, setLogoDarkUrl] = React.useState<string | null>(null)
  const [faviconUrl, setFaviconUrl] = React.useState<string | null>(null)
  const [uploadingAsset, setUploadingAsset] = React.useState<string | null>(null)

  // Logo refs
  const logoLightInputRef = React.useRef<HTMLInputElement>(null)
  const logoDarkInputRef = React.useRef<HTMLInputElement>(null)
  const faviconInputRef = React.useRef<HTMLInputElement>(null)

  // Load logo URLs from bridge branding
  React.useEffect(() => {
    if (bridgeBranding) {
      setLogoLightUrl(bridgeBranding.logo?.lightUrl || null)
      setLogoDarkUrl(bridgeBranding.logo?.darkUrl || null)
      setFaviconUrl(bridgeBranding.favicon?.url || null)
    }
  }, [bridgeBranding])

  const handleAssetUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    assetType: "logo-light" | "logo-dark" | "favicon"
  ) => {
    const file = e.target.files?.[0]
    if (!file || !studio?.id) return

    setUploadingAsset(assetType)
    const formData = new FormData()
    formData.append("file", file)

    const result = await uploadBrandingAsset(studio.id, assetType, formData)
    if (result.success && result.url) {
      // Update local state
      if (assetType === "logo-light") setLogoLightUrl(result.url)
      else if (assetType === "logo-dark") setLogoDarkUrl(result.url)
      else if (assetType === "favicon") setFaviconUrl(result.url)

      // Update bridge branding
      const updatedBranding = { ...bridgeBranding }
      if (assetType === "logo-light") {
        updatedBranding.logo = { ...updatedBranding.logo, lightUrl: result.url }
      } else if (assetType === "logo-dark") {
        updatedBranding.logo = { ...updatedBranding.logo, darkUrl: result.url }
      } else if (assetType === "favicon") {
        updatedBranding.favicon = { ...updatedBranding.favicon, url: result.url }
      }
      await updateBridgeBranding(studio.id, updatedBranding)
      setBridgeBranding(updatedBranding)

      toast.success("Asset uploaded successfully")
    } else {
      toast.error(result.error || "Failed to upload asset")
    }
    setUploadingAsset(null)
    // Reset input
    e.target.value = ""
  }

  const handleAssetRemove = async (assetType: "logo-light" | "logo-dark" | "favicon") => {
    if (!studio?.id) return

    setUploadingAsset(assetType)
    const result = await deleteBrandingAsset(studio.id, assetType)
    if (result.success) {
      // Update local state
      if (assetType === "logo-light") setLogoLightUrl(null)
      else if (assetType === "logo-dark") setLogoDarkUrl(null)
      else if (assetType === "favicon") setFaviconUrl(null)

      // Update bridge branding
      const updatedBranding = { ...bridgeBranding }
      if (assetType === "logo-light") {
        updatedBranding.logo = { ...updatedBranding.logo, lightUrl: undefined }
      } else if (assetType === "logo-dark") {
        updatedBranding.logo = { ...updatedBranding.logo, darkUrl: undefined }
      } else if (assetType === "favicon") {
        updatedBranding.favicon = { ...updatedBranding.favicon, url: undefined }
      }
      await updateBridgeBranding(studio.id, updatedBranding)
      setBridgeBranding(updatedBranding)

      toast.success("Asset removed")
    } else {
      toast.error(result.error || "Failed to remove asset")
    }
    setUploadingAsset(null)
  }

  if (isLoading) {
    return (
      <SettingsPage title="Brand">
        <SettingsSection title="Logo">
          <Skeleton className="h-32 w-full" />
        </SettingsSection>
        <SettingsSection title="Colors">
          <SettingsCard>
            {[...Array(4)].map((_, i) => (
              <SettingsRow key={i} label={<Skeleton className="h-4 w-24" />}>
                <Skeleton className="h-8 w-36" />
              </SettingsRow>
            ))}
          </SettingsCard>
        </SettingsSection>
      </SettingsPage>
    )
  }

  return (
    <SettingsPage title="Brand">
      {/* Logos */}
      <SettingsSection title="Logos" description="Your studio branding for the client portal">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Light Mode Logo */}
          <div className="rounded-lg border bg-card p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Light Mode</h4>
                {logoLightUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleAssetRemove("logo-light")}
                    disabled={uploadingAsset === "logo-light"}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div
                className="relative aspect-[3/2] rounded-lg border-2 border-dashed bg-muted/50 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => logoLightInputRef.current?.click()}
              >
                {uploadingAsset === "logo-light" ? (
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                ) : logoLightUrl ? (
                  <img
                    src={logoLightUrl}
                    alt="Light mode logo"
                    className="size-full object-contain p-2"
                  />
                ) : (
                  <div className="text-center p-4">
                    <Upload className="size-6 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-xs text-muted-foreground">Click to upload</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                For light backgrounds
              </p>
              <input
                ref={logoLightInputRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg"
                className="hidden"
                onChange={(e) => handleAssetUpload(e, "logo-light")}
              />
            </div>
          </div>

          {/* Dark Mode Logo */}
          <div className="rounded-lg border bg-card p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Dark Mode</h4>
                {logoDarkUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleAssetRemove("logo-dark")}
                    disabled={uploadingAsset === "logo-dark"}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div
                className="relative aspect-[3/2] rounded-lg border-2 border-dashed bg-muted/50 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => logoDarkInputRef.current?.click()}
              >
                {uploadingAsset === "logo-dark" ? (
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                ) : logoDarkUrl ? (
                  <img
                    src={logoDarkUrl}
                    alt="Dark mode logo"
                    className="size-full object-contain p-2"
                  />
                ) : (
                  <div className="text-center p-4">
                    <Upload className="size-6 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-xs text-muted-foreground">Click to upload</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                For dark backgrounds
              </p>
              <input
                ref={logoDarkInputRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg"
                className="hidden"
                onChange={(e) => handleAssetUpload(e, "logo-dark")}
              />
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Favicon */}
      <SettingsSection title="Favicon" description="Browser tab icon for your client portal">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-4">
            <div
              className="relative size-16 rounded-lg border-2 border-dashed bg-muted/50 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors shrink-0"
              onClick={() => faviconInputRef.current?.click()}
            >
              {uploadingAsset === "favicon" ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : faviconUrl ? (
                <img
                  src={faviconUrl}
                  alt="Favicon"
                  className="size-full object-contain p-2"
                />
              ) : (
                <Upload className="size-4 text-muted-foreground/50" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">
                Recommended: 32x32 or 64x64 PNG/ICO
              </p>
              {faviconUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-0 text-xs text-destructive hover:text-destructive mt-1"
                  onClick={() => handleAssetRemove("favicon")}
                  disabled={uploadingAsset === "favicon"}
                >
                  Remove favicon
                </Button>
              )}
            </div>
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/png,image/x-icon,image/svg+xml"
              className="hidden"
              onChange={(e) => handleAssetUpload(e, "favicon")}
            />
          </div>
        </div>
      </SettingsSection>

      {/* Colors */}
      <SettingsSection title="Colors" description="Your brand color palette for proposals and portal">
        <SettingsCard>
          <SettingsRow label="Primary color">
            <ColorInput
              value={colorPrimary}
              onChange={(v) => handleColorChange("color_primary", v, setColorPrimary)}
              disabled={isSaving}
            />
          </SettingsRow>

          <SettingsRow label="Secondary color">
            <ColorInput
              value={colorSecondary}
              onChange={(v) => handleColorChange("color_secondary", v, setColorSecondary)}
              disabled={isSaving}
            />
          </SettingsRow>

          <SettingsRow label="Neutral color">
            <ColorInput
              value={colorNeutral}
              onChange={(v) => handleColorChange("color_neutral", v, setColorNeutral)}
              disabled={isSaving}
            />
          </SettingsRow>

          <SettingsRow label="Accent color">
            <ColorInput
              value={colorAccent}
              onChange={(v) => handleColorChange("color_accent", v, setColorAccent)}
              disabled={isSaving}
            />
          </SettingsRow>
        </SettingsCard>

        {/* Save colors button */}
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const updates: Record<string, string | null> = {}
              if (colorPrimary !== (brandConfig?.color_primary || "")) updates.color_primary = colorPrimary || null
              if (colorSecondary !== (brandConfig?.color_secondary || "")) updates.color_secondary = colorSecondary || null
              if (colorNeutral !== (brandConfig?.color_neutral || "")) updates.color_neutral = colorNeutral || null
              if (colorAccent !== (brandConfig?.color_accent || "")) updates.color_accent = colorAccent || null
              if (Object.keys(updates).length > 0) {
                setIsSaving(true)
                updateStudioBrandConfig(updates).then((result) => {
                  if (result.error) {
                    toast.error(result.error)
                  } else {
                    toast.success("Colors updated")
                    mutate()
                  }
                  setIsSaving(false)
                })
              }
            }}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
            Save Colors
          </Button>
        </div>
      </SettingsSection>

      {/* Typography */}
      <SettingsSection title="Typography" description="Font preferences for generated content">
        <SettingsCard>
          <SettingsRow label="Heading font">
            <Select
              value={fontHeading || ""}
              onValueChange={(value) => {
                setFontHeading(value)
                saveField("font_heading", value || null)
              }}
              disabled={isSaving}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                {HEADING_FONT_OPTIONS.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    <span className="font-medium">{font.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>

          <SettingsRow label="Body font">
            <Select
              value={fontBody || ""}
              onValueChange={(value) => {
                setFontBody(value)
                saveField("font_body", value || null)
              }}
              disabled={isSaving}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                {BODY_FONT_OPTIONS.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    <span className="font-medium">{font.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      {/* Brand Voice */}
      <SettingsSection title="Brand Voice" description="Guide AI-generated content to match your brand personality">
        {/* Voice Archetype Quick Select */}
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Quick preset</div>
          <div className="flex flex-wrap gap-2">
            {VOICE_ARCHETYPES.map((archetype) => {
              const Icon = archetype.icon
              const isSelected = selectedArchetype === archetype.value
              return (
                <button
                  key={archetype.value}
                  type="button"
                  onClick={() => handleArchetypeSelect(archetype.value)}
                  disabled={isSaving}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <Icon className="size-4" />
                  <span className="text-sm font-medium">{archetype.label}</span>
                  {isSelected && <Check className="size-3 ml-1" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Voice Spectrum Sliders */}
        <div className="rounded-lg border bg-card p-5">
          <div className="space-y-5">
            {VOICE_SPECTRUMS.map((spectrum) => (
              <div key={spectrum.key} className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{spectrum.left}</span>
                  <span>{spectrum.right}</span>
                </div>
                <Slider
                  value={[voiceSpectrums[spectrum.key] || 50]}
                  onValueChange={([value]) => handleSpectrumChange(spectrum.key, value)}
                  onValueCommit={([value]) => handleSpectrumCommit(spectrum.key, value)}
                  max={100}
                  step={5}
                  disabled={isSaving}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Writing Guidelines */}
        <SettingsCard>
          <SettingsRow label="Writing examples" description="Show AI how you write">
            <Button variant="outline" size="sm" onClick={openStyleGuideDialog}>
              {voiceStyleGuide ? "Edit" : "Add"}
            </Button>
          </SettingsRow>

          <SettingsRow label="Terminology" description="Words to use and avoid">
            <Button variant="outline" size="sm" onClick={() => setTerminologyDialogOpen(true)}>
              Manage
            </Button>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      {/* Bridge Portal Appearance */}
      <SettingsSection
        title="Client Portal Appearance"
        description="Customize how your Bridge portal looks to clients"
      >
        <SettingsCard>
          <SettingsRow label="Accent color" description="Primary color for buttons and links">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="size-8 rounded-md border cursor-pointer shrink-0 disabled:opacity-50"
                style={{ backgroundColor: bridgeAccentColor }}
                onClick={() => document.getElementById("bridge-accent-picker")?.click()}
                disabled={isSaving || bridgeBrandingLoading}
              />
              <input
                type="color"
                id="bridge-accent-picker"
                value={bridgeAccentColor}
                onChange={(e) => {
                  const color = e.target.value
                  setBridgeAccentColor(color)
                }}
                onBlur={() => {
                  if (isValidHexColor(bridgeAccentColor)) {
                    saveBridgeField("colors", {
                      accent: bridgeAccentColor,
                      accentForeground: getContrastingColor(bridgeAccentColor),
                    })
                  }
                }}
                className="sr-only"
                disabled={isSaving || bridgeBrandingLoading}
              />
              <Input
                value={bridgeAccentColor}
                onChange={(e) => setBridgeAccentColor(e.target.value)}
                onBlur={() => {
                  if (isValidHexColor(bridgeAccentColor)) {
                    saveBridgeField("colors", {
                      accent: bridgeAccentColor,
                      accentForeground: getContrastingColor(bridgeAccentColor),
                    })
                  }
                }}
                placeholder="#6366F1"
                className="w-28 font-mono text-right"
                disabled={isSaving || bridgeBrandingLoading}
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Show 'Powered by Salt Core'"
            description="Display attribution in portal footer"
          >
            {bridgeBrandingLoading ? (
              <Skeleton className="h-5 w-9" />
            ) : (
              <Switch
                checked={showPoweredBy}
                onCheckedChange={(checked) => {
                  setShowPoweredBy(checked)
                  saveBridgeField("footer", { showPoweredBy: checked })
                }}
                disabled={isSaving}
              />
            )}
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      {/* Style Guide Dialog */}
      <Dialog open={styleGuideDialogOpen} onOpenChange={setStyleGuideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Style Guide Notes</DialogTitle>
            <DialogDescription>
              Describe your writing style, things to emphasize, specific phrases you use.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={tempStyleGuide}
            onChange={(e) => setTempStyleGuide(e.target.value)}
            placeholder="We use active voice, avoid jargon, and always address the reader directly..."
            rows={6}
            maxLength={2000}
          />
          <div className="text-xs text-muted-foreground text-right">
            {tempStyleGuide.length}/2000 characters
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStyleGuideDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStyleGuideSave} disabled={isSaving}>
              {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminology Dialog */}
      <Dialog open={terminologyDialogOpen} onOpenChange={setTerminologyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Brand Terminology</DialogTitle>
            <DialogDescription>
              Manage words and phrases to use or avoid in AI-generated content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Preferred Terms */}
            <div className="space-y-3">
              <div className="text-sm font-medium">Preferred Terminology</div>
              <div className="flex gap-2">
                <Input
                  value={newPreferredTerm}
                  onChange={(e) => setNewPreferredTerm(e.target.value)}
                  placeholder="Add term..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPreferredTerm())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addPreferredTerm}>
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {terminology.preferred.map((term) => (
                  <Badge key={term} variant="secondary" className="gap-1">
                    {term}
                    <X
                      className="size-3 cursor-pointer"
                      onClick={() => removePreferredTerm(term)}
                    />
                  </Badge>
                ))}
                {terminology.preferred.length === 0 && (
                  <span className="text-sm text-muted-foreground">No preferred terms added</span>
                )}
              </div>
            </div>

            {/* Avoid Terms */}
            <div className="space-y-3">
              <div className="text-sm font-medium">Terms to Avoid</div>
              <div className="flex gap-2">
                <Input
                  value={newAvoidTerm}
                  onChange={(e) => setNewAvoidTerm(e.target.value)}
                  placeholder="Add term..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAvoidTerm())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addAvoidTerm}>
                  <Plus className="size-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {terminology.avoid.map((term) => (
                  <Badge key={term} variant="outline" className="gap-1 border-destructive/50 text-destructive">
                    {term}
                    <X
                      className="size-3 cursor-pointer"
                      onClick={() => removeAvoidTerm(term)}
                    />
                  </Badge>
                ))}
                {terminology.avoid.length === 0 && (
                  <span className="text-sm text-muted-foreground">No terms to avoid added</span>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setTerminologyDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPage>
  )
}

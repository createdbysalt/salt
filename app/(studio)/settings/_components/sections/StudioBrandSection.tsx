"use client"

import * as React from "react"
import { Loader2, Plus, X, Upload, ImageIcon } from "lucide-react"
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
} from "@repo/ui"
import { useStudioBrandConfig } from "@/app/_features/studio/hooks/useStudioBrandConfig"
import { updateStudioBrandConfig } from "@/app/_features/studio/actions"
import { useStudioProfile } from "@/app/_features/studio/hooks/useStudioProfile"
import { getBridgeBranding, updateBridgeBranding } from "@/app/_features/serve/actions"
import type { BridgeBrandingConfig } from "@/app/_lib/bridge/branding-config"
import { getContrastingColor, isValidHexColor } from "@/app/_lib/bridge/branding-config"
import { SettingsPage } from "../SettingsPage"
import { SettingsSection } from "../SettingsSection"
import { SettingsCard } from "../SettingsCard"
import { SettingsRow } from "../SettingsRow"

const VOICE_TONE_OPTIONS = [
  "professional",
  "friendly",
  "warm",
  "confident",
  "technical",
  "casual",
  "formal",
  "playful",
  "authoritative",
  "approachable",
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
  const [voiceTone, setVoiceTone] = React.useState<string[]>([])
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
      setVoiceTone(brandConfig.voice_tone || [])
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

  // Voice tone handler
  const toggleVoiceTone = (tone: string) => {
    let newTones: string[]
    if (voiceTone.includes(tone)) {
      newTones = voiceTone.filter((t) => t !== tone)
    } else if (voiceTone.length < 5) {
      newTones = [...voiceTone, tone]
    } else {
      toast.error("Maximum 5 voice tones allowed")
      return
    }
    setVoiceTone(newTones)
    saveField("voice_tone", newTones)
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

  // Logo upload handlers
  const logoInputRef = React.useRef<HTMLInputElement>(null)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // TODO: Implement logo upload to storage
    toast.info("Logo upload coming soon")
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
      {/* Logo */}
      <SettingsSection title="Logo" description="Your studio logo for proposals and client portal">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-start gap-6">
            {/* Logo Preview */}
            <div className="relative">
              {brandConfig?.logo_light_url ? (
                <div className="size-24 rounded-lg border bg-muted overflow-hidden">
                  <img
                    src={brandConfig.logo_light_url}
                    alt="Studio logo"
                    className="size-full object-contain"
                  />
                </div>
              ) : (
                <div className="size-24 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 flex items-center justify-center">
                  <ImageIcon className="size-8 text-muted-foreground/50" />
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex-1 space-y-3">
              <div>
                <h4 className="text-sm font-medium">Studio Logo</h4>
                <p className="text-sm text-muted-foreground">
                  Recommended size: 400x400px. PNG or SVG with transparent background.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Upload className="size-4 mr-2" />
                  Upload Logo
                </Button>
                {brandConfig?.logo_light_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      // TODO: Implement logo removal
                      toast.info("Logo removal coming soon")
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
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
            <Input
              value={fontHeading}
              onChange={(e) => setFontHeading(e.target.value)}
              className="w-48 text-right"
              onBlur={() => handleFontBlur("font_heading", fontHeading, brandConfig?.font_heading || null)}
              disabled={isSaving}
              placeholder="Inter, sans-serif"
            />
          </SettingsRow>

          <SettingsRow label="Body font">
            <Input
              value={fontBody}
              onChange={(e) => setFontBody(e.target.value)}
              className="w-48 text-right"
              onBlur={() => handleFontBlur("font_body", fontBody, brandConfig?.font_body || null)}
              disabled={isSaving}
              placeholder="Inter, sans-serif"
            />
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      {/* Brand Voice */}
      <SettingsSection title="Brand Voice" description="Guide AI-generated content to match your brand personality">
        <SettingsCard>
          <SettingsRow label="Voice tone" description="Select up to 5 tones">
            <div className="flex flex-wrap gap-1.5 max-w-xs justify-end">
              {VOICE_TONE_OPTIONS.map((tone) => (
                <Badge
                  key={tone}
                  variant={voiceTone.includes(tone) ? "default" : "outline"}
                  className="cursor-pointer capitalize text-xs"
                  onClick={() => toggleVoiceTone(tone)}
                >
                  {tone}
                </Badge>
              ))}
            </div>
          </SettingsRow>

          <SettingsRow label="Style guide" description="Describe your writing style">
            <Button variant="outline" size="sm" onClick={openStyleGuideDialog}>
              {voiceStyleGuide ? "Edit" : "Add"}
            </Button>
          </SettingsRow>

          <SettingsRow label="Terminology" description="Manage preferred terms">
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
            <div className="flex items-center gap-2">
              {bridgeBrandingLoading ? (
                <Skeleton className="h-6 w-10" />
              ) : (
                <button
                  type="button"
                  role="switch"
                  aria-checked={showPoweredBy}
                  onClick={() => {
                    const newValue = !showPoweredBy
                    setShowPoweredBy(newValue)
                    saveBridgeField("footer", { showPoweredBy: newValue })
                  }}
                  disabled={isSaving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showPoweredBy ? "bg-primary" : "bg-muted"
                  } ${isSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showPoweredBy ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              )}
            </div>
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

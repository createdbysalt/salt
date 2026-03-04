"use client"

import * as React from "react"
import { Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import {
  Button,
  Input,
  Skeleton,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  onBlur,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
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
        onBlur={onBlur}
        className="sr-only"
        disabled={disabled}
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
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
  const [brandColor, setBrandColor] = React.useState("")
  const [fontHeading, setFontHeading] = React.useState("inter")
  const [fontBody, setFontBody] = React.useState("inter")

  // Bridge branding state
  const { studio } = useStudioProfile()
  const [bridgeBranding, setBridgeBranding] = React.useState<BridgeBrandingConfig>({})
  const [bridgeAccentColor, setBridgeAccentColor] = React.useState("#2a77e8")
  const [showPoweredBy, setShowPoweredBy] = React.useState(true)
  const [bridgeBrandingLoading, setBridgeBrandingLoading] = React.useState(true)

  // Load Bridge branding
  React.useEffect(() => {
    async function loadBridgeBranding() {
      if (!studio?.id) return
      const result = await getBridgeBranding(studio.id)
      if (result.branding) {
        setBridgeBranding(result.branding)
        setBridgeAccentColor(result.branding.colors?.accent || "#2a77e8")
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
      toast.success("Bridge appearance updated")
      setBridgeBranding(updatedBranding)
    }
    setIsSaving(false)
  }

  // Sync state with brand config data
  React.useEffect(() => {
    if (brandConfig) {
      setBrandColor(brandConfig.color_primary || "")
      setFontHeading(brandConfig.font_heading || "inter")
      setFontBody(brandConfig.font_body || "inter")
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

  // Brand color handler
  const handleBrandColorBlur = () => {
    if (brandColor !== (brandConfig?.color_primary || "")) {
      if (brandColor && !isValidHexColor(brandColor)) {
        toast.error("Please enter a valid hex color (e.g., #FF5733)")
        setBrandColor(brandConfig?.color_primary || "")
        return
      }
      saveField("color_primary", brandColor || null)
    }
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
        <SettingsSection title="Logos">
          <Skeleton className="h-32 w-full" />
        </SettingsSection>
        <SettingsSection title="Colors">
          <SettingsCard>
            <SettingsRow label={<Skeleton className="h-4 w-24" />}>
              <Skeleton className="h-8 w-36" />
            </SettingsRow>
            <SettingsRow label={<Skeleton className="h-4 w-24" />}>
              <Skeleton className="h-8 w-36" />
            </SettingsRow>
          </SettingsCard>
        </SettingsSection>
      </SettingsPage>
    )
  }

  return (
    <SettingsPage title="Brand">
      {/* Logos */}
      <SettingsSection title="Logos" description="Your studio branding for the client Bridge">
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
      <SettingsSection title="Favicon" description="Browser tab icon for your client Bridge">
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
      <SettingsSection title="Colors" description="Brand colors for your Bridge and documents">
        <SettingsCard>
          <SettingsRow
            label="Brand color"
            description="Used in proposals, documents, and headings"
          >
            <ColorInput
              value={brandColor}
              onChange={setBrandColor}
              onBlur={handleBrandColorBlur}
              disabled={isSaving}
            />
          </SettingsRow>

          <SettingsRow
            label="Bridge accent"
            description="Buttons and links in your client Bridge"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="size-8 rounded-md border cursor-pointer shrink-0 disabled:opacity-50"
                style={{ backgroundColor: bridgeAccentColor }}
                onClick={() => document.getElementById("accent-picker")?.click()}
                disabled={isSaving || bridgeBrandingLoading}
              />
              <input
                type="color"
                id="accent-picker"
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
                placeholder="#2a77e8"
                className="w-28 font-mono text-right"
                disabled={isSaving || bridgeBrandingLoading}
              />
            </div>
          </SettingsRow>
        </SettingsCard>
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

      {/* Bridge Options */}
      <SettingsSection
        title="Bridge Options"
        description="Additional settings for your client Bridge"
      >
        <SettingsCard>
          <SettingsRow
            label="Show 'Powered by Salt Core'"
            description="Display attribution in Bridge footer"
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
    </SettingsPage>
  )
}

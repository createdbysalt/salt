"use client"

import * as React from "react"
import { Loader2, Plus, X, GraduationCap, Compass, Handshake, Briefcase, Sparkles, Check } from "lucide-react"
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
  Slider,
} from "@repo/ui"
import { useWorkspaceBrandConfig } from "@/app/_features/workspace-settings/hooks/useWorkspaceBrandConfig"
import { updateStudioBrandConfig } from "@/app/_features/workspace-settings/actions"
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

export function WorkspaceVoiceSection() {
  const { brandConfig, isLoading, mutate } = useWorkspaceBrandConfig()
  const [isSaving, setIsSaving] = React.useState(false)

  // Voice state
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

  // Sync state with brand config data
  React.useEffect(() => {
    if (brandConfig) {
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
      toast.success("Voice settings updated")
      mutate()
    }
    setIsSaving(false)
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

  if (isLoading) {
    return (
      <SettingsPage title="Voice">
        <SettingsSection title="Voice Preset">
          <div className="flex flex-wrap gap-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-24" />
            ))}
          </div>
        </SettingsSection>
        <SettingsSection title="Voice Spectrum">
          <Skeleton className="h-48 w-full" />
        </SettingsSection>
      </SettingsPage>
    )
  }

  return (
    <SettingsPage title="Voice">
      {/* Voice Archetype Quick Select */}
      <SettingsSection
        title="Voice Preset"
        description="Quick-start with a personality archetype"
      >
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
      </SettingsSection>

      {/* Voice Spectrum Sliders */}
      <SettingsSection
        title="Voice Spectrum"
        description="Fine-tune how AI-generated content sounds"
      >
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
      </SettingsSection>

      {/* Writing Guidelines */}
      <SettingsSection
        title="Writing Guidelines"
        description="Teach AI your specific writing patterns"
      >
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

"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Palette, Type, MessageSquare, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Badge,
} from "@repo/ui";
import { updateStudioBrandConfig } from "../../actions";
import { useWorkspaceBrandConfig } from "../../hooks/useWorkspaceBrandConfig";

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
] as const;

const brandSchema = z.object({
  color_primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color").optional().or(z.literal("")),
  color_secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color").optional().or(z.literal("")),
  color_neutral: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color").optional().or(z.literal("")),
  color_accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color").optional().or(z.literal("")),
  font_heading: z.string().max(100).optional(),
  font_body: z.string().max(100).optional(),
  voice_tone: z.array(z.string()).optional(),
  voice_style_guide: z.string().max(2000).optional(),
  voice_terminology: z.object({
    preferred: z.array(z.string()),
    avoid: z.array(z.string()),
  }).optional(),
});

type BrandFormData = z.infer<typeof brandSchema>;

function ColorInput({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <div
          className="size-10 rounded-md border cursor-pointer shrink-0"
          style={{ backgroundColor: value || "#ffffff" }}
          onClick={() => document.getElementById(`${id}-picker`)?.click()}
        />
        <input
          type="color"
          id={`${id}-picker`}
          value={value || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="font-mono"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function BrandSection() {
  const { brandConfig, isLoading, mutate } = useWorkspaceBrandConfig();
  const [isPending, startTransition] = React.useTransition();
  const [preferredTerm, setPreferredTerm] = React.useState("");
  const [avoidTerm, setAvoidTerm] = React.useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      color_primary: "",
      color_secondary: "",
      color_neutral: "",
      color_accent: "",
      font_heading: "",
      font_body: "",
      voice_tone: [],
      voice_style_guide: "",
      voice_terminology: {
        preferred: [],
        avoid: [],
      },
    },
  });

  const voiceTone = watch("voice_tone") || [];
  const terminology = watch("voice_terminology") || { preferred: [], avoid: [] };

  // Update form when brand config loads
  React.useEffect(() => {
    if (brandConfig) {
      setValue("color_primary", brandConfig.color_primary || "");
      setValue("color_secondary", brandConfig.color_secondary || "");
      setValue("color_neutral", brandConfig.color_neutral || "");
      setValue("color_accent", brandConfig.color_accent || "");
      setValue("font_heading", brandConfig.font_heading || "");
      setValue("font_body", brandConfig.font_body || "");
      setValue("voice_tone", brandConfig.voice_tone || []);
      setValue("voice_style_guide", brandConfig.voice_style_guide || "");
      setValue("voice_terminology", brandConfig.voice_terminology || { preferred: [], avoid: [] });
    }
  }, [brandConfig, setValue]);

  const toggleVoiceTone = (tone: string) => {
    const current = voiceTone;
    if (current.includes(tone)) {
      setValue("voice_tone", current.filter((t) => t !== tone), { shouldDirty: true });
    } else if (current.length < 5) {
      setValue("voice_tone", [...current, tone], { shouldDirty: true });
    }
  };

  const addPreferredTerm = () => {
    if (preferredTerm.trim() && !terminology.preferred.includes(preferredTerm.trim())) {
      setValue(
        "voice_terminology",
        {
          ...terminology,
          preferred: [...terminology.preferred, preferredTerm.trim()],
        },
        { shouldDirty: true }
      );
      setPreferredTerm("");
    }
  };

  const removePreferredTerm = (term: string) => {
    setValue(
      "voice_terminology",
      {
        ...terminology,
        preferred: terminology.preferred.filter((t) => t !== term),
      },
      { shouldDirty: true }
    );
  };

  const addAvoidTerm = () => {
    if (avoidTerm.trim() && !terminology.avoid.includes(avoidTerm.trim())) {
      setValue(
        "voice_terminology",
        {
          ...terminology,
          avoid: [...terminology.avoid, avoidTerm.trim()],
        },
        { shouldDirty: true }
      );
      setAvoidTerm("");
    }
  };

  const removeAvoidTerm = (term: string) => {
    setValue(
      "voice_terminology",
      {
        ...terminology,
        avoid: terminology.avoid.filter((t) => t !== term),
      },
      { shouldDirty: true }
    );
  };

  const onSubmit = (data: BrandFormData) => {
    startTransition(async () => {
      const result = await updateStudioBrandConfig(data);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Brand settings updated");
      mutate();
    });
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="size-5" />
              Colors
            </CardTitle>
            <CardDescription>
              Your brand color palette for proposals and portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ColorInput
              id="color_primary"
              label="Primary Color"
              value={watch("color_primary") || ""}
              onChange={(v) => setValue("color_primary", v, { shouldDirty: true })}
              error={errors.color_primary?.message}
            />
            <ColorInput
              id="color_secondary"
              label="Secondary Color"
              value={watch("color_secondary") || ""}
              onChange={(v) => setValue("color_secondary", v, { shouldDirty: true })}
              error={errors.color_secondary?.message}
            />
            <ColorInput
              id="color_neutral"
              label="Neutral Color"
              value={watch("color_neutral") || ""}
              onChange={(v) => setValue("color_neutral", v, { shouldDirty: true })}
              error={errors.color_neutral?.message}
            />
            <ColorInput
              id="color_accent"
              label="Accent Color"
              value={watch("color_accent") || ""}
              onChange={(v) => setValue("color_accent", v, { shouldDirty: true })}
              error={errors.color_accent?.message}
            />
          </CardContent>
        </Card>

        {/* Typography */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="size-5" />
              Typography
            </CardTitle>
            <CardDescription>
              Font preferences for generated content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="font_heading">Heading Font</Label>
              <Input
                id="font_heading"
                {...register("font_heading")}
                placeholder="Inter, sans-serif"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="font_body">Body Font</Label>
              <Input
                id="font_body"
                {...register("font_body")}
                placeholder="Inter, sans-serif"
              />
            </div>
          </CardContent>
        </Card>

        {/* Voice Tone */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5" />
              Brand Voice
            </CardTitle>
            <CardDescription>
              Guide AI-generated content to match your brand personality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tone Selection */}
            <div className="space-y-3">
              <Label>Voice Tone (select up to 5)</Label>
              <div className="flex flex-wrap gap-2">
                {VOICE_TONE_OPTIONS.map((tone) => (
                  <Badge
                    key={tone}
                    variant={voiceTone.includes(tone) ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => toggleVoiceTone(tone)}
                  >
                    {tone}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Style Guide */}
            <div className="space-y-2">
              <Label htmlFor="voice_style_guide">Style Guide Notes</Label>
              <Textarea
                id="voice_style_guide"
                {...register("voice_style_guide")}
                placeholder="Describe your writing style, things to emphasize, specific phrases you use..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Help AI understand your unique voice
              </p>
            </div>

            {/* Terminology */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Preferred Terms */}
              <div className="space-y-3">
                <Label>Preferred Terminology</Label>
                <div className="flex gap-2">
                  <Input
                    value={preferredTerm}
                    onChange={(e) => setPreferredTerm(e.target.value)}
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
                </div>
              </div>

              {/* Avoid Terms */}
              <div className="space-y-3">
                <Label>Terms to Avoid</Label>
                <div className="flex gap-2">
                  <Input
                    value={avoidTerm}
                    onChange={(e) => setAvoidTerm(e.target.value)}
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
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <Button type="submit" disabled={isPending || !isDirty}>
          {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}

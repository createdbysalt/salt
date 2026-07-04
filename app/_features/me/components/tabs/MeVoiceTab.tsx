"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Check, X, Plus, Sparkles, Building2, User, Eye, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@repo/ui";
import { cn } from "@repo/utils";
import { SectionCard } from "../MeSection";
import { VoiceSpectrumControls } from "../VoiceSpectrumControls";
import { EffectiveVoiceCard } from "../EffectiveVoiceCard";
import { VoiceSampleLearningSection } from "../VoiceSampleLearningSection";
import { updateOperatorVoiceProfile } from "../../actions";
import { extractVoiceFromSamples } from "../../actions/extract-voice";
import { generateVoicePreview, type PreviewScenario } from "../../actions/generate-voice-preview";
import { mergeVoice } from "../../utils/merge-voice";
import { sampleHasMinimumContent } from "../../utils/voice-sample-utils";
import type { VoiceExtractionResult } from "../../utils/voice-extraction-prompt";
import {
  HUMANIZED_VOICE_DEFAULTS,
  type OperatorVoiceProfile,
  type VoiceSpectrums,
  type WorkspaceVoice,
} from "../../types";

const DEFAULT_SPECTRUMS: VoiceSpectrums = HUMANIZED_VOICE_DEFAULTS.voiceSpectrums!;

export function MeVoiceTab({
  voice,
  workspaceVoice,
}: {
  voice: OperatorVoiceProfile;
  workspaceVoice: WorkspaceVoice;
}) {
  const [tone, setTone] = useState<string[]>(voice.voiceTone);
  const [toneDraft, setToneDraft] = useState("");
  const [spectrums, setSpectrums] = useState<VoiceSpectrums>(
    voice.voiceSpectrums ?? DEFAULT_SPECTRUMS,
  );
  const [styleGuide, setStyleGuide] = useState(voice.voiceStyleGuide ?? "");
  const [preferred, setPreferred] = useState<string[]>(voice.voiceTerminology.preferred);
  const [avoid, setAvoid] = useState<string[]>(voice.voiceTerminology.avoid);
  const [pending, startTransition] = useTransition();

  // Sample-based learning state
  const [samples, setSamples] = useState<string[]>([""]);
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState<VoiceExtractionResult | null>(null);

  // Preview state
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<{ withVoice: string; generic: string; scenario: string } | null>(null);

  const hasWorkspaceVoice = workspaceVoice.voiceTone.length > 0 ||
    workspaceVoice.voiceStyleGuide ||
    workspaceVoice.voiceSpectrums;

  const liveEffectiveVoice = useMemo(
    () =>
      mergeVoice(workspaceVoice, {
        voiceTone: tone,
        voiceSpectrums: spectrums,
        voiceArchetype: voice.voiceArchetype,
        voiceStyleGuide: styleGuide,
        voiceTerminology: { preferred, avoid },
        learnedStyle: voice.learnedStyle,
        inheritsWorkspace: true,
      }),
    [
      workspaceVoice,
      tone,
      spectrums,
      styleGuide,
      preferred,
      avoid,
      voice.voiceArchetype,
      voice.learnedStyle,
    ],
  );

  const handleExtract = async () => {
    const validSamples = samples.filter((s) => sampleHasMinimumContent(s));
    if (validSamples.length === 0) {
      toast.error("Need at least one sample with 50+ words");
      return;
    }

    setExtracting(true);
    const result = await extractVoiceFromSamples({ samples: validSamples });
    setExtracting(false);

    if (result.ok) {
      setExtraction(result.data);
      toast.success("Voice extracted! Review and apply below.");
    } else {
      toast.error(result.message);
    }
  };

  const applyExtraction = () => {
    if (!extraction) return;
    const newTone = extraction.tone;
    const newSpectrums = extraction.spectrums;
    const newStyleGuide = extraction.styleNotes || styleGuide;
    const newPreferred = [...new Set([...preferred, ...extraction.terminology.preferred])];
    const newAvoid = [...new Set([...avoid, ...extraction.terminology.avoid])];

    setTone(newTone);
    setSpectrums(newSpectrums);
    setStyleGuide(newStyleGuide);
    setPreferred(newPreferred);
    setAvoid(newAvoid);
    setExtraction(null);

    autoSave({
      voiceTone: newTone,
      voiceSpectrums: newSpectrums,
      voiceStyleGuide: newStyleGuide,
      voiceTerminology: { preferred: newPreferred, avoid: newAvoid },
    });
    toast.success("Applied extracted voice");
  };

  const addSample = () => {
    if (samples.length < 8) {
      setSamples((p) => [...p, ""]);
    }
  };

  const updateSample = (index: number, value: string) => {
    setSamples((p) => p.map((s, i) => (i === index ? value : s)));
  };

  const removeSample = (index: number) => {
    if (samples.length > 1) {
      setSamples((p) => p.filter((_, i) => i !== index));
    }
  };

  const handleGeneratePreview = async (scenario: PreviewScenario) => {
    setPreviewLoading(true);
    const currentVoice: OperatorVoiceProfile = {
      voiceTone: tone,
      voiceSpectrums: spectrums,
      voiceArchetype: null,
      voiceStyleGuide: styleGuide,
      learnedStyle: null,
      voiceTerminology: { preferred, avoid },
      inheritsWorkspace: true,
    };

    const result = await generateVoicePreview({
      scenario,
      personalVoice: currentVoice,
      workspaceVoice,
    });

    setPreviewLoading(false);

    if (result.ok) {
      setPreview({
        withVoice: result.withVoice,
        generic: result.generic,
        scenario: result.scenario,
      });
    } else {
      toast.error(result.message);
    }
  };

  // Auto-save helper
  const autoSave = (updates: Partial<{
    voiceTone: string[];
    voiceSpectrums: VoiceSpectrums;
    voiceStyleGuide: string;
    voiceTerminology: { preferred: string[]; avoid: string[] };
  }>) => {
    startTransition(async () => {
      const res = await updateOperatorVoiceProfile({
        inheritsWorkspace: true,
        voiceTone: updates.voiceTone ?? tone,
        voiceSpectrums: updates.voiceSpectrums ?? spectrums,
        voiceStyleGuide: updates.voiceStyleGuide ?? styleGuide,
        voiceTerminology: updates.voiceTerminology ?? { preferred, avoid },
      });
      if (!res.ok) toast.error(res.message);
    });
  };

  const addTone = () => {
    const v = toneDraft.trim().toLowerCase();
    if (v && !tone.includes(v)) {
      const newTone = [...tone, v];
      setTone(newTone);
      autoSave({ voiceTone: newTone });
    }
    setToneDraft("");
  };

  const removeTone = (t: string) => {
    const newTone = tone.filter((x) => x !== t);
    setTone(newTone);
    autoSave({ voiceTone: newTone });
  };

  const handleSpectrumCommit = (key: keyof VoiceSpectrums, value: number) => {
    const newSpectrums = { ...spectrums, [key]: value };
    setSpectrums(newSpectrums);
    autoSave({ voiceSpectrums: newSpectrums });
  };

  const handleStyleGuideBlur = () => {
    if (styleGuide !== (voice.voiceStyleGuide ?? "")) {
      autoSave({ voiceStyleGuide: styleGuide });
    }
  };

  const handleTerminologyChange = (type: "preferred" | "avoid", items: string[]) => {
    if (type === "preferred") {
      setPreferred(items);
      autoSave({ voiceTerminology: { preferred: items, avoid } });
    } else {
      setAvoid(items);
      autoSave({ voiceTerminology: { preferred, avoid: items } });
    }
  };

  const resetToHumanized = () => {
    const h = HUMANIZED_VOICE_DEFAULTS;
    setTone(h.voiceTone);
    setSpectrums(h.voiceSpectrums!);
    setStyleGuide(h.voiceStyleGuide ?? "");
    setPreferred(h.voiceTerminology.preferred);
    setAvoid(h.voiceTerminology.avoid);
    autoSave({
      voiceTone: h.voiceTone,
      voiceSpectrums: h.voiceSpectrums!,
      voiceStyleGuide: h.voiceStyleGuide ?? "",
      voiceTerminology: h.voiceTerminology,
    });
    toast.success("Loaded humanized defaults");
  };

  return (
    <div className="space-y-8">
      <SectionCard
        eyebrow="How you sound"
        title="Your voice"
        description="Salt writes in this voice when drafting as you. Your personal settings layer over workspace defaults."
        action={pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      >
        {hasWorkspaceVoice && (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="size-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Workspace base layer
              </p>
            </div>
            {workspaceVoice.voiceTone.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {workspaceVoice.voiceTone.map((t) => (
                  <span key={t} className="rounded-md border border-border/60 bg-card px-2 py-0.5 text-[11px] text-foreground/70">{t}</span>
                ))}
              </div>
            )}
            {workspaceVoice.voiceStyleGuide && (
              <p className="mt-2 text-xs text-muted-foreground leading-snug line-clamp-2">{workspaceVoice.voiceStyleGuide}</p>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground/70">
              Your settings below extend and override these defaults.
            </p>
          </div>
        )}

        <EffectiveVoiceCard voice={liveEffectiveVoice} personalTone={tone} />
      </SectionCard>

      {/* Sample-based learning */}
      <SectionCard
        eyebrow="Learn from samples"
        title="Teach Salt your voice"
        description="Paste examples of your writing. Salt will extract your voice characteristics."
      >
        <VoiceSampleLearningSection
          samples={samples}
          extracting={extracting}
          extraction={extraction}
          onAddSample={addSample}
          onUpdateSample={updateSample}
          onRemoveSample={removeSample}
          onExtract={handleExtract}
          onApplyExtraction={applyExtraction}
          onDiscardExtraction={() => setExtraction(null)}
        />
      </SectionCard>

      <SectionCard eyebrow="Tone" title="Words that describe your voice">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tone.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[12px] text-foreground">
              {t}
              <button onClick={() => removeTone(t)} aria-label={`Remove ${t}`}>
                <X className="size-3 text-muted-foreground hover:text-destructive" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={toneDraft}
            onChange={(e) => setToneDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTone(); } }}
            placeholder="e.g. direct, warm, witty"
          />
          <Button variant="outline" onClick={addTone}><Plus className="size-4" /></Button>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Spectrums"
        title="Dial in the feel"
        description="Four dials that shape how Salt writes for you. Style guide overrides these when set."
      >
        <VoiceSpectrumControls
          value={spectrums}
          onValueChange={setSpectrums}
          onValueCommit={handleSpectrumCommit}
          disabled={pending}
        />
      </SectionCard>

      <SectionCard
        eyebrow="Style guide"
        title="Explicit instructions"
        description="The strongest signal. Overrides spectrums and learned style when set."
      >
        <Textarea
          value={styleGuide}
          onChange={(e) => setStyleGuide(e.target.value)}
          onBlur={handleStyleGuideBlur}
          rows={4}
          placeholder={HUMANIZED_VOICE_DEFAULTS.voiceStyleGuide ?? undefined}
        />
      </SectionCard>

      <SectionCard eyebrow="Terminology" title="Words to prefer and avoid">
        <div className="grid sm:grid-cols-2 gap-4">
          <TermList label="Prefer" tone="emerald" items={preferred} onChange={(items) => handleTerminologyChange("preferred", items)} />
          <TermList label="Avoid" tone="destructive" items={avoid} onChange={(items) => handleTerminologyChange("avoid", items)} />
        </div>
        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={resetToHumanized}>
            <Sparkles className="size-3.5" /> Load humanized defaults
          </Button>
        </div>
      </SectionCard>

      {/* Voice Preview */}
      <SectionCard
        eyebrow="Preview"
        title="See your voice in action"
        description="Compare your voice settings against generic AI output."
      >
        <button
          type="button"
          onClick={() => setPreviewExpanded(!previewExpanded)}
          className="w-full flex items-center justify-between rounded-xl border border-border/60 bg-card p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
              <Eye className="size-5 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Preview your voice</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                See side-by-side comparison with generic AI
              </p>
            </div>
          </div>
          {previewExpanded ? (
            <ChevronUp className="size-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-5 text-muted-foreground" />
          )}
        </button>

        {previewExpanded && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGeneratePreview("followup")}
                disabled={previewLoading}
              >
                Follow-up email
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGeneratePreview("proposal")}
                disabled={previewLoading}
              >
                Proposal intro
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGeneratePreview("update")}
                disabled={previewLoading}
              >
                Project update
              </Button>
            </div>

            {previewLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {preview && !previewLoading && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="size-4 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Generic AI
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {preview.generic}
                  </p>
                </div>

                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="size-4 text-primary" />
                    <p className="text-xs font-medium text-primary uppercase tracking-wide">
                      Your voice
                    </p>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {preview.withVoice}
                  </p>
                </div>
              </div>
            )}

            {preview && !previewLoading && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleGeneratePreview(preview.scenario === "Follow-up email" ? "followup" : preview.scenario === "Proposal intro" ? "proposal" : "update")}
                >
                  <RefreshCw className="size-3.5" />
                  Regenerate
                </Button>
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function TermList({
  label,
  tone,
  items,
  onChange,
}: {
  label: string;
  tone: "emerald" | "destructive";
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !items.includes(v)) onChange([...items, v]);
    setDraft("");
  };
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((t) => (
          <span
            key={t}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
              tone === "emerald"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                : "border-destructive/30 bg-destructive/10 text-destructive",
            )}
          >
            {t}
            <button onClick={() => onChange(items.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={`Add a word to ${label.toLowerCase()}`}
          className="h-8 text-sm"
        />
        <Button variant="outline" size="sm" onClick={add}><Plus className="size-3.5" /></Button>
      </div>
    </div>
  );
}

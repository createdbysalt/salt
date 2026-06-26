"use client";

import { useState, useTransition } from "react";
import { Loader2, Check, X, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Textarea, Slider, Switch } from "@repo/ui";
import { cn } from "@repo/utils";
import { SectionCard } from "../MeSection";
import { updateOperatorVoiceProfile } from "../../actions";
import {
  HUMANIZED_VOICE_DEFAULTS,
  type OperatorVoiceProfile,
  type VoiceSpectrums,
  type WorkspaceVoice,
} from "../../types";

const SPECTRUM_LABELS: { key: keyof VoiceSpectrums; left: string; right: string }[] = [
  { key: "formality", left: "Casual", right: "Formal" },
  { key: "complexity", left: "Simple", right: "Complex" },
  { key: "warmth", left: "Neutral", right: "Warm" },
  { key: "brevity", left: "Detailed", right: "Brief" },
];

const DEFAULT_SPECTRUMS: VoiceSpectrums = HUMANIZED_VOICE_DEFAULTS.voiceSpectrums!;

export function MeVoiceTab({
  voice,
  workspaceVoice,
}: {
  voice: OperatorVoiceProfile;
  workspaceVoice: WorkspaceVoice;
}) {
  const [inherits, setInherits] = useState(voice.inheritsWorkspace);
  const [tone, setTone] = useState<string[]>(voice.voiceTone);
  const [toneDraft, setToneDraft] = useState("");
  const [spectrums, setSpectrums] = useState<VoiceSpectrums>(
    voice.voiceSpectrums ?? workspaceVoice.voiceSpectrums ?? DEFAULT_SPECTRUMS,
  );
  const [styleGuide, setStyleGuide] = useState(voice.voiceStyleGuide ?? "");
  const [preferred, setPreferred] = useState<string[]>(voice.voiceTerminology.preferred);
  const [avoid, setAvoid] = useState<string[]>(voice.voiceTerminology.avoid);
  const [pending, startTransition] = useTransition();

  const addTone = () => {
    const v = toneDraft.trim().toLowerCase();
    if (v && !tone.includes(v)) setTone((p) => [...p, v]);
    setToneDraft("");
  };

  const save = () => {
    startTransition(async () => {
      const res = await updateOperatorVoiceProfile({
        inheritsWorkspace: inherits,
        voiceTone: tone,
        voiceSpectrums: spectrums,
        voiceStyleGuide: styleGuide,
        voiceTerminology: { preferred, avoid },
      });
      if (res.ok) toast.success("Voice updated");
      else toast.error(res.message);
    });
  };

  const resetToHumanized = () => {
    setTone(HUMANIZED_VOICE_DEFAULTS.voiceTone);
    setSpectrums(HUMANIZED_VOICE_DEFAULTS.voiceSpectrums!);
    setStyleGuide(HUMANIZED_VOICE_DEFAULTS.voiceStyleGuide ?? "");
    setPreferred(HUMANIZED_VOICE_DEFAULTS.voiceTerminology.preferred);
    setAvoid(HUMANIZED_VOICE_DEFAULTS.voiceTerminology.avoid);
    toast("Loaded humanized defaults — review and save");
  };

  return (
    <div className="space-y-8">
      <SectionCard
        eyebrow="How you sound"
        title="Your voice"
        description="Salt writes in this voice when it drafts as you. Personal settings layer over your workspace brand voice."
        action={
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Save
          </Button>
        }
      >
        <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Inherit workspace voice</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Start from your workspace brand voice, then personalize below.
            </p>
          </div>
          <Switch checked={inherits} onCheckedChange={setInherits} />
        </div>

        {(workspaceVoice.voiceTone.length > 0 || workspaceVoice.voiceStyleGuide) && (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground inline-flex items-center gap-1">
              <Sparkles className="size-3" /> Inherited workspace voice
            </p>
            {workspaceVoice.voiceTone.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {workspaceVoice.voiceTone.map((t) => (
                  <span key={t} className="rounded-md border border-border/60 bg-card px-2 py-0.5 text-[11px] text-foreground/70">{t}</span>
                ))}
              </div>
            )}
            {workspaceVoice.voiceStyleGuide && (
              <p className="mt-2 text-xs text-muted-foreground leading-snug">{workspaceVoice.voiceStyleGuide}</p>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard eyebrow="Tone" title="Words that describe your voice">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tone.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[12px] text-foreground">
              {t}
              <button onClick={() => setTone((p) => p.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
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

      <SectionCard eyebrow="Spectrums" title="Dial in the feel">
        <div className="space-y-5">
          {SPECTRUM_LABELS.map(({ key, left, right }) => (
            <div key={key}>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                <span>{left}</span>
                <span className="tabular-nums">{spectrums[key]}</span>
                <span>{right}</span>
              </div>
              <Slider
                value={[spectrums[key]]}
                onValueChange={(v) => setSpectrums((p) => ({ ...p, [key]: v[0] }))}
                max={100}
                step={5}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Style guide"
        title="Explicit instructions"
        description="The strongest signal. Overrides spectrums and learned style when set."
      >
        <Textarea
          value={styleGuide}
          onChange={(e) => setStyleGuide(e.target.value)}
          rows={4}
          placeholder={HUMANIZED_VOICE_DEFAULTS.voiceStyleGuide ?? undefined}
        />
      </SectionCard>

      <SectionCard eyebrow="Terminology" title="Words to prefer and avoid">
        <div className="grid sm:grid-cols-2 gap-4">
          <TermList label="Prefer" tone="emerald" items={preferred} onChange={setPreferred} />
          <TermList label="Avoid" tone="destructive" items={avoid} onChange={setAvoid} />
        </div>
        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={resetToHumanized}>
            <Sparkles className="size-3.5" /> Load humanized defaults
          </Button>
        </div>
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

"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Loader2, MessageSquare, CreditCard, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui";
import { cn } from "@repo/utils";
import { SectionCard } from "./MeSection";
import { createVoice, updateVoice, deleteVoice } from "../voices/actions";
import type { VoiceProfile } from "../voices/queries";

const VOICE_ICONS: Record<string, typeof MessageSquare> = {
  billing: CreditCard,
  "follow-up": Mail,
  brief: MessageSquare,
};

function VoiceIcon({ slug }: { slug: string }) {
  const Icon = VOICE_ICONS[slug] ?? Sparkles;
  return <Icon className="size-4" />;
}

interface VoiceProfileCardProps {
  profile: VoiceProfile;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

function VoiceProfileCard({ profile, onEdit, onDelete, isDeleting }: VoiceProfileCardProps) {
  const isSalt = profile.type === "salt";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        isSalt
          ? "border-border/60 bg-muted/30"
          : "border-primary/20 bg-primary/5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "size-10 rounded-lg flex items-center justify-center",
              isSalt ? "bg-muted" : "bg-primary/10"
            )}
          >
            <VoiceIcon slug={profile.slug} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{profile.name}</p>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                  isSalt
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/10 text-primary"
                )}
              >
                {isSalt ? "Salt" : "Custom"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{profile.tone}</p>
          </div>
        </div>

        {!isSalt && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onEdit}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
            </Button>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {profile.instructions}
      </p>

      {profile.sign_off && (
        <p className="mt-2 text-[11px] text-muted-foreground/70 italic">
          Signs off: "{profile.sign_off}"
        </p>
      )}
    </div>
  );
}

interface CreateVoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  editingProfile?: VoiceProfile | null;
}

function CreateVoiceDialog({
  open,
  onOpenChange,
  workspaceId,
  editingProfile,
}: CreateVoiceDialogProps) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(editingProfile?.name ?? "");
  const [tone, setTone] = useState(editingProfile?.tone ?? "");
  const [instructions, setInstructions] = useState(editingProfile?.instructions ?? "");
  const [signOff, setSignOff] = useState(editingProfile?.sign_off ?? "");

  const isEditing = !!editingProfile;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      if (isEditing) {
        const result = await updateVoice({
          id: editingProfile.id,
          name,
          tone,
          instructions,
          sign_off: signOff || null,
        });

        if (result.success) {
          toast.success("Voice profile updated");
          onOpenChange(false);
        } else {
          toast.error(result.error);
        }
      } else {
        const result = await createVoice({
          workspaceId,
          name,
          tone,
          instructions,
          sign_off: signOff || undefined,
        });

        if (result.success) {
          toast.success("Voice profile created");
          onOpenChange(false);
          setName("");
          setTone("");
          setInstructions("");
          setSignOff("");
        } else {
          toast.error(result.error);
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Voice Profile" : "Create Voice Profile"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update how this voice sounds when Salt writes for you."
              : "Create a custom voice for specific types of communication."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Friendly Client"
              className="mt-1.5"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Tone</label>
            <Input
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="e.g., warm, casual, approachable"
              className="mt-1.5"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">
              Instructions
            </label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="How should Salt write in this voice? E.g., use contractions, keep it brief, start with their name..."
              className="mt-1.5"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">
              Sign-off (optional)
            </label>
            <Input
              value={signOff}
              onChange={(e) => setSignOff(e.target.value)}
              placeholder="e.g., Cheers, Best, Thanks"
              className="mt-1.5"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin mr-2" />}
              {isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface VoiceProfilesSectionProps {
  profiles: VoiceProfile[];
  workspaceId: string;
}

export function VoiceProfilesSection({
  profiles,
  workspaceId,
}: VoiceProfilesSectionProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<VoiceProfile | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const saltProfiles = profiles.filter((p) => p.type === "salt");
  const customProfiles = profiles.filter((p) => p.type === "custom");

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteVoice(id);
    setDeletingId(null);

    if (result.success) {
      toast.success("Voice profile deleted");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <>
      <SectionCard
        eyebrow="Playbook voices"
        title="Voice profiles"
        description="Voices define how Salt writes for different situations. Playbooks reference these profiles."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-3.5" />
            Create
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Salt-provided voices */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-3">
              Salt-provided
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {saltProfiles.map((profile) => (
                <VoiceProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          </div>

          {/* Custom voices */}
          {customProfiles.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-3">
                Custom
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {customProfiles.map((profile) => (
                  <VoiceProfileCard
                    key={profile.id}
                    profile={profile}
                    onEdit={() => setEditingProfile(profile)}
                    onDelete={() => handleDelete(profile.id)}
                    isDeleting={deletingId === profile.id}
                  />
                ))}
              </div>
            </div>
          )}

          {customProfiles.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-center">
              <Sparkles className="size-8 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No custom voices yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Create a voice for specific clients or communication styles
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-3.5" />
                Create voice
              </Button>
            </div>
          )}
        </div>
      </SectionCard>

      <CreateVoiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        workspaceId={workspaceId}
      />

      <CreateVoiceDialog
        open={!!editingProfile}
        onOpenChange={(open) => !open && setEditingProfile(null)}
        workspaceId={workspaceId}
        editingProfile={editingProfile}
      />
    </>
  );
}

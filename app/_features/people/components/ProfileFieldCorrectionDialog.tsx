"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input } from "@repo/ui";
import type { PersonProfileFieldKey } from "@/app/_features/plays/playbooks/profile/types";
import { correctPersonProfileField } from "@/app/_features/people/actions/profile-fields";

const RELATIONSHIP_OPTIONS = [
  "client",
  "prospect",
  "team",
  "partner",
  "vendor",
  "personal",
  "unknown",
] as const;

type ProfileFieldCorrectionDialogProps = {
  personId: string;
  field: PersonProfileFieldKey | null;
  currentValue: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function ProfileFieldCorrectionDialog({
  personId,
  field,
  currentValue,
  open,
  onOpenChange,
  onSaved,
}: ProfileFieldCorrectionDialogProps) {
  const [value, setValue] = useState(currentValue ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(currentValue ?? "");
      setError(null);
    }
  }, [currentValue, open]);

  async function handleSave() {
    if (!field) return;
    setPending(true);
    setError(null);
    const result = await correctPersonProfileField({
      personId,
      field,
      value: value.trim(),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct {fieldLabel(field)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {field === "relationship_type" ? (
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              {RELATIONSHIP_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <Input value={value} onChange={(e) => setValue(e.target.value)} />
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="button" onClick={handleSave} disabled={pending || !value.trim()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Save correction"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function fieldLabel(field: PersonProfileFieldKey | null): string {
  switch (field) {
    case "relationship_type":
      return "relationship";
    case "title":
      return "job title";
    case "org_link":
      return "organization link";
    default:
      return "field";
  }
}

"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { cn } from "@repo/utils";
import { PersonSearchCombobox } from "@/app/_features/memory/components/PersonSearchCombobox";
import type { MeetingAttendee } from "../queries";

const ROLE_OPTIONS = [
  { value: "client", label: "Client" },
  { value: "team", label: "Team" },
] as const;

const formLabelClass =
  "text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground";

const inlineFormShellClass =
  "space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4";

function RoleSelect({
  value,
  onChange,
}: {
  value: "client" | "team";
  onChange: (value: "client" | "team") => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ROLE_OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition",
              active
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-border/40 bg-muted/60 text-foreground/70 hover:bg-muted hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

interface AttendeeRowProps {
  attendee: MeetingAttendee;
  onRemove: () => void;
  isRemoving: boolean;
}

function AttendeeRow({ attendee, onRemove, isRemoving }: AttendeeRowProps) {
  const initials = attendee.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{attendee.name}</p>
        <p className="text-xs capitalize text-muted-foreground">{attendee.role}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={isRemoving}
        className="flex size-6 items-center justify-center rounded-md text-muted-foreground/60 transition hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        {isRemoving ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <X className="size-3.5" strokeWidth={2} />
        )}
      </button>
    </div>
  );
}

interface AddAttendeeFormProps {
  onAdd: (attendee: MeetingAttendee) => void;
  onCancel: () => void;
}

function AddAttendeeForm({ onAdd, onCancel }: AddAttendeeFormProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<"client" | "team">("client");
  const [saving, setSaving] = useState(false);

  const canSubmit = name.trim().length > 0 && !saving;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    try {
      onAdd({ name: name.trim(), role });
      setName("");
      setRole("client");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={inlineFormShellClass}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <p className={formLabelClass}>Add attendee</p>

      <PersonSearchCombobox
        value={name}
        onChange={setName}
        placeholder="Search or type name..."
      />

      <div className="space-y-2">
        <label className={formLabelClass}>Role</label>
        <RoleSelect value={role} onChange={setRole} />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" className="h-8 px-4" disabled={!canSubmit}>
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : "Add attendee"}
        </Button>
      </div>
    </form>
  );
}

interface MeetingAttendeesEditorProps {
  meetingId: string;
  attendees: MeetingAttendee[];
  onAttendeesChange: (attendees: MeetingAttendee[]) => void;
}

export function MeetingAttendeesEditor({
  meetingId,
  attendees,
  onAttendeesChange,
}: MeetingAttendeesEditorProps) {
  const [adding, setAdding] = useState(false);
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);

  const handleAdd = (attendee: MeetingAttendee) => {
    // Check for duplicates
    if (attendees.some((a) => a.name.toLowerCase() === attendee.name.toLowerCase())) {
      toast.error("Attendee already added");
      return;
    }
    onAttendeesChange([...attendees, attendee]);
    setAdding(false);
    toast.success(`Added ${attendee.name}`);
  };

  const handleRemove = async (index: number) => {
    setRemovingIndex(index);
    try {
      const removed = attendees[index];
      onAttendeesChange(attendees.filter((_, i) => i !== index));
      toast.success(`Removed ${removed.name}`);
    } finally {
      setRemovingIndex(null);
    }
  };

  const clientAttendees = attendees.filter((a) => a.role === "client");
  const teamAttendees = attendees.filter((a) => a.role === "team");

  return (
    <div className="space-y-4">
      {attendees.length > 0 ? (
        <div className="space-y-4">
          {clientAttendees.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Clients
              </p>
              <div className="divide-y divide-border/40 rounded-xl border border-border/50 px-3">
                {clientAttendees.map((attendee, i) => {
                  const globalIndex = attendees.findIndex(
                    (a) => a.name === attendee.name && a.role === attendee.role,
                  );
                  return (
                    <AttendeeRow
                      key={`${attendee.name}-${attendee.role}`}
                      attendee={attendee}
                      onRemove={() => handleRemove(globalIndex)}
                      isRemoving={removingIndex === globalIndex}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {teamAttendees.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Team
              </p>
              <div className="divide-y divide-border/40 rounded-xl border border-border/50 px-3">
                {teamAttendees.map((attendee) => {
                  const globalIndex = attendees.findIndex(
                    (a) => a.name === attendee.name && a.role === attendee.role,
                  );
                  return (
                    <AttendeeRow
                      key={`${attendee.name}-${attendee.role}`}
                      attendee={attendee}
                      onRemove={() => handleRemove(globalIndex)}
                      isRemoving={removingIndex === globalIndex}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {adding ? (
        <AddAttendeeForm onAdd={handleAdd} onCancel={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-3 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
        >
          <Plus className="size-3.5" strokeWidth={2.25} />
          Add attendee
        </button>
      )}
    </div>
  );
}

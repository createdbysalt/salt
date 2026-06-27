"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@repo/ui";
import { createMeeting } from "../actions";
import type { MeetingType, LocationType, Visibility } from "../actions/schemas";

type AddMeetingSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Array<{ id: string; name: string }>;
  initialClientId?: string;
};

const MEETING_TYPES: { value: MeetingType; label: string }[] = [
  { value: "discovery", label: "Discovery" },
  { value: "kickoff", label: "Kickoff" },
  { value: "check-in", label: "Check-in" },
  { value: "review", label: "Review" },
  { value: "other", label: "Other" },
];

const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: "google-meet", label: "Google Meet" },
  { value: "zoom", label: "Zoom" },
  { value: "phone", label: "Phone call" },
  { value: "in-person", label: "In person" },
  { value: "custom", label: "Custom link" },
];

function getDefaultStartTime(): string {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  now.setHours(now.getHours() + 1);
  return now.toISOString().slice(0, 16);
}

function getDefaultEndTime(startTime: string): string {
  const start = new Date(startTime);
  start.setMinutes(start.getMinutes() + 30);
  return start.toISOString().slice(0, 16);
}

export function AddMeetingSheet({
  open,
  onOpenChange,
  clients,
  initialClientId,
}: AddMeetingSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [meetingType, setMeetingType] = useState<MeetingType>("check-in");
  const [startTime, setStartTime] = useState(getDefaultStartTime);
  const [endTime, setEndTime] = useState(() => getDefaultEndTime(getDefaultStartTime()));
  const [locationType, setLocationType] = useState<LocationType>("google-meet");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("shared_with_client");

  useEffect(() => {
    if (initialClientId) {
      setClientId(initialClientId);
    }
  }, [initialClientId]);

  useEffect(() => {
    if (startTime) {
      setEndTime(getDefaultEndTime(startTime));
    }
  }, [startTime]);

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!clientId) {
      toast.error("Please select a client");
      return;
    }

    startTransition(async () => {
      const result = await createMeeting({
        title: title.trim(),
        client_id: clientId,
        meeting_type: meetingType,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        location_type: locationType,
        meeting_url: meetingUrl || undefined,
        description: description || undefined,
        visibility,
        attendees: [],
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("Meeting created");
      onOpenChange(false);
      router.push(result.data.href);
      router.refresh();
    });
  };

  const selectedClient = clients.find((c) => c.id === clientId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {/* Aurora header */}
        <div className="surface-aurora relative shrink-0 px-6 pb-5 pt-8 text-white">
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
              <Calendar className="size-3.5" strokeWidth={2.25} />
              New meeting
            </div>
            <SheetHeader className="space-y-2 text-left">
              <SheetTitle className="font-display text-3xl tracking-tight text-white">
                {title || "Schedule a meeting"}
              </SheetTitle>
              <SheetDescription className="text-sm text-white/80">
                {selectedClient
                  ? `Meeting with ${selectedClient.name}`
                  : "Add a meeting to your calendar"}
              </SheetDescription>
            </SheetHeader>
          </div>
        </div>

        {/* Form */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* Title */}
          <div>
            <label htmlFor="meeting-title" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Title *
            </label>
            <input
              id="meeting-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Discovery call with Acme"
              className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Client select */}
          <div>
            <label htmlFor="meeting-client" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Client *
            </label>
            {clients.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground">
                No clients yet. Add a client in People first.
              </p>
            ) : (
              <select
                id="meeting-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Meeting type */}
          <div>
            <label htmlFor="meeting-type" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Type
            </label>
            <select
              id="meeting-type"
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value as MeetingType)}
              className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {MEETING_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date/time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="meeting-start" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Start *
              </label>
              <input
                id="meeting-start"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="meeting-end" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                End *
              </label>
              <input
                id="meeting-end"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="meeting-location" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Location
            </label>
            <select
              id="meeting-location"
              value={locationType}
              onChange={(e) => setLocationType(e.target.value as LocationType)}
              className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {LOCATION_TYPES.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>

          {/* Meeting URL */}
          {(locationType === "google-meet" || locationType === "zoom" || locationType === "custom") && (
            <div>
              <label htmlFor="meeting-url" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Meeting link
              </label>
              <input
                id="meeting-url"
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="meeting-desc" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Description
            </label>
            <textarea
              id="meeting-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agenda or notes for this meeting..."
              className="min-h-[100px] w-full resize-none rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Visibility</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVisibility("shared_with_client")}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  visibility === "shared_with_client"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                Shared with client
              </button>
              <button
                type="button"
                onClick={() => setVisibility("internal")}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  visibility === "internal"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                Internal only
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border/60 bg-background px-6 py-4">
          <button
            type="button"
            disabled={isPending || !title.trim() || !clientId || clients.length === 0}
            onClick={handleSubmit}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" strokeWidth={2.25} /> : null}
            Create meeting
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

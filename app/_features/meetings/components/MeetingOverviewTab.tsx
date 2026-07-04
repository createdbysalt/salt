"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { format, parseISO, differenceInMinutes, addMinutes, setHours, setMinutes } from "date-fns";
import {
  AccountRow,
  InlineDatePicker,
  InlineEditableText,
  InlineEditablePhone,
  InlineSelect,
} from "@/app/_features/memory/components/AccountFieldEditors";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import { getVocabularyOptions } from "@/app/_features/memory/taxonomy/registry";
import type { ResolvedEntity } from "@/app/_lib/notes";
import type {
  MeetingDetailRecord,
  MeetingSummaryRecord,
  MeetingDecisionRecord,
  MeetingActionItemRecord,
  MeetingAttendee,
} from "../queries";
import { updateMeetingField } from "../actions";
import { MeetingDecisionsCard } from "./MeetingDecisionsCard";
import { MeetingActionItemsCard } from "./MeetingActionItemsCard";
import { MeetingAttendeesEditor } from "./MeetingAttendeesEditor";
import { MeetingAgendaCard } from "./MeetingAgendaCard";

type MeetingOverviewTabProps = {
  meeting: MeetingDetailRecord;
  meetingId: string;
  summary: MeetingSummaryRecord | null;
  decisions: MeetingDecisionRecord[];
  actionItems: MeetingActionItemRecord[];
  entities?: ResolvedEntity[];
};

const MEETING_TYPE_OPTIONS = [
  { value: "", label: "Add type" },
  ...getVocabularyOptions("meeting_type"),
];

const LOCATION_TYPE_OPTIONS = [
  { value: "", label: "Add location" },
  ...getVocabularyOptions("meeting_location_type"),
];

const STATUS_OPTIONS = getVocabularyOptions("meeting_status");

function generateTimeOptions() {
  const options: { value: string; label: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour.toString().padStart(2, "0");
      const m = minute.toString().padStart(2, "0");
      const value = `${h}:${m}`;
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const label = `${displayHour}:${m} ${period}`;
      options.push({ value, label });
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

export function MeetingOverviewTab({
  meeting,
  meetingId,
  summary,
  decisions,
  actionItems,
  entities = [],
}: MeetingOverviewTabProps) {
  const [title, setTitle] = useState(meeting.title);
  const description = meeting.description ?? "";
  const [meetingType, setMeetingType] = useState(meeting.meetingType ?? "");
  const [locationType, setLocationType] = useState(meeting.locationType ?? "");
  const [meetingUrl, setMeetingUrl] = useState(meeting.meetingUrl ?? "");
  const [address, setAddress] = useState(meeting.address ?? "");
  const [phoneNumber, setPhoneNumber] = useState(meeting.phoneNumber ?? "");
  const [status, setStatus] = useState(meeting.status);
  const [attendees, setAttendees] = useState<MeetingAttendee[]>(meeting.attendees);

  const initialStartDate = parseISO(meeting.startTime);
  const initialEndDate = parseISO(meeting.endTime);
  const initialDuration = differenceInMinutes(initialEndDate, initialStartDate);

  const [meetingDate, setMeetingDate] = useState(format(initialStartDate, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(format(initialStartDate, "HH:mm"));
  const [duration, setDuration] = useState(String(initialDuration));
  const [durationUnit, setDurationUnit] = useState<"minutes" | "hours">("minutes");

  const computedEndTime = (() => {
    const [hours, mins] = startTime.split(":").map(Number);
    const start = setMinutes(setHours(new Date(), hours), mins);
    const durationValue = parseInt(duration, 10) || 60;
    const durationInMinutes = durationUnit === "hours" ? durationValue * 60 : durationValue;
    const end = addMinutes(start, durationInMinutes);
    return format(end, "h:mm a");
  })();

  const saveMeetingField = useCallback(
    async (
      field: string,
      value: string | Array<{ name: string; email?: string }> | null,
    ) => {
      const result = await updateMeetingField(meetingId, field, value);
      if (result.error) {
        console.error("Failed to save field:", field, result.error);
        toast.error(`Could not save ${field.replace(/_/g, " ")}`);
      }
    },
    [meetingId],
  );

  const saveScheduleChange = useCallback(
    async (
      newDate: string,
      newStartTime: string,
      newDuration: string,
      newDurationUnit: "minutes" | "hours",
    ) => {
      const startDateTime = new Date(`${newDate}T${newStartTime}:00`);
      const durationValue = parseInt(newDuration, 10) || 60;
      const durationInMinutes = newDurationUnit === "hours" ? durationValue * 60 : durationValue;
      const endDateTime = addMinutes(startDateTime, durationInMinutes);

      const startTimeIso = startDateTime.toISOString();
      const endTimeIso = endDateTime.toISOString();

      const startResult = await updateMeetingField(meetingId, "start_time", startTimeIso);
      if (startResult.error) {
        console.error("Failed to save start_time:", startResult.error);
        return;
      }

      const endResult = await updateMeetingField(meetingId, "end_time", endTimeIso);
      if (endResult.error) {
        console.error("Failed to save end_time:", endResult.error);
      }
    },
    [meetingId],
  );

  return (
    <div className="space-y-6">
      {summary && (
        <MemoryOverviewSection title="Summary" salt variant="heading">
          <p className="text-sm leading-relaxed text-foreground/80">{summary.content}</p>
        </MemoryOverviewSection>
      )}

      {actionItems.some(
        (item) => !item.completed && item.dueDate && new Date(item.dueDate) < new Date()
      ) && (
        <MemoryOverviewSection title="Worth attention" salt variant="heading">
          <p className="text-sm leading-relaxed text-foreground/80">
            This meeting has{" "}
            {
              actionItems.filter(
                (item) => !item.completed && item.dueDate && new Date(item.dueDate) < new Date()
              ).length
            }{" "}
            overdue action item(s) that need follow-up.
          </p>
        </MemoryOverviewSection>
      )}

      <MemoryOverviewSection title="Details" variant="heading">
        <div className="space-y-5">
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Meeting
            </p>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <AccountRow label="Title">
                <InlineEditableText
                  value={title}
                  onChange={(value) => {
                    setTitle(value);
                    saveMeetingField("title", value);
                  }}
                  placeholder="Add title"
                />
              </AccountRow>
              <AccountRow label="Type">
                <InlineSelect
                  value={meetingType}
                  onChange={(value) => {
                    setMeetingType(value);
                    saveMeetingField("meeting_type", value);
                  }}
                  options={MEETING_TYPE_OPTIONS}
                />
              </AccountRow>
              <AccountRow label="Status">
                <InlineSelect
                  value={status}
                  onChange={(value) => {
                    setStatus(value);
                    saveMeetingField("status", value);
                  }}
                  options={STATUS_OPTIONS}
                />
              </AccountRow>
              <AccountRow label="Duration">
                <div className="flex items-center gap-1.5">
                  <InlineEditableText
                    value={duration}
                    onChange={(value) => {
                      setDuration(value);
                      saveScheduleChange(meetingDate, startTime, value, durationUnit);
                    }}
                    placeholder="60"
                    className="w-16"
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => {
                      const newUnit = e.target.value as "minutes" | "hours";
                      setDurationUnit(newUnit);
                      saveScheduleChange(meetingDate, startTime, duration, newUnit);
                    }}
                    className="h-7 rounded-md border-0 bg-transparent px-1 text-sm text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="minutes">minutes</option>
                    <option value="hours">hours</option>
                  </select>
                </div>
              </AccountRow>
            </dl>
          </div>

          <div className="border-t border-border/50 pt-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Location
            </p>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <AccountRow label="Location type">
                <InlineSelect
                  value={locationType}
                  onChange={(value) => {
                    setLocationType(value);
                    saveMeetingField("location_type", value);
                  }}
                  options={LOCATION_TYPE_OPTIONS}
                />
              </AccountRow>
              {(locationType === "google-meet" ||
                locationType === "zoom" ||
                locationType === "custom") && (
                <AccountRow label="Meeting URL">
                  <InlineEditableText
                    value={meetingUrl}
                    onChange={(value) => {
                      setMeetingUrl(value);
                      saveMeetingField("meeting_url", value);
                    }}
                    placeholder="Add URL"
                  />
                </AccountRow>
              )}
              {locationType === "in-person" && (
                <AccountRow label="Address">
                  <InlineEditableText
                    value={address}
                    onChange={(value) => {
                      setAddress(value);
                      saveMeetingField("address", value);
                    }}
                    placeholder="Search for a place or enter address"
                  />
                </AccountRow>
              )}
              {locationType === "phone" && (
                <AccountRow label="Phone number">
                  <InlineEditablePhone
                    value={phoneNumber}
                    onChange={(value) => {
                      setPhoneNumber(value);
                      saveMeetingField("phone_number", value);
                    }}
                    placeholder="+1 (555) 123-4567"
                  />
                </AccountRow>
              )}
            </dl>
          </div>

          <div className="border-t border-border/50 pt-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Schedule
            </p>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <AccountRow label="Date">
                <InlineDatePicker
                  value={meetingDate}
                  onChange={(value) => {
                    const newDate = value ?? "";
                    setMeetingDate(newDate);
                    if (newDate) {
                      saveScheduleChange(newDate, startTime, duration, durationUnit);
                    }
                  }}
                  placeholder="Select date"
                />
              </AccountRow>
              <AccountRow label="Start time">
                <InlineSelect
                  value={startTime}
                  onChange={(value) => {
                    setStartTime(value);
                    saveScheduleChange(meetingDate, value, duration, durationUnit);
                  }}
                  options={TIME_OPTIONS}
                  searchPlaceholder="Search times…"
                />
              </AccountRow>
              <AccountRow label="End time">
                <span className="text-sm text-foreground/70">{computedEndTime}</span>
              </AccountRow>
            </dl>
          </div>
        </div>
      </MemoryOverviewSection>

      {description && (
        <MemoryOverviewSection title="Description">
          <p className="text-sm leading-relaxed text-foreground/80">{description}</p>
        </MemoryOverviewSection>
      )}

      <MemoryOverviewSection title="Attendees" variant="heading">
        <MeetingAttendeesEditor
          meetingId={meetingId}
          attendees={attendees}
          onAttendeesChange={(next) => {
            setAttendees(next);
            void saveMeetingField(
              "attendees",
              next.map((attendee) => ({ name: attendee.name, email: attendee.email })),
            );
          }}
        />
      </MemoryOverviewSection>

      <MemoryOverviewSection title="Agenda" variant="heading">
        <MeetingAgendaCard
          meetingId={meetingId}
          meetingType={meetingType}
          agenda={meeting.agenda}
        />
      </MemoryOverviewSection>

      <MemoryOverviewSection title="Decisions" variant="heading" id="meeting-decisions">
        <MeetingDecisionsCard meetingId={meetingId} decisions={decisions} variant="embedded" entities={entities} />
      </MemoryOverviewSection>

      <MemoryOverviewSection title="Action Items" variant="heading" id="meeting-actions">
        <MeetingActionItemsCard meetingId={meetingId} actionItems={actionItems} variant="embedded" entities={entities} />
      </MemoryOverviewSection>
    </div>
  );
}

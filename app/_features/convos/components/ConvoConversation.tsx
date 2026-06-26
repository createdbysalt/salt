import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Check,
  Clock,
  Send,
  ChevronDown,
  MoreHorizontal,
  Star,
  Phone,
  CalendarClock,
  SlidersHorizontal,
  ArrowLeft,
  Archive,
  Trash2,
  Mail,
  User,
} from "lucide-react";

import { toast } from "sonner";

import { cn } from "@repo/utils";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";
import {
  CHANNEL_META,
  formatDayLabel,
  formatTime,
  type Channel,
  type ConvoMessage,
  type ConvoThread,
} from "../data";
import { ChannelLogo } from "./ChannelLogo";

const ALL_CHANNELS: Channel[] = ["email", "slack", "whatsapp", "imessage", "linkedin"];

export function ConvoConversation({ thread }: { thread: ConvoThread }) {

  const [channelFilter, setChannelFilter] = useState<Channel | "all">("all");

  // Reset filter on thread switch
  useEffect(() => {
    setChannelFilter("all");
  }, [thread.personId]);

  const visible = useMemo(() => {
    return channelFilter === "all"
      ? thread.messages
      : thread.messages.filter((m) => m.channel === channelFilter);
  }, [thread.messages, channelFilter]);

  // Strictly chronological
  const ordered = useMemo(
    () => [...visible].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()),
    [visible],
  );
  const groups = groupByDay(ordered);

  // Only show channels the person actually uses
  const availableChannels = thread.person.channels;

  return (
    <section className="flex-1 min-w-0 h-full min-h-0 flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 h-[92px] px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-3 border-b border-border/60 bg-card/40">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/conversations"
            aria-label="Back to inbox"
            className="-ml-1 grid size-9 shrink-0 place-items-center rounded-full text-foreground transition hover:bg-muted lg:hidden"
          >
            <ArrowLeft className="size-5" strokeWidth={2} />
          </Link>
          <Link
            href={`/people/${thread.personId}`}
            className="-mx-1 flex min-w-0 items-center gap-2 rounded-xl px-1 transition hover:bg-muted/60"
          >
            <div className="size-9 rounded-full bg-foreground text-background grid place-items-center text-[11px] font-semibold shrink-0">
              {thread.person.initials}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-xl tracking-tight text-foreground truncate leading-tight">
                {thread.person.name}
              </h2>
              {thread.person.org && (
                <p className="hidden sm:block text-xs text-muted-foreground truncate mt-0.5">
                  {thread.person.role}
                  {thread.person.role && " · "}
                  {thread.person.org}
                </p>
              )}
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <div className="hidden lg:flex items-center gap-1">
            <IconBtn icon={Star} label="Star" onClick={() => toast("Starred")} />
            <IconBtn icon={Phone} label="Call" onClick={() => toast("Calling…")} />
          </div>
          <ChannelFilterButton
            availableChannels={availableChannels}
            messages={thread.messages}
            filter={channelFilter}
            setFilter={setChannelFilter}
          />
          <ThreadActionsMenu personId={thread.personId} personName={thread.person.name} />
        </div>

      </header>

      {/* Timeline */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
        {groups.length === 0 ? (
          <div className="h-full grid place-items-center text-xs text-muted-foreground">
            No messages on this channel yet.
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto">
            {groups.map((g) => (
              <div key={g.label} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border/60" />
                  <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                    {g.label}
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
                <div className="space-y-3">
                  {g.messages.map((m) => (
                    <MessageBubble key={m.id} message={m} authorInitials={thread.person.initials} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DraftCard thread={thread} key={thread.personId} />
    </section>
  );
}

function IconBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Star;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="size-8 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition"
    >
      <Icon className="size-4" strokeWidth={2} />
    </button>
  );
}

function ThreadActionsMenu({
  personId,
  personName,
  size = "md",
}: {
  personId: string;
  personName: string;
  size?: "sm" | "md";
}) {
  const btnClass =
    size === "sm"
      ? "size-7 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition"
      : "size-8 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" title="Thread options" className={btnClass}>
          <MoreHorizontal className={size === "sm" ? "size-3.5" : "size-4"} strokeWidth={2} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link href={`/people/${personId}`}>
            <User className="mr-2 size-3.5" strokeWidth={2} />
            View profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => toast("Marked as unread")}>
          <Mail className="size-3.5 mr-2" strokeWidth={2} />
          Mark as unread
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast(`Snoozed ${personName.split(" ")[0]} for 3 hours`)}>
          <Clock className="size-3.5 mr-2" strokeWidth={2} />
          Snooze 3 hours
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast("Thread archived")}>
          <Archive className="size-3.5 mr-2" strokeWidth={2} />
          Archive thread
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => toast("Thread deleted")}
        >
          <Trash2 className="size-3.5 mr-2" strokeWidth={2} />
          Delete thread
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ChannelFilterButton({
  availableChannels,
  messages,
  filter,
  setFilter,
}: {
  availableChannels: Channel[];
  messages: ConvoMessage[];
  filter: Channel | "all";
  setFilter: (c: Channel | "all") => void;
}) {
  const [open, setOpen] = useState(false);
  const active = filter !== "all";
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        title={active ? `Filtered: ${CHANNEL_META[filter as Channel].label}` : "Filter channels"}
        className={cn(
          "size-8 grid place-items-center rounded-full transition",
          active
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
        )}
      >
        <SlidersHorizontal className="size-4" strokeWidth={2} />
      </button>
      {open && (
        <>
          <button
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute z-20 right-0 mt-1 w-52 rounded-xl border border-border/60 bg-popover shadow-lg p-1.5">
            <div className="px-2.5 py-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
              Show channel
            </div>
            <FilterRow
              label="All channels"
              count={messages.length}
              active={filter === "all"}
              onClick={() => {
                setFilter("all");
                setOpen(false);
              }}
            />
            {ALL_CHANNELS.filter((c) => availableChannels.includes(c)).map((c) => {
              const meta = CHANNEL_META[c];
              const count = messages.filter((m) => m.channel === c).length;
              return (
                <FilterRow
                  key={c}
                  label={meta.label}
                  channel={c}
                  count={count}
                  active={filter === c}
                  onClick={() => {
                    setFilter(c);
                    setOpen(false);
                  }}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function FilterRow({
  label,
  channel,
  count,
  active,
  onClick,
}: {
  label: string;
  channel?: Channel;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg transition",
        active ? "bg-muted text-foreground" : "hover:bg-muted text-foreground/80",
      )}
    >
      {channel ? (
        <ChannelLogo channel={channel} className="size-3.5" />
      ) : (
        <SlidersHorizontal className="size-3.5 text-muted-foreground" strokeWidth={2} />
      )}
      <span className="font-medium">{label}</span>
      <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">{count}</span>
      {active && <Check className="size-3 ml-1" strokeWidth={2.5} />}
    </button>
  );
}

function MessageBubble({
  message,
  authorInitials,
}: {
  message: ConvoMessage;
  authorInitials: string;
}) {
  const out = message.direction === "out";
  const meta = CHANNEL_META[message.channel];
  return (
    <div className={cn("flex gap-2.5", out ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "size-7 rounded-full grid place-items-center text-[10px] font-semibold shrink-0",
          out ? "bg-foreground text-background" : "bg-muted text-foreground",
        )}
      >
        {out ? "You" : authorInitials}
      </div>
      <div className={cn("max-w-[78%] min-w-0 flex flex-col", out && "items-end")}>
        <div
          className={cn(
            "flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground tabular-nums",
            out && "flex-row-reverse",
          )}
        >
          <ChannelLogo channel={message.channel} className="size-3" />
          <span className="font-medium text-foreground/70">{meta.label}</span>
          <span>·</span>
          <span>{formatTime(message.at)}</span>
          {message.draftedBy === "salt" && (
            <span className="inline-flex items-center gap-0.5 text-flame">
              <Sparkles className="size-2.5" strokeWidth={2.5} />
              Salt
            </span>
          )}
        </div>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-snug",
            out
              ? "bg-foreground text-background rounded-tr-sm"
              : "bg-card border border-border/60 text-foreground rounded-tl-sm",
          )}
        >
          {message.body}
        </div>
      </div>
    </div>
  );
}

function DraftCard({ thread }: { thread: ConvoThread }) {
  const [body, setBody] = useState(thread.draft.body);
  const [channel, setChannel] = useState<Channel>(thread.draft.channel);
  const [sent, setSent] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null);
  const [channelOpen, setChannelOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setBody(thread.draft.body);
    setChannel(thread.draft.channel);
    setSent(false);
    setScheduledFor(null);
  }, [thread.personId, thread.draft.body, thread.draft.channel]);

  const channelMeta = CHANNEL_META[channel];

  const handleApprove = () => {
    setSent(true);
    setScheduledFor(null);
    toast.success(`Sent via ${channelMeta.label} to ${thread.person.name.split(" ")[0]}`, {
      icon: <Check className="size-4 text-emerald-500" />,
    });
  };

  const handleSchedule = (when: Date) => {
    setScheduledFor(when);
    toast.success(`Scheduled for ${formatSchedule(when)}`, {
      icon: <CalendarClock className="size-4 text-foreground" />,
    });
  };

  if (sent) {
    return (
      <div className="shrink-0 border-t border-border/60 bg-emerald-500/[0.06] px-3 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-3 max-w-3xl mx-auto">
          <div className="flex items-center gap-2.5 text-sm text-emerald-700 dark:text-emerald-400">
            <Check className="size-4" strokeWidth={2.5} />
            <span className="font-medium">Sent via {channelMeta.label}.</span>
          </div>
          <button
            onClick={() => setSent(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Undo
          </button>
        </div>
      </div>
    );
  }

  if (scheduledFor) {
    return (
      <div className="shrink-0 border-t border-border/60 bg-muted/40 px-3 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-3 max-w-3xl mx-auto">
          <div className="flex items-center gap-2.5 text-sm text-foreground">
            <CalendarClock className="size-4" strokeWidth={2} />
            <span>
              Scheduled to send via <span className="font-medium">{channelMeta.label}</span>{" "}
              <span className="text-muted-foreground">· {formatSchedule(scheduledFor)}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setScheduledFor(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Edit
            </button>
            <button
              onClick={() => {
                setScheduledFor(null);
                toast("Schedule canceled");
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-border/60 bg-background px-3 pb-4 pt-3 sm:px-6 lg:pb-5">
      <div className="max-w-3xl mx-auto rounded-2xl border border-border/60 bg-card focus-within:border-foreground/40 transition overflow-hidden">
        <textarea
          ref={taRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Write a message…"
          className="w-full px-4 pt-3 pb-2 text-sm leading-snug bg-transparent text-foreground resize-none focus:outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border/40">
          <div className="flex items-center gap-2 min-w-0">
            <ChannelPicker
              channel={channel}
              channels={thread.person.channels}
              onChange={setChannel}
              open={channelOpen}
              setOpen={setChannelOpen}
            />
            <ThreadActionsMenu personId={thread.personId} personName={thread.person.name} size="sm" />
          </div>
          <div className="inline-flex h-8 items-center rounded-full bg-foreground text-background overflow-hidden">
            <button
              onClick={handleApprove}
              className="inline-flex h-full items-center gap-1.5 pl-4 pr-3 text-sm font-semibold hover:opacity-90 transition"
            >
              Send
              <Send className="size-3.5" strokeWidth={2.5} />
            </button>
            <div className="w-px self-stretch shrink-0 bg-background/20" />
            <SchedulePicker onSchedule={handleSchedule} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SchedulePicker({ onSchedule }: { onSchedule: (when: Date) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const presets = useMemo(() => buildPresets(), [open]);

  const schedule = (when: Date) => {
    onSchedule(when);
    setOpen(false);
    setCustom("");
  };

  const scheduleCustom = () => {
    const d = new Date(custom);
    if (!isNaN(d.getTime()) && d.getTime() > Date.now()) schedule(d);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Schedule send"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center hover:bg-background/10 transition outline-none"
        >
          <ChevronDown className="size-3.5" strokeWidth={2.5} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        sideOffset={10}
        className="w-[min(20rem,calc(100vw-1.5rem))] p-0 overflow-hidden"
      >
        <div className="flex items-start gap-2.5 px-3 py-3 border-b border-border/60 bg-muted/30">
          <div className="size-8 rounded-full bg-card border border-border/60 grid place-items-center shrink-0">
            <CalendarClock className="size-4 text-foreground" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">Schedule send</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              Send later at a time that works for them
            </p>
          </div>
        </div>
        <div className="p-1.5">
          {presets.map((p) => (
            <DropdownMenuItem
              key={p.label}
              onClick={() => schedule(p.date)}
              className="flex items-center justify-between gap-3 cursor-pointer py-2"
            >
              <span className="font-medium">{p.label}</span>
              <span className="text-muted-foreground tabular-nums text-xs shrink-0">
                {formatSchedule(p.date)}
              </span>
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="px-3 py-3" onPointerDown={(e) => e.preventDefault()}>
          <label
            htmlFor="schedule-custom"
            className="block text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold mb-2"
          >
            Custom time
          </label>
          <div className="flex items-center gap-2">
            <input
              id="schedule-custom"
              type="datetime-local"
              value={custom}
              min={toLocalInput(new Date())}
              onChange={(e) => setCustom(e.target.value)}
              className="flex-1 min-w-0 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-foreground/40"
            />
            <button
              type="button"
              disabled={!custom}
              onClick={scheduleCustom}
              className="shrink-0 rounded-lg bg-foreground text-background px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:opacity-90 transition"
            >
              Schedule
            </button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function buildPresets() {
  const now = new Date();
  const inHours = (h: number) => new Date(now.getTime() + h * 3600_000);
  const nextWeekday = (targetHour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    d.setHours(targetHour, 0, 0, 0);
    return d;
  };
  const monday9 = () => {
    const d = new Date(now);
    const day = d.getDay();
    const add = day === 0 ? 1 : (8 - day) % 7 || 7;
    d.setDate(d.getDate() + add);
    d.setHours(9, 0, 0, 0);
    return d;
  };
  return [
    { label: "In 1 hour", date: inHours(1) },
    { label: "In 3 hours", date: inHours(3) },
    { label: "Tomorrow morning", date: nextWeekday(9) },
    { label: "Monday 9:00 AM", date: monday9() },
  ];
}

function formatSchedule(d: Date) {
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} ${time}`;
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ChannelPicker({
  channel,
  channels,
  onChange,
  open,
  setOpen,
}: {
  channel: Channel;
  channels: Channel[];
  onChange: (c: Channel) => void;
  open: boolean;
  setOpen: (b: boolean) => void;
}) {
  const meta = CHANNEL_META[channel];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2 py-1 text-[11px] font-medium text-foreground/80 hover:bg-muted transition"
      >
        <ChannelLogo channel={channel} className="size-3.5" />
        {meta.label}
        <ChevronDown className="size-2.5" strokeWidth={2.5} />
      </button>
      {open && (
        <>
          <button
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute z-20 left-0 mt-1 w-44 rounded-xl border border-border/60 bg-popover shadow-lg p-1">
            {channels.map((c) => {
              const m = CHANNEL_META[c];
              return (
                <button
                  key={c}
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition",
                    c === channel ? "bg-muted text-foreground" : "hover:bg-muted text-foreground/80",
                  )}
                >
                  <ChannelLogo channel={c} className="size-3.5" />
                  {m.label}
                  {c === channel && <Check className="size-3 ml-auto" strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function groupByDay(messages: ConvoMessage[]) {
  const map = new Map<string, ConvoMessage[]>();
  for (const m of messages) {
    const key = formatDayLabel(m.at);
    const arr = map.get(key) ?? [];
    arr.push(m);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([label, messages]) => ({ label, messages }));
}

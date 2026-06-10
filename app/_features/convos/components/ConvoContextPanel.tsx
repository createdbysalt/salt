import Link from "next/link";
import { Briefcase, File as FileIcon, Users, ExternalLink, Shield } from "lucide-react";
import { findPerson } from "@/app/_lib/demo/people-demo-data";
import { findWork } from "@/app/_features/work/data";
import { cn } from "@repo/utils";
import { CHANNEL_META, relativeShort, type ConvoThread } from "../data";

const AUTONOMY_LABEL: Record<NonNullable<ConvoThread["person"]["autonomy"]>, string> = {
  ask_first: "Ask first",
  draft_then_send: "Draft, then approve",
  fully_autonomous: "Fully autonomous",
};

export function ConvoContextPanel({ thread }: { thread: ConvoThread }) {
  const person = findPerson(thread.personId);
  const works = thread.relatedWorkIds.map((id) => findWork(id)).filter(Boolean);

  return (
    <aside className="w-[300px] shrink-0 h-full min-h-0 overflow-y-auto space-y-3">
      {/* Person card */}
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-foreground text-background grid place-items-center text-sm font-semibold">
            {thread.person.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{thread.person.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {thread.person.role}
              {thread.person.org && ` · ${thread.person.org}`}
            </p>
          </div>
        </div>
        {person && (
          <Link
            href={`/people/${person.id}`}
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-foreground/70 hover:text-foreground"
          >
            View full profile <ExternalLink className="size-3" strokeWidth={2} />
          </Link>
        )}
      </div>

      {/* Channels */}
      <Section icon={Users} label="Channels">
        <ul className="space-y-1.5">
          {thread.person.channels.map((c) => {
            const meta = CHANNEL_META[c];
            const isPreferred = c === thread.person.preferredChannel;
            const lastOnChannel = [...thread.messages]
              .reverse()
              .find((m) => m.channel === c);
            return (
              <li
                key={c}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className={cn("size-1.5 rounded-full", meta.dotClass)} />
                  <span className="text-foreground/90 truncate">{meta.label}</span>
                  {isPreferred && (
                    <span className="text-[9px] uppercase tracking-wider text-flame font-semibold shrink-0">
                      preferred
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                  {lastOnChannel ? relativeShort(lastOnChannel.at) : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Autonomy */}
      {thread.person.autonomy && (
        <Section icon={Shield} label="Autonomy">
          <p className="text-xs text-foreground/85">{AUTONOMY_LABEL[thread.person.autonomy]}</p>
          <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
            {thread.person.autonomy === "fully_autonomous"
              ? "Salt can send directly — you'll see it in Capture."
              : thread.person.autonomy === "draft_then_send"
                ? "Salt drafts, you approve and send."
                : "Salt pauses before any outbound move."}
          </p>
        </Section>
      )}

      {/* Related work */}
      {works.length > 0 && (
        <Section icon={Briefcase} label="Related work">
          <ul className="space-y-1.5">
            {works.map((w) => (
              <li key={w!.id}>
                <Link
                  href="/work"
                  className="-mx-2 block rounded-lg px-2 py-1.5 transition hover:bg-muted"
                >
                  <p className="text-xs font-medium text-foreground truncate">{w!.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {w!.status} · {w!.progress}%
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Files in thread */}
      {thread.fileIds.length > 0 && (
        <Section icon={FileIcon} label="Files in thread">
          <ul className="space-y-1">
            {thread.fileIds.map((f) => {
              const meta = CHANNEL_META[f.from];
              return (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 -mx-2 rounded-lg hover:bg-muted transition cursor-pointer"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <FileIcon className="size-3 text-muted-foreground shrink-0" strokeWidth={2} />
                    <span className="text-foreground/85 truncate">{f.name}</span>
                  </span>
                  <span className={cn("size-1.5 rounded-full shrink-0", meta.dotClass)} title={meta.label} />
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </aside>
  );
}

function Section({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Briefcase;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Icon className="size-3 text-muted-foreground" strokeWidth={2} />
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          {label}
        </p>
      </div>
      {children}
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Brain,
  Building,
  Calendar,
  File,
  Lightbulb,
  Loader2,
  PlugZap,
  Receipt,
  RefreshCw,
  Timer,
  TrendingDown,
  TrendingUp,
  User,
  Video,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { connectGoogleCalendar } from "@/app/_features/connectors/actions/calendar/connect";
import { connectComposioProvider } from "@/app/_features/connectors/actions/composio-connect";
import { connectGoogle } from "@/app/_features/connectors/actions/gmail/connect";
import { ConnectorIcon } from "@/app/_features/connectors/components/connector-icons";
import { connectorsPageUrl } from "@/app/_features/connectors/constants";
import type { ConnectorCatalogId } from "@/app/_features/connectors/types";
import {
  connectorHealthImpactCopy,
  shouldShowConnectorHealth,
} from "@/app/_features/hq/connector-health";
import type { HqConnectorHealthItem, HqCreatedTodayItem, HqSideRailData } from "@/app/_features/hq/types";

type Props = {
  data: HqSideRailData;
};

const ENTITY_ICONS: Record<HqCreatedTodayItem["entityType"], React.ElementType> = {
  person: User,
  organization: Building,
  work: Briefcase,
  billing: Receipt,
  file: File,
  meeting: Video,
};

const ENTITY_LABELS: Record<HqCreatedTodayItem["entityType"], string> = {
  person: "Contact",
  organization: "Organization",
  work: "Project",
  billing: "Invoice",
  file: "File",
  meeting: "Meeting",
};

export function SideRail({ data }: Props) {
  const { timeSaved, schedule, headsUp, createdToday, scheduleContext, connectorHealth } = data;
  const reconnectItems = connectorHealth.items;
  const showConnectorHealth = shouldShowConnectorHealth(reconnectItems.length);
  const [connectingId, setConnectingId] = React.useState<string | null>(null);

  const handleReconnect = async (item: HqConnectorHealthItem) => {
    if (connectingId) return;
    setConnectingId(item.catalogId);
    const returnUrl = connectorsPageUrl({ connector: item.catalogId });
    try {
      const result =
        item.catalogId === "google" || item.provider === "gmail"
          ? await connectGoogle({ returnUrl })
          : item.catalogId === "google-calendar" ||
              item.provider === "googlecalendar"
            ? await connectGoogleCalendar({ returnUrl })
            : await connectComposioProvider(item.provider, { returnUrl });
      if (!result.success) {
        toast.error(result.error || `Failed to reconnect ${item.name}`);
        setConnectingId(null);
        return;
      }
      // Same-tab OAuth — leave the spinner until navigation unloads the page.
      window.location.href = result.url;
    } catch (error) {
      console.error("[hq] connector reconnect failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to reconnect ${item.name}`,
      );
      setConnectingId(null);
    }
  };

  return (
    <aside className="space-y-3">
      <div
        className="glass-card animate-rise relative overflow-hidden rounded-3xl p-5"
        style={{ animationDelay: "200ms" }}
      >
        <header className="flex items-center gap-2">
          <Timer className="size-[18px]" strokeWidth={1.75} />
          <h3 className="font-semibold tracking-tight">Time saved</h3>
        </header>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-5xl tracking-tight">{timeSaved.valueLabel}</span>
          <span className="text-sm text-muted-foreground">back this week</span>
        </div>
        <div className="mt-4 flex h-8 gap-1">
          {timeSaved.weeklyActivity.map((height, index) => (
            <div
              key={index}
              className="surface-aurora flex-1 rounded-md"
              style={{
                opacity: 0.4 + height * 0.6,
                height: `${height * 100}%`,
                alignSelf: "flex-end",
              }}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
          {timeSaved.weekOverWeekPct === null ? (
            <span>
              {timeSaved.hasActivity
                ? "Time saved by plays this week"
                : "Approve plays to get time back"}
            </span>
          ) : timeSaved.weekOverWeekPct >= 0 ? (
            <>
              <TrendingUp className="size-3 text-flame" /> +{timeSaved.weekOverWeekPct}% vs last week
            </>
          ) : (
            <>
              <TrendingDown className="size-3 text-muted-foreground" /> {timeSaved.weekOverWeekPct}% vs last week
            </>
          )}
        </div>
      </div>

      <div
        className="glass-card animate-rise rounded-3xl p-5"
        style={{ animationDelay: "280ms" }}
      >
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="size-[18px]" strokeWidth={1.75} />
            <h3 className="font-semibold tracking-tight">Today&apos;s schedule</h3>
          </div>
          <span className="chip">{schedule.length}</span>
        </header>
        <ul className="space-y-1">
          {schedule.length === 0 ? (
            <li className="px-2 py-3 text-sm text-muted-foreground">
              {scheduleContext.hasCalendarConnected ? (
                <>
                  No meetings on your calendar today.{" "}
                  <Link href="/meetings" className="font-medium text-foreground hover:underline">
                    View all meetings
                  </Link>
                </>
              ) : (
                <>
                  Connect calendar to sync today&apos;s meetings.{" "}
                  <Link
                    href="?settings=connectors"
                    className="font-medium text-foreground hover:underline"
                  >
                    Connect Google Calendar
                  </Link>
                </>
              )}
            </li>
          ) : null}
          {schedule.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group relative -mx-2 flex gap-4 rounded-xl px-2 py-2.5 transition hover:bg-muted/60"
              >
                <div className="w-12 shrink-0 pt-0.5">
                  <p className="text-sm font-semibold tabular-nums">{item.time}</p>
                  <p className="text-[10px] text-muted-foreground">{item.dur}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium leading-tight">{item.title}</p>
                    {item.hot ? (
                      <span className="size-1.5 animate-pulse-glow rounded-full bg-flame" />
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{item.who}</p>
                </div>
                <ArrowUpRight className="size-3.5 shrink-0 self-center text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div
        className="glass-card animate-rise rounded-3xl p-5"
        style={{ animationDelay: "360ms" }}
      >
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-[18px]" strokeWidth={1.75} />
            <h3 className="font-semibold tracking-tight">Heads up</h3>
          </div>
          <span className="chip">{headsUp.length}</span>
        </header>
        <ul className="space-y-3">
          {headsUp.length === 0 ? (
            <li className="text-sm text-muted-foreground">
              Salt will flag what needs attention here.
            </li>
          ) : null}
          {headsUp.map((item, index) => (
            <li key={item.title} className="group flex cursor-pointer gap-3">
              <div className="surface-aurora mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg">
                <span className="relative z-10 text-[10px] font-bold tabular-nums text-white">
                  {index + 1}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                {item.href ? (
                  <Link href={item.href} className="block">
                    <p className="text-sm font-medium leading-snug group-hover:text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{item.sub}</p>
                  </Link>
                ) : (
                  <>
                    <p className="text-sm font-medium leading-snug group-hover:text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{item.sub}</p>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {createdToday.items.length > 0 ? (
        <div
          className="glass-card animate-rise rounded-3xl p-5"
          style={{ animationDelay: "440ms" }}
        >
          <header className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="size-[18px]" strokeWidth={1.75} />
              <h3 className="font-semibold tracking-tight">Created today</h3>
            </div>
            <span className="chip">{createdToday.items.length}</span>
          </header>
          <ul className="space-y-2">
            {createdToday.items.map((item) => {
              const Icon = ENTITY_ICONS[item.entityType];
              const typeLabel = ENTITY_LABELS[item.entityType];
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5 transition hover:bg-muted/60"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold leading-5">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {typeLabel} · {item.signalCount} signal{item.signalCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href="/memory?tab=activity"
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-foreground hover:underline"
          >
            View all in Memory
            <ArrowUpRight className="size-3" />
          </Link>
        </div>
      ) : null}

      {showConnectorHealth ? (
        <div
          className="glass-card animate-rise rounded-3xl p-5"
          style={{ animationDelay: "520ms" }}
        >
          <header className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlugZap className="size-[18px]" strokeWidth={1.75} />
              <h3 className="font-semibold tracking-tight">Connector health</h3>
            </div>
            <span className="chip">{reconnectItems.length}</span>
          </header>
          <p className="mb-4 text-[11px] text-muted-foreground">
            {connectorHealthImpactCopy(reconnectItems.length)}
          </p>
          <ul className="space-y-2">
            {reconnectItems.map((item) => {
              const isConnecting = connectingId === item.catalogId;
              return (
                <li key={item.catalogId}>
                  <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background">
                      <ConnectorIcon
                        id={item.catalogId as ConnectorCatalogId}
                        size={18}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold leading-5">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Needs reconnect</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleReconnect(item)}
                      disabled={connectingId !== null}
                      aria-label={`Reconnect ${item.name}`}
                      className="surface-aurora relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg text-white transition hover:opacity-90 disabled:opacity-60"
                    >
                      <span className="relative z-10">
                        {isConnecting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="size-3.5" />
                        )}
                      </span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <Link
            href={connectorsPageUrl()}
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-foreground hover:underline"
          >
            View all connectors
            <ArrowUpRight className="size-3" />
          </Link>
        </div>
      ) : null}
    </aside>
  );
}

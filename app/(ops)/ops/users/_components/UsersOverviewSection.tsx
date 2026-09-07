import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import {
  Badge,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import type { UsersOverviewData } from "@/app/_features/admin/queries";
import { percentChange } from "@/app/_features/admin/queries";
import { SectionError } from "../../_components/Section";
import { TrialSignupChart } from "./TrialSignupChart";
import { UsersFunnelChart } from "./UsersFunnelChart";
import { PlanMixChart } from "./PlanMixChart";

const EVENT_LABEL: Record<UsersOverviewData["recent"][number]["kind"], string> = {
  signed_up: "Signed up",
  canceling: "Canceling",
  canceled: "Canceled",
};

/**
 * Users Overview — trial-first pulse. Qualification charts stay on
 * Prospects; the account table stays on People.
 */
export function UsersOverviewSection({
  data,
}: {
  data: UsersOverviewData | null;
}) {
  if (data === null) {
    return (
      <Card>
        <CardContent className="py-6">
          <SectionError section="users" />
        </CardContent>
      </Card>
    );
  }

  const trialTrend = percentChange(data.trialsStarted7d, data.trialsStartedPrev7d);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-3 dark:*:data-[slot=card]:bg-card">
        <KpiCard
          label="Trials started · 7d"
          value={data.trialsStarted7d}
          line1={
            trialTrend === null
              ? "First week on record"
              : trialTrend >= 0
                ? "Up vs last week"
                : "Down vs last week"
          }
          line2={`vs ${data.trialsStartedPrev7d.toLocaleString()} the prior week`}
          trend={trialTrend}
        />
        <KpiCard
          label="Trials started · 30d"
          value={data.trialsStarted30d}
          line1="New accounts this month"
          line2={data.truncated ? "scan capped" : "Profiles created"}
        />
        <KpiCard
          label="Trials active"
          value={data.trialsActive}
          line1="Currently on trial"
          line2="status = trial"
        />
        <KpiCard
          label="Trial → paid"
          value={
            data.trialToPaidPercent === null
              ? "—"
              : `${data.trialToPaidPercent.toFixed(0)}%`
          }
          line1={`${data.paidAccounts.toLocaleString()} paid accounts`}
          line2="Of the live trial + paid funnel"
        />
        <KpiCard
          label="Canceling + canceled · 30d"
          value={data.churning30d}
          line1="Scheduled or already gone"
          line2="People tab for the list"
          alert={data.churning30d > 0}
        />
        <KpiCard
          label="Usage risk"
          value={data.usageRisk}
          line1="At or over 80% of bundle"
          line2="Plays used this period"
          alert={data.usageRisk > 0}
        />
      </div>

      {data.waitlistLeftover > 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          {data.waitlistLeftover.toLocaleString()} still on the waitlist — leftover
          inbound, not the trial funnel. See Prospects.
        </p>
      )}

      <TrialSignupChart data={data.series} />

      <div className="grid gap-4 @3xl/main:grid-cols-2">
        <UsersFunnelChart funnel={data.funnel} />
        <PlanMixChart rows={data.planMix} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Just happened</CardTitle>
          <CardDescription>Newest signups and cancels</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing recent.</p>
          ) : (
            <ul className="space-y-2">
              {data.recent.map((event) => (
                <li
                  key={`${event.kind}-${event.at}-${event.label}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Badge
                      variant={
                        event.kind === "signed_up" ? "outline" : "destructive"
                      }
                    >
                      {EVENT_LABEL[event.kind]}
                    </Badge>
                    <span className="truncate">{event.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatWhen(event.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  line1,
  line2,
  trend,
  alert,
}: {
  label: string;
  value: number | string;
  line1: string;
  line2: string;
  trend?: number | null;
  alert?: boolean;
}) {
  const TrendIcon =
    trend != null && trend >= 0 ? IconTrendingUp : IconTrendingDown;
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {typeof value === "number" ? value.toLocaleString() : value}
        </CardTitle>
        {trend != null && (
          <CardAction>
            <Badge variant={alert ? "destructive" : "outline"}>
              <TrendIcon />
              {trend >= 0 ? "+" : ""}
              {trend.toFixed(1)}%
            </Badge>
          </CardAction>
        )}
        {alert && trend == null && (
          <CardAction>
            <Badge variant="destructive">Needs a look</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 font-medium">{line1}</div>
        <div className="text-muted-foreground">{line2}</div>
      </CardFooter>
    </Card>
  );
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

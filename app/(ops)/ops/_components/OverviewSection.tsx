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
import type { AdminOverviewData } from "@/app/_features/admin/queries";
import { SectionError } from "./Section";

/**
 * Platform KPIs in the dashboard-01 section-cards pattern: gradient stat
 * cards, CardAction badge, two-line footer. Live counts from source —
 * nothing stored, nothing drifts.
 */
export function OverviewSection({ data }: { data: AdminOverviewData | null }) {
  if (data === null) {
    return (
      <Card>
        <CardContent className="py-6">
          <SectionError section="the overview" />
        </CardContent>
      </Card>
    );
  }

  const signupTrend =
    data.signupsPrev7d > 0
      ? ((data.signups7d - data.signupsPrev7d) / data.signupsPrev7d) * 100
      : null;
  const trendUp = signupTrend !== null && signupTrend >= 0;
  const TrendIcon = trendUp ? IconTrendingUp : IconTrendingDown;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-5 dark:*:data-[slot=card]:bg-card">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Users</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {data.totalUsers.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 font-medium">Total profiles</div>
            <div className="text-muted-foreground">Live count from source</div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Workspaces</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {data.totalWorkspaces.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 font-medium">Active tenants</div>
            <div className="text-muted-foreground">
              Tier mix below
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Signups · 7d</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {data.signups7d.toLocaleString()}
            </CardTitle>
            {signupTrend !== null && (
              <CardAction>
                <Badge variant="outline">
                  <TrendIcon />
                  {trendUp ? "+" : ""}
                  {signupTrend.toFixed(1)}%
                </Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {signupTrend === null
                ? "First week on record"
                : trendUp
                  ? "Trending up this week"
                  : "Down this week"}{" "}
              {signupTrend !== null && <TrendIcon className="size-4" />}
            </div>
            <div className="text-muted-foreground">
              vs {data.signupsPrev7d.toLocaleString()} the prior week
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Signups · 30d</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {data.signups30d.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 font-medium">Monthly acquisition</div>
            <div className="text-muted-foreground">
              Daily breakdown in the chart below
            </div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Waitlist</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {data.waitlistTotal.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 font-medium">
              +{data.waitlist7d.toLocaleString()} this week
            </div>
            <div className="text-muted-foreground">
              Leads awaiting invite
            </div>
          </CardFooter>
        </Card>
      </div>

      {data.tiers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">
            Workspaces by tier
          </span>
          {data.tiers.map((tier) => (
            <Badge key={tier.key} variant="secondary" className="font-mono">
              {tier.key} · {tier.count}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import {
  Badge,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import { ArrowRight } from "lucide-react";
import type { ComposioHealthData } from "@/app/_features/admin/queries";
import type { ReviewQueueData } from "@/app/_features/connectors/admin/queries";

/**
 * Connectors overview — bento grid in the HQ stat-card pattern. KPI row up
 * top, provider rollup + triage card below. Detail lives in the sibling
 * tabs: Review queue for verdicts, Health for the canary.
 */
export function ConnectorsOverviewSection({
  health,
  review,
}: {
  health: ComposioHealthData | null;
  review: ReviewQueueData | null;
}) {
  if (health === null && review === null) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Couldn’t load the connectors overview. Check the server logs for the
          failing query.
        </CardContent>
      </Card>
    );
  }

  const activeConnections =
    health?.integrations.reduce((sum, row) => sum + row.active, 0) ?? 0;
  const providers = health
    ? new Set(health.integrations.map((row) => row.provider)).size
    : 0;
  const failing = health?.canary.filter((row) => row.status === "failed") ?? [];
  const pending = review?.tools.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-3 @5xl/main:grid-cols-5 dark:*:data-[slot=card]:bg-card">
        <StatCard
          label="Connected accounts"
          value={activeConnections.toLocaleString()}
          line1="Across all workspaces"
          line2="Active Composio connections"
        />
        <StatCard
          label="Providers in use"
          value={providers.toLocaleString()}
          line1="Distinct toolkits"
          line2="Gmail, Slack, Notion, …"
        />
        <StatCard
          label="Tools approved"
          value={(review?.approvedCount ?? 0).toLocaleString()}
          line1="Executable at the gate"
          line2="Under the trust ladder"
        />
        <StatCard
          label="Pending review"
          value={pending.toLocaleString()}
          line1="Unusable until your verdict"
          line2="See the Review queue tab"
          badge={
            pending > 0
              ? { label: "Needs verdicts", alert: true }
              : { label: "Queue clear", alert: false }
          }
        />
        <StatCard
          label="Canary failing"
          value={failing.length.toLocaleString()}
          line1={failing.length > 0 ? "Dead slugs detected" : "All slugs healthy"}
          line2="Detail in the Health tab"
          badge={
            failing.length > 0
              ? { label: "Action needed", alert: true }
              : { label: "Healthy", alert: false }
          }
        />
      </div>

      <div className="grid gap-4 @3xl/main:grid-cols-3">
        <Card className="@3xl/main:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Connections by provider</CardTitle>
            <CardDescription>
              Workspace integrations for supported connectors
              {health?.integrationsTruncated ? " (capped)" : ""}
            </CardDescription>
            {/* Source facet: every row is Composio-backed today; native
                connectors join this table with their own badge. */}
            <CardAction>
              <Badge variant="outline">Composio</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            {!health || health.integrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No workspace integrations yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Active</TableHead>
                    <TableHead className="text-right">Inactive</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {health.integrations.map((row) => (
                    <TableRow key={row.provider}>
                      <TableCell className="font-mono text-xs">
                        {row.provider}
                      </TableCell>
                      <TableCell>
                        {row.problems.length === 0 ? (
                          <span className="text-muted-foreground">ok</span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {row.problems.map((problem) => (
                              <Badge key={problem.key} variant="destructive">
                                {problem.key}
                                {problem.count > 1 ? ` ×${problem.count}` : ""}
                              </Badge>
                            ))}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.active}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.inactive}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Needs attention</CardTitle>
            <CardDescription>What to triage first</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {failing.length === 0 && pending === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing right now — the canary is green and the review queue is
                empty.
              </p>
            ) : (
              <>
                {failing.length > 0 && (
                  <div className="space-y-2">
                    <Link
                      href="/ops/connectors/health?canary=failed"
                      className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
                    >
                      {failing.length} dead{" "}
                      {failing.length === 1 ? "slug" : "slugs"}
                      <ArrowRight className="size-3.5" />
                    </Link>
                    <ul className="space-y-1.5">
                      {failing.slice(0, 5).map((row) => (
                        <li
                          key={row.slug}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="truncate font-mono text-xs text-muted-foreground">
                            {row.slug}
                          </span>
                          <Badge variant="destructive">
                            {row.errorCode ?? "failed"}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {pending > 0 && (
                  <Link
                    href="/ops/connectors/review"
                    className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
                  >
                    {pending} {pending === 1 ? "tool" : "tools"} awaiting a
                    verdict
                    <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  line1,
  line2,
  badge,
}: {
  label: string;
  value: string;
  line1: string;
  line2: string;
  badge?: { label: string; alert: boolean };
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        {badge && (
          <CardAction>
            {badge.alert ? (
              <Badge variant="destructive">{badge.label}</Badge>
            ) : (
              <Badge variant="outline">{badge.label}</Badge>
            )}
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

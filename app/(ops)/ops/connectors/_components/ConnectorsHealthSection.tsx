import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import { ExternalLink } from "lucide-react";
import type { ComposioHealthData } from "@/app/_features/admin/queries";
import { formatCheckedAt } from "../../_components/Section";

const COMPOSIO_DASHBOARD_URL = "https://platform.composio.dev";

/**
 * Connector health detail as bento cards: the slug canary (the
 * Outlook-break detector) and webhook ingress outcomes. Filterable via
 * ?canary=failed so a triage view is a shareable link.
 */
export function ConnectorsHealthSection({
  data,
  canaryFilter,
}: {
  data: ComposioHealthData | null;
  canaryFilter: string | undefined;
}) {
  if (data === null) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Couldn’t load connector health. Check the server logs for the
          failing query.
        </CardContent>
      </Card>
    );
  }

  const showFailedOnly = canaryFilter === "failed";
  const canaryRows = showFailedOnly
    ? data.canary.filter((row) => row.status === "failed")
    : data.canary;
  const failingCount = data.canary.filter(
    (row) => row.status === "failed",
  ).length;

  return (
    <div className="grid gap-4 @3xl/main:grid-cols-3">
      <Card className="@3xl/main:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Slug canary</CardTitle>
          <CardDescription>
            Hourly metadata probe of the tool slugs Salt executes
            {failingCount > 0 ? (
              <>
                {" "}
                ·{" "}
                <span className="text-destructive">
                  {failingCount} failing
                </span>
              </>
            ) : (
              " · all healthy"
            )}
          </CardDescription>
          <CardAction>
            <div className="flex items-center gap-3">
              <div className="flex gap-2 text-xs">
                <FilterLink
                  href="/ops/connectors/health"
                  active={!showFailedOnly}
                  label="All"
                />
                <FilterLink
                  href="/ops/connectors/health?canary=failed"
                  active={showFailedOnly}
                  label="Failing only"
                />
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={COMPOSIO_DASHBOARD_URL} target="_blank" rel="noreferrer">
                  Composio
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          {canaryRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {showFailedOnly
                ? "No failing slugs. Clear the filter to see all probes."
                : "No canary results yet — the hourly cron writes the first rows."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slug</TableHead>
                  <TableHead>Toolkit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Latency</TableHead>
                  <TableHead className="text-right">Last checked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {canaryRows.map((row) => (
                  <TableRow key={row.slug}>
                    <TableCell className="font-mono text-xs">{row.slug}</TableCell>
                    <TableCell>{row.toolkit}</TableCell>
                    <TableCell>
                      {row.status === "ok" ? (
                        <Badge
                          variant="outline"
                          className="border-green-500/50 bg-green-500/10 text-green-600"
                        >
                          ok
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          {row.errorCode ?? "failed"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.latencyMs === null ? "—" : `${row.latencyMs}ms`}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCheckedAt(row.checkedAt)}
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
          <CardTitle className="text-base">Webhook outcomes · 24h</CardTitle>
          <CardDescription>
            Dropped or failed ingress deliveries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.webhookOutcomes24h.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No dropped or failed webhook deliveries in the last 24 hours.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.webhookOutcomes24h.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-mono text-xs">{row.key}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={
        active
          ? "font-medium text-foreground underline underline-offset-4"
          : "text-muted-foreground hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}

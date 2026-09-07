import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import { ExternalLink } from "lucide-react";
import type { SpendData } from "@/app/_features/admin/queries";
import { formatMicros, Kpi, Section, SectionError } from "./Section";

/** Month-to-date vendor COGS from the usage ledger, with Stripe deep links. */
export function SpendSection({ data }: { data: SpendData | null }) {
  return (
    <Section
      title="Spend"
      description="Month-to-date vendor cost summed from the usage ledger. Top workspaces link straight to Stripe."
    >
      {data === null ? (
        <SectionError section="spend" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              label="MTD vendor cost"
              value={formatMicros(data.mtdMicros)}
              hint={data.truncated ? "scan capped — under-reported" : undefined}
            />
          </div>
          {data.topWorkspaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No metered usage this month.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">MTD cost</TableHead>
                  <TableHead className="text-right">Stripe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topWorkspaces.map((row) => (
                  <TableRow key={row.workspaceId}>
                    <TableCell>
                      {row.name ?? (
                        <span className="font-mono text-xs text-muted-foreground">
                          {row.workspaceId}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.tier ? (
                        <Badge variant="secondary" className="font-mono">
                          {row.tier}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMicros(row.micros)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.stripeCustomerId ? (
                        <a
                          href={`https://dashboard.stripe.com/customers/${row.stripeCustomerId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                          Customer
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </Section>
  );
}

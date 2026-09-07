"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import { cn } from "@repo/utils";
import type {
  AccountStatus,
  PeopleDirectoryData,
} from "@/app/_features/admin/queries";
import { SectionError } from "../../_components/Section";

const STATUS_LABEL: Record<AccountStatus, string> = {
  trial: "Trial",
  paid: "Paid",
  canceling: "Canceling",
  canceled: "Canceled",
  past_due: "Past due",
};

/**
 * Account directory — plan, status, usage. Usage is batched from the
 * ledger; this is not the Spend page.
 */
export function PeopleDirectory({
  data,
}: {
  data: PeopleDirectoryData | null;
}) {
  const [query, setQuery] = React.useState("");
  const [plan, setPlan] = React.useState("all");
  const [status, setStatus] = React.useState("all");

  if (data === null) {
    return (
      <Card>
        <CardContent className="py-6">
          <SectionError section="people" />
        </CardContent>
      </Card>
    );
  }

  const plans = [
    ...new Set(
      data.people
        .map((person) => person.plan)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();

  const filtered = data.people.filter((person) => {
    if (plan !== "all" && person.plan !== plan) return false;
    if (status !== "all" && person.status !== status) return false;
    if (query) {
      const haystack = `${person.name} ${person.email ?? ""}`.toLowerCase();
      if (!haystack.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>People</CardTitle>
        <CardDescription>
          {data.people.length.toLocaleString()} accounts
          {data.truncated ? " · scan capped" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or email"
            className="max-w-xs"
          />
          <Select value={plan} onValueChange={setPlan}>
            <SelectTrigger className="w-36" size="sm" aria-label="Plan">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              {plans.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40" size="sm" aria-label="Status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(STATUS_LABEL) as AccountStatus[]).map((item) => (
                <SelectItem key={item} value={item}>
                  {STATUS_LABEL[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Canceled</TableHead>
              <TableHead className="text-right">Stripe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  No people match.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((person) => {
                const ratio =
                  person.playsIncluded > 0
                    ? person.playsUsed / person.playsIncluded
                    : 0;
                const atRisk = ratio >= 0.8;
                return (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {person.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      {person.plan ? (
                        <Badge variant="secondary" className="font-mono">
                          {person.plan}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          person.status === "canceled" ||
                          person.status === "canceling" ||
                          person.status === "past_due"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {STATUS_LABEL[person.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span
                          className={cn(
                            "tabular-nums",
                            atRisk && "text-destructive",
                          )}
                        >
                          {person.playsUsed} / {person.playsIncluded}
                        </span>
                        <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              atRisk ? "bg-destructive" : "bg-foreground/60",
                            )}
                            style={{
                              width: `${Math.min(100, ratio * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatDay(person.joined)}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {person.canceledAt ? formatDay(person.canceledAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {person.stripeCustomerId ? (
                        <a
                          href={`https://dashboard.stripe.com/customers/${person.stripeCustomerId}`}
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
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

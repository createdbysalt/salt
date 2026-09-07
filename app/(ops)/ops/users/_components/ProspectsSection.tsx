"use client";

import * as React from "react";
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
import type { ProspectsData } from "@/app/_features/admin/queries";
import { SectionError } from "../../_components/Section";
import { QualificationBarChart } from "./QualificationBarChart";
import { PlanMixChart } from "./PlanMixChart";

/**
 * Pre-account pile. Qualification mix is this waitlist cohort only —
 * trial signups do not collect these answers.
 */
export function ProspectsSection({ data }: { data: ProspectsData | null }) {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [business, setBusiness] = React.useState("all");

  if (data === null) {
    return (
      <Card>
        <CardContent className="py-6">
          <SectionError section="prospects" />
        </CardContent>
      </Card>
    );
  }

  const businesses = [
    ...new Set(
      data.leads
        .map((lead) => lead.business)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();

  const filtered = data.leads.filter((lead) => {
    if (status !== "all" && lead.status !== status) return false;
    if (business !== "all" && lead.business !== business) return false;
    if (query) {
      const haystack = `${lead.email} ${lead.source}`.toLowerCase();
      if (!haystack.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <p className="px-1 text-sm text-muted-foreground">
        {data.total.toLocaleString()} prospects
        {" · "}
        {data.complete.toLocaleString()} finished the form
        {" · "}
        {data.partial.toLocaleString()} partial
        {data.truncated ? " · scan capped" : ""}
      </p>

      <div className="grid gap-4 @3xl/main:grid-cols-2">
        <QualificationBarChart
          title="Primary business"
          description="Waitlist cohort"
          rows={data.byBusiness}
        />
        <QualificationBarChart
          title="Annual revenue"
          description="Bands in form order"
          rows={data.byRevenue}
        />
        <QualificationBarChart
          title="Biggest bottleneck"
          description="What they said they need Salt for"
          rows={data.byBottleneck}
        />
        <PlanMixChart
          rows={data.byHeard}
          title="How they heard"
          description="The one share chart"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prospects</CardTitle>
          <CardDescription>
            Pre-account only. Trial users are on People.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search email"
              className="max-w-xs"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40" size="sm" aria-label="Status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="complete">Finished form</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
            <Select value={business} onValueChange={setBusiness}>
              <SelectTrigger className="w-48" size="sm" aria-label="Business">
                <SelectValue placeholder="Business" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All businesses</SelectItem>
                {businesses.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Heard</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No prospects match.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((lead) => (
                  <TableRow key={`${lead.email}-${lead.joined}`}>
                    <TableCell className="font-mono text-xs">
                      {lead.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          lead.status === "complete" ? "secondary" : "outline"
                        }
                      >
                        {lead.status === "complete" ? "qualified" : "partial"}
                      </Badge>
                    </TableCell>
                    <TableCell>{lead.business ?? "—"}</TableCell>
                    <TableCell>{lead.revenue ?? "—"}</TableCell>
                    <TableCell>{lead.heard ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {lead.source}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatDay(lead.joined)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
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

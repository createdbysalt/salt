import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import type { PlaybookLibraryHealth } from "@/app/_features/admin/queries";
import { Section, SectionError } from "./Section";

/**
 * Repo playbook discovery health — validation errors and structural skips in
 * the Salt-authored library. This is the platform-ops home for the signal the
 * Playbooks tab banner used to surface to users; users can't fix repo YAML.
 */
export function PlaybookLibrarySection({
  data,
}: {
  data: PlaybookLibraryHealth | null;
}) {
  const issueCount = (data?.errors.length ?? 0) + (data?.skipped.length ?? 0);

  return (
    <Section
      title="Playbook library"
      description="Discovery of the shipped playbook packages. A validation error or structural skip here means a playbook silently vanished from every workspace."
    >
      {data === null ? (
        <SectionError section="Playbook library" />
      ) : (
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground">
            {data.totalPlaybooks} playbooks discovered
            {issueCount > 0 ? (
              <>
                {" "}
                ·{" "}
                <span className="text-destructive">
                  {issueCount} {issueCount === 1 ? "issue" : "issues"}
                </span>
              </>
            ) : (
              " · all loading cleanly"
            )}
          </p>

          {issueCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              No discovery errors or skips. The library matches what ships.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kind</TableHead>
                  <TableHead>File / path</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.errors.map((entry) => (
                  <TableRow key={`error-${entry.file}`}>
                    <TableCell>
                      <Badge variant="destructive">validation</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.file}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.messages.join("; ")}
                    </TableCell>
                  </TableRow>
                ))}
                {data.skipped.map((entry) => (
                  <TableRow key={`skip-${entry.path}`}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-amber-500/50 bg-amber-500/10 text-amber-600"
                      >
                        skipped
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.path}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.reason}
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

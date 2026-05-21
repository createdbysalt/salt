"use client";

import { FileText } from "lucide-react";
import { StatusPill } from "@repo/ui";
import type { MockPerson } from "@/app/_lib/demo";
import { getMockPersonFiles } from "../getMockPersonFiles";
import { openAskSalt } from "../utils";

export function PersonFilesTab({ person }: { person: MockPerson }) {
  const files = getMockPersonFiles(person);

  if (files.length === 0) {
    return (
      <p className="py-8 text-sm text-muted-foreground">
        No files linked to this relationship yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {files.map((file) => (
        <li
          key={file.id}
          className="flex items-center justify-between gap-4 py-4 first:pt-0"
        >
          <div className="flex min-w-0 items-start gap-3">
            <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{file.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {file.kind} · {file.source} · {file.updated}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <StatusPill
              color={
                file.isConfirmed
                  ? "var(--relationship-clients)"
                  : "var(--relationship-team)"
              }
              label={file.isConfirmed ? "LINKED" : "CHECK"}
            />
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() =>
                openAskSalt(`Review why ${file.name} is linked to ${person.name}.`)
              }
            >
              Review
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

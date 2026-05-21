"use client";

import type { ReactNode } from "react";
import type { MockPerson } from "@/app/_lib/demo";
import { cn } from "@repo/utils";
import { formatLastContact, getRelationshipLabel, openAskSalt } from "./utils";

export function PersonDetailMeta({ person }: { person: MockPerson }) {
  const parts: ReactNode[] = [
    getRelationshipLabel(person.relationshipStatus),
    person.title,
    person.organizationName,
    formatLastContact(person.lastContactDays),
  ].filter(Boolean);

  return (
    <p className="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
      {parts.map((part, index) => (
        <span key={index} className="inline-flex items-center gap-1">
          {index > 0 ? <span className="text-muted-foreground/50">·</span> : null}
          {part}
        </span>
      ))}
      {person.outstandingAmount > 0 ? (
        <>
          <span className="text-muted-foreground/50">·</span>
          <button
            type="button"
            onClick={() => openAskSalt(`Show open invoices for ${person.name}.`)}
            className={cn(
              "text-warning transition-colors hover:text-warning/80"
            )}
          >
            ${person.outstandingAmount.toLocaleString()} due
          </button>
        </>
      ) : null}
    </p>
  );
}

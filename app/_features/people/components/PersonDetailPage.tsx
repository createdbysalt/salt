"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";

type PersonDetailPageProps = {
  personId: string;
};

export function PersonDetailPage({ personId }: PersonDetailPageProps) {
  void personId;

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-10">
        <Link
          href="/people"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-2"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2} />
          Back to People
        </Link>

        <MockContentEmptyState
          title="Person not found"
          description="This contact is not in your workspace yet. Add people from Capture or connect your CRM."
        />
      </div>
    </div>
  );
}

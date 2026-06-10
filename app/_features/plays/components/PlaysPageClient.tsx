"use client";

import type { ActivityEntryRow } from "@/app/_features/plays/types";
import type { QueuePlay } from "@/app/_lib/demo/plays-demo-data";
import { PlaysPage } from "./PlaysPage";

type Props = {
  initialQueue: QueuePlay[];
  initialActivity: ActivityEntryRow[];
};

export function PlaysPageClient({ initialQueue, initialActivity }: Props) {
  return (
    <PlaysPage initialQueue={initialQueue} initialActivity={initialActivity} />
  );
}

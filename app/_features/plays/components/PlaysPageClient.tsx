"use client";

import type { ActivityEntryRow } from "@/app/_features/plays/types";
import type { QueuePlay } from "@/app/_lib/demo/plays-demo-data";
import type { ConnectorsPageData } from "@/app/_features/connectors";
import { PlaysPage } from "./PlaysPage";

type Props = {
  initialQueue: QueuePlay[];
  initialActivity: ActivityEntryRow[];
  connectors: ConnectorsPageData;
};

export function PlaysPageClient({ initialQueue, initialActivity, connectors }: Props) {
  return (
    <PlaysPage
      initialQueue={initialQueue}
      initialActivity={initialActivity}
      connectors={connectors}
    />
  );
}

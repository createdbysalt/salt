import { describe, expect, it } from "vitest";
import type { ActivityEntryRow } from "../types";
import { mapActivityEntryForUi } from "./map-activity-entry";

function activityRow(overrides: Partial<ActivityEntryRow> = {}): ActivityEntryRow {
  return {
    id: "activity-1",
    workspace_id: "workspace-1",
    play_run_id: null,
    actor_user_id: null,
    action: "created",
    title: "Person created",
    detail: "Jane Doe",
    metadata: null,
    created_at: new Date().toISOString(),
    source_url: null,
    ...overrides,
  };
}

describe("mapActivityEntryForUi", () => {
  it("classifies auto-executed system-play creates as Salt Acted", () => {
    const entry = mapActivityEntryForUi(
      activityRow({
        metadata: {
          source: "system_play",
          auto_executed: true,
          player_slug: "keeper",
        },
      })
    );

    expect(entry.category).toBe("salt-acted");
    expect(entry.playerId).toBe("keeper");
  });

  it("keeps manually created rows in progress", () => {
    const entry = mapActivityEntryForUi(activityRow());

    expect(entry.category).toBe("in-progress");
  });

  it("classifies failed activity rows as Error", () => {
    const entry = mapActivityEntryForUi(
      activityRow({
        action: "failed",
        title: "Memory Hygiene failed",
        metadata: { error: "Script execution failed" },
      })
    );

    expect(entry.category).toBe("error");
  });

  it("classifies failed run metadata as Error", () => {
    const entry = mapActivityEntryForUi(
      activityRow({
        action: "ran",
        metadata: { success: false },
      })
    );

    expect(entry.category).toBe("error");
  });
});

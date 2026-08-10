import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Entity Profiles (Connector Rules & Learning, P6).
 *
 * Category-dispatch reputation: email sender entities delegate to the proven
 * capture_sender_profiles table; every other category reads/writes
 * connector_entity_profiles. Keys always come from the P2 adapter extraction
 * (feedbackEntity) — this service never re-derives them.
 */

const {
  mockFrom,
  connectorEntityProfilesRows,
  senderProfilesRows,
} = vi.hoisted(() => {
  const connectorEntityProfilesRows: Record<string, unknown>[] = [];
  const senderProfilesRows: Record<string, unknown>[] = [];
  return {
    mockFrom: vi.fn(),
    connectorEntityProfilesRows,
    senderProfilesRows,
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import {
  loadEntityReputation,
  recordEntityObservation,
} from "./entity-profiles";

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

function rowQuery(rows: Record<string, unknown>[]) {
  const filters: Array<[string, unknown]> = [];
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn((col: string, val: unknown) => {
      filters.push([col, val]);
      return builder;
    }),
    is: vi.fn((col: string, val: unknown) => {
      filters.push([col, val]);
      return builder;
    }),
    maybeSingle: vi.fn((): Promise<QueryResult> => {
      const match = rows.find((row) =>
        filters.every(([col, val]) => (row[col] ?? null) === val),
      );
      return Promise.resolve({ data: match ?? null, error: null });
    }),
    update: vi.fn((values: Record<string, unknown>) => {
      const match = rows.find((row) =>
        filters.every(([col, val]) => (row[col] ?? null) === val),
      );
      if (match) Object.assign(match, values);
      return {
        eq: vi.fn(() => Promise.resolve({ error: null })),
      };
    }),
    upsert: vi.fn((values: Record<string, unknown>) => {
      const existing = rows.find(
        (row) =>
          row.workspace_id === values.workspace_id &&
          (row.provider ?? null) === (values.provider ?? null) &&
          row.entity_type === values.entity_type &&
          row.entity_key === values.entity_key,
      );
      if (existing) {
        Object.assign(existing, values);
      } else {
        rows.push({ id: `row-${rows.length + 1}`, ...values });
      }
      return Promise.resolve({ error: null });
    }),
  };
  return builder;
}

beforeEach(() => {
  connectorEntityProfilesRows.length = 0;
  senderProfilesRows.length = 0;
  mockFrom.mockImplementation((table: string) => {
    if (table === "connector_entity_profiles") {
      return rowQuery(connectorEntityProfilesRows);
    }
    if (table === "capture_sender_profiles") {
      return rowQuery(senderProfilesRows);
    }
    throw new Error(`unexpected table: ${table}`);
  });
});

describe("loadEntityReputation", () => {
  it("delegates email senders to capture_sender_profiles", async () => {
    senderProfilesRows.push({
      id: "sp-1",
      workspace_id: "ws-1",
      sender_key: "maya@example.com",
      sender_key_type: "email",
      reputation_score: 80,
    });

    const reputation = await loadEntityReputation("ws-1", {
      provider: "gmail",
      category: "email",
      entity: { type: "sender_email", key: "Maya@Example.com" },
    });

    expect(reputation).toEqual({ score: 80, observations: 0 });
  });

  it("reads other categories from connector_entity_profiles", async () => {
    connectorEntityProfilesRows.push({
      id: "ep-1",
      workspace_id: "ws-1",
      provider: "slack",
      category: "communication",
      entity_type: "channel",
      entity_key: "#general",
      reputation_score: 75,
      observation_count: 3,
    });

    const reputation = await loadEntityReputation("ws-1", {
      provider: "slack",
      category: "communication",
      entity: { type: "channel", key: "#general" },
    });

    expect(reputation).toEqual({ score: 75, observations: 3 });
  });

  it("returns null when the workspace has no history with the entity", async () => {
    const reputation = await loadEntityReputation("ws-1", {
      provider: "stripe",
      category: "billing",
      entity: { type: "customer", key: "unknown@example.com" },
    });
    expect(reputation).toBeNull();
  });
});

describe("recordEntityObservation", () => {
  it("creates a profile on first observation for non-email categories", async () => {
    await recordEntityObservation("ws-1", {
      provider: "googlecalendar",
      category: "calendar",
      entity: { type: "organizer", key: "Maya@Example.com" },
      delta: 10,
    });

    expect(connectorEntityProfilesRows).toHaveLength(1);
    const row = connectorEntityProfilesRows[0];
    // Email-shaped keys normalize lowercase, matching rules-manager semantics.
    expect(row.entity_key).toBe("maya@example.com");
    expect(row.reputation_score).toBe(60); // 50 baseline + 10
    expect(row.observation_count).toBe(1);
  });

  it("adjusts an existing profile and clamps to 0-100", async () => {
    connectorEntityProfilesRows.push({
      id: "ep-1",
      workspace_id: "ws-1",
      provider: "stripe",
      category: "billing",
      entity_type: "customer",
      entity_key: "joe@example.com",
      reputation_score: 95,
      observation_count: 4,
    });

    await recordEntityObservation("ws-1", {
      provider: "stripe",
      category: "billing",
      entity: { type: "customer", key: "joe@example.com" },
      delta: 10,
    });

    expect(connectorEntityProfilesRows[0].reputation_score).toBe(100);
    expect(connectorEntityProfilesRows[0].observation_count).toBe(5);
  });

  it("delegates email sender observations to capture_sender_profiles", async () => {
    senderProfilesRows.push({
      id: "sp-1",
      workspace_id: "ws-1",
      sender_key: "maya@example.com",
      sender_key_type: "email",
      reputation_score: 50,
    });

    await recordEntityObservation("ws-1", {
      provider: "gmail",
      category: "email",
      entity: { type: "sender_email", key: "maya@example.com" },
      delta: -10,
    });

    expect(senderProfilesRows[0].reputation_score).toBe(40);
    // Nothing lands in the generalized table for email senders.
    expect(connectorEntityProfilesRows).toHaveLength(0);
  });

  it("scopes profiles per provider (a slack channel and a gmail sender never collide)", async () => {
    await recordEntityObservation("ws-1", {
      provider: "slack",
      category: "communication",
      entity: { type: "author", key: "sam@example.com" },
      delta: 10,
    });
    await recordEntityObservation("ws-1", {
      provider: "hubspot",
      category: "crm",
      entity: { type: "contact", key: "sam@example.com" },
      delta: -10,
    });

    expect(connectorEntityProfilesRows).toHaveLength(2);
  });
});

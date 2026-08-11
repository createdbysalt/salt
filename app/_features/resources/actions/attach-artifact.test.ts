import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/app/_lib/supabase/database.types";
import { attachArtifactToEntity } from "./attach-artifact";

/**
 * attachArtifactToEntity — the artifact-first foundation (Phase 7).
 *
 * Creates a Resource (link or file) plus an entity_links attachment edge,
 * idempotent on (workspace_id, external_url | object_path, target record):
 * Stripe webhook retries and re-syncs must never duplicate the artifact.
 */

type Row = Record<string, unknown>;

function stubAdmin() {
  const resources: Row[] = [];
  const links: Row[] = [];
  let seq = 0;

  function applyFilters(rows: Row[], filters: Array<[string, unknown]>) {
    return rows.filter((row) =>
      filters.every(([col, val]) => (row[col] ?? null) === val),
    );
  }

  function builder(rows: Row[]) {
    const filters: Array<[string, unknown]> = [];
    const chain = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        filters.push([col, val]);
        return chain;
      },
      is: (col: string, val: unknown) => {
        filters.push([col, val]);
        return chain;
      },
      maybeSingle: () => {
        const found = applyFilters(rows, filters);
        return Promise.resolve({ data: found[0] ?? null, error: null });
      },
      single: () => {
        const found = applyFilters(rows, filters);
        return Promise.resolve({ data: found[0] ?? null, error: null });
      },
      insert: (row: Row) => {
        const stored = { id: `id-${++seq}`, ...row };
        rows.push(stored);
        return {
          select: () => ({
            single: () => Promise.resolve({ data: stored, error: null }),
          }),
        };
      },
    };
    return chain;
  }

  const client = {
    from: (table: string) => {
      if (table === "resources") return builder(resources);
      if (table === "entity_links") return builder(links);
      throw new Error(`unexpected table: ${table}`);
    },
  };

  return {
    client: client as unknown as SupabaseClient<Database>,
    resources,
    links,
  };
}

const WS = "ws-1";
const BILLING_ID = "11111111-1111-4111-8111-111111111111";
const MEETING_ID = "22222222-2222-4222-8222-222222222222";

describe("attachArtifactToEntity", () => {
  it("creates a link resource and an attachment edge", async () => {
    const { client, resources, links } = stubAdmin();

    const result = await attachArtifactToEntity(client, {
      workspaceId: WS,
      targetType: "billing",
      targetId: BILLING_ID,
      externalUrl: "https://invoice.stripe.com/i/acct_123/test",
      displayName: "Invoice INV-0042",
      source: "capture",
      confidence: 98,
      because: "Hosted invoice from Stripe",
    });

    expect(result.success).toBe(true);
    expect(resources).toHaveLength(1);
    expect(resources[0]).toMatchObject({
      workspace_id: WS,
      file_type: "link",
      external_url: "https://invoice.stripe.com/i/acct_123/test",
      file_name: "Invoice INV-0042",
      created_by_system: true,
      uploaded_by: null,
    });
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      workspace_id: WS,
      source_type: "resource",
      source_id: resources[0].id,
      target_type: "billing",
      target_id: BILLING_ID,
      relation_type: "attachment",
      confidence: 98,
      because: "Hosted invoice from Stripe",
    });
  });

  it("is idempotent — a retried webhook creates nothing twice", async () => {
    const { client, resources, links } = stubAdmin();
    const input = {
      workspaceId: WS,
      targetType: "billing" as const,
      targetId: BILLING_ID,
      externalUrl: "https://invoice.stripe.com/i/acct_123/test",
      source: "capture" as const,
    };

    const first = await attachArtifactToEntity(client, input);
    const second = await attachArtifactToEntity(client, input);

    expect(first.success && second.success).toBe(true);
    expect(resources).toHaveLength(1);
    expect(links).toHaveLength(1);
    if (first.success && second.success) {
      expect(second.resourceId).toBe(first.resourceId);
      expect(second.createdResource).toBe(false);
      expect(second.createdEdge).toBe(false);
    }
  });

  it("reuses an existing resource but adds a missing edge to a new target", async () => {
    const { client, resources, links } = stubAdmin();
    const url = "https://docs.google.com/document/d/abc123/edit";

    const first = await attachArtifactToEntity(client, {
      workspaceId: WS,
      targetType: "meeting",
      targetId: MEETING_ID,
      externalUrl: url,
      source: "manual",
    });
    const second = await attachArtifactToEntity(client, {
      workspaceId: WS,
      targetType: "work",
      targetId: "33333333-3333-4333-8333-333333333333",
      externalUrl: url,
      source: "manual",
    });

    expect(first.success && second.success).toBe(true);
    expect(resources).toHaveLength(1);
    expect(links).toHaveLength(2);
    if (first.success && second.success) {
      expect(second.resourceId).toBe(first.resourceId);
      expect(second.createdResource).toBe(false);
      expect(second.createdEdge).toBe(true);
    }
  });

  it("dedupes file artifacts on object_path", async () => {
    const { client, resources } = stubAdmin();
    const input = {
      workspaceId: WS,
      targetType: "billing" as const,
      targetId: BILLING_ID,
      file: {
        bucketId: "billing-documents",
        objectPath: "ws-1/invoice-42.pdf",
        fileName: "invoice-42.pdf",
        mimeType: "application/pdf",
      },
      source: "capture" as const,
    };

    await attachArtifactToEntity(client, input);
    const second = await attachArtifactToEntity(client, input);

    expect(resources).toHaveLength(1);
    expect(second.success && !second.createdResource).toBe(true);
  });

  it("detects the resource type from the URL", async () => {
    const { client, resources } = stubAdmin();

    await attachArtifactToEntity(client, {
      workspaceId: WS,
      targetType: "meeting",
      targetId: MEETING_ID,
      externalUrl: "https://docs.google.com/document/d/abc123/edit",
      source: "manual",
    });

    expect(resources[0]).toMatchObject({
      resource_type: "gdrive_doc",
      resource_id: "abc123",
    });
  });

  it("honors a resource-type override for providers URLs can't reveal", async () => {
    const { client, resources } = stubAdmin();

    await attachArtifactToEntity(client, {
      workspaceId: WS,
      targetType: "meeting",
      targetId: MEETING_ID,
      externalUrl: "https://app.fireflies.ai/view/xyz",
      resourceTypeOverride: "fireflies_transcript",
      source: "capture",
    });

    expect(resources[0]).toMatchObject({ resource_type: "fireflies_transcript" });
  });

  it("refuses input with neither or both artifact forms", async () => {
    const { client } = stubAdmin();

    const neither = await attachArtifactToEntity(client, {
      workspaceId: WS,
      targetType: "billing",
      targetId: BILLING_ID,
      source: "capture",
    });
    expect(neither.success).toBe(false);

    const both = await attachArtifactToEntity(client, {
      workspaceId: WS,
      targetType: "billing",
      targetId: BILLING_ID,
      externalUrl: "https://example.com/inv",
      file: {
        bucketId: "billing-documents",
        objectPath: "ws-1/invoice-42.pdf",
        fileName: "invoice-42.pdf",
        mimeType: "application/pdf",
      },
      source: "capture",
    });
    expect(both.success).toBe(false);
  });

  it("records user authorship when an acting user uploaded the file", async () => {
    const { client, resources } = stubAdmin();

    await attachArtifactToEntity(client, {
      workspaceId: WS,
      targetType: "billing",
      targetId: BILLING_ID,
      file: {
        bucketId: "billing-documents",
        objectPath: "workspace/ws-1/abc-invoice.pdf",
        fileName: "invoice.pdf",
        mimeType: "application/pdf",
      },
      source: "manual",
      actingUserId: "user-1",
    });

    expect(resources[0]).toMatchObject({
      uploaded_by: "user-1",
      created_by_system: false,
    });
  });
});

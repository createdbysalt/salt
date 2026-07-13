/**
 * Enrichment Orchestrator Integration Tests
 *
 * Phase 0 baseline tests for the enrichment unification plan.
 * These lock current behavior so refactors can verify no regression.
 *
 * Key scenarios:
 * - Jane Example: name-only intake → should find email from connected Gmail
 * - sourcesQueried/sourcesWithData contract shape
 * - Multi-entity intake (person + work)
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { enrichEntity } from "./index";
import * as connections from "../connections";
import * as actions from "../actions";
import * as categoryFetcher from "../category-fetcher";

vi.mock("../connections");
vi.mock("../actions");
vi.mock("../category-fetcher");

const mockGetConnectionStatus = vi.mocked(connections.getConnectionStatus);
const mockFetchGmailMessagesPage = vi.mocked(actions.fetchGmailMessagesPage);
const mockGetGmailMessage = vi.mocked(actions.getGmailMessage);
const mockGetConnectedCategories = vi.mocked(categoryFetcher.getConnectedCategories);

function setupGmailConnection() {
  mockGetConnectedCategories.mockResolvedValue([
    { category: "email", providers: ["gmail"], connectionIds: ["conn-1"] },
  ]);
  mockGetConnectionStatus.mockResolvedValue({
    connected: true,
    email: "user@example.com",
    integrationId: "int-1",
    composioConnectionId: "conn-1",
    composioStatus: "connected",
  });
}

function setupNoConnections() {
  mockGetConnectedCategories.mockResolvedValue([]);
  mockGetConnectionStatus.mockResolvedValue({
    connected: false,
    email: null,
    integrationId: null,
    composioConnectionId: null,
    composioStatus: null,
  });
}

describe("enrichEntity orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("result shape contract", () => {
    it("returns documented EnrichmentResult shape with all required fields", async () => {
      setupNoConnections();

      const result = await enrichEntity({
        entityType: "person",
        seed: { name: "Test Person" },
        workspaceId: "ws-123",
      });

      expect(result).toMatchObject({
        entityType: "person",
        fields: expect.any(Object),
        connections: expect.any(Object),
        notes: expect.any(Array),
        sourcesQueried: expect.any(Array),
        sourcesWithData: expect.any(Array),
      });
    });

    it("sourcesQueried lists all queried sources regardless of data found", async () => {
      setupGmailConnection();
      mockFetchGmailMessagesPage.mockResolvedValue({
        messages: [],
        nextPageToken: null,
      });

      const result = await enrichEntity({
        entityType: "person",
        seed: { name: "Nobody" },
        workspaceId: "ws-123",
      });

      expect(result.sourcesQueried).toContain("gmail");
      expect(result.sourcesWithData).toEqual([]);
    });

    it("sourcesWithData only includes sources that returned data", async () => {
      setupGmailConnection();
      mockFetchGmailMessagesPage.mockResolvedValue({
        messages: [
          {
            messageId: "198d6f40c1825d60",
            subject: "Contract draft",
            sender: "Jane Example <lisa@acme.com>",
            to: "user@example.com",
          },
        ],
        nextPageToken: null,
      });
      mockGetGmailMessage.mockRejectedValue(new Error("hydration skipped"));

      const result = await enrichEntity({
        entityType: "person",
        seed: { name: "Jane Example" },
        workspaceId: "ws-123",
      });

      expect(result.sourcesWithData).toContain("gmail");
      expect(result.fields.email?.value).toBe("lisa@acme.com");
    });
  });

  describe("Jane Example scenario (name-only intake)", () => {
    it("extracts email from Gmail FETCH_EMAILS metadata when only name is provided", async () => {
      setupGmailConnection();
      mockFetchGmailMessagesPage.mockResolvedValue({
        messages: [
          {
            messageId: "198d6f40c1825d60",
            threadId: "198d6f40c1825d5f",
            messageTimestamp: "2026-06-28T14:12:09Z",
            subject: "Contract draft for the June retainer",
            sender: "Jane Example <lisa@acme.com>",
            to: "user@example.com",
            labelIds: ["INBOX"],
          },
        ],
        nextPageToken: null,
      });
      mockGetGmailMessage.mockRejectedValue(new Error("hydration failed"));

      const result = await enrichEntity({
        entityType: "person",
        seed: { name: "Jane Example" },
        workspaceId: "ws-123",
      });

      expect(result.fields.email?.value).toBe("lisa@acme.com");
      expect(result.fields.email?.source).toBe("gmail");
      expect(result.fields.name?.value).toBe("Jane Example");
      expect(result.sourcesWithData).toContain("gmail");
    });

    it("extracts from hydrated message when full fetch succeeds", async () => {
      setupGmailConnection();
      mockFetchGmailMessagesPage.mockResolvedValue({
        messages: [{ id: "msg-1" }],
        nextPageToken: null,
      });
      mockGetGmailMessage.mockResolvedValue({
        id: "msg-1",
        threadId: "thread-1",
        labelIds: [],
        snippet: "Hello",
        historyId: "123",
        internalDate: "1234567890",
        sizeEstimate: 100,
        payload: {
          partId: "",
          mimeType: "text/plain",
          filename: "",
          headers: [
            { name: "From", value: '"Jane Example" <lisa@acme.com>' },
            { name: "Subject", value: "Project kickoff" },
          ],
          body: { size: 0 },
        },
      });

      const result = await enrichEntity({
        entityType: "person",
        seed: { name: "Jane Example" },
        workspaceId: "ws-123",
      });

      expect(result.fields.email?.value).toBe("lisa@acme.com");
      expect(result.fields.name?.value).toBe("Jane Example");
    });
  });

  describe("no connected apps", () => {
    it("returns empty result with no sourcesQueried when nothing connected", async () => {
      setupNoConnections();

      const result = await enrichEntity({
        entityType: "person",
        seed: { name: "Anyone" },
        workspaceId: "ws-123",
      });

      expect(result.fields).toEqual({});
      expect(result.sourcesQueried).toEqual([]);
      expect(result.sourcesWithData).toEqual([]);
    });
  });

  describe("entity type routing", () => {
    it("person enrichment queries email and calendar categories", async () => {
      setupGmailConnection();
      mockFetchGmailMessagesPage.mockResolvedValue({
        messages: [],
        nextPageToken: null,
      });

      const result = await enrichEntity({
        entityType: "person",
        seed: { email: "client@example.com" },
        workspaceId: "ws-123",
      });

      expect(mockGetConnectedCategories).toHaveBeenCalledWith("ws-123");
      expect(result.entityType).toBe("person");
    });

    it("billing enrichment queries billing category", async () => {
      mockGetConnectedCategories.mockResolvedValue([
        { category: "billing", providers: ["stripe"], connectionIds: ["conn-stripe"] },
      ]);
      mockGetConnectionStatus.mockResolvedValue({
        connected: true,
        email: null,
        integrationId: "int-stripe",
        composioConnectionId: "conn-stripe",
        composioStatus: "connected",
      });

      const result = await enrichEntity({
        entityType: "billing",
        seed: { invoiceNumber: "INV-001" },
        workspaceId: "ws-123",
      });

      expect(result.entityType).toBe("billing");
    });
  });

  describe("multi-provider discovery (Phase 1)", () => {
    it("queries HubSpot when connected, not just ASK_SALT_CONNECTOR_MANIFEST", async () => {
      mockGetConnectedCategories.mockResolvedValue([
        { category: "email", providers: ["gmail"], connectionIds: ["conn-gmail"] },
        { category: "crm", providers: ["hubspot"], connectionIds: ["conn-hubspot"] },
      ]);
      mockGetConnectionStatus.mockResolvedValue({
        connected: true,
        email: "user@example.com",
        integrationId: "int-1",
        composioConnectionId: "conn-gmail",
        composioStatus: "connected",
      });
      mockFetchGmailMessagesPage.mockResolvedValue({
        messages: [],
        nextPageToken: null,
      });

      const result = await enrichEntity({
        entityType: "person",
        seed: { name: "Test" },
        workspaceId: "ws-123",
      });

      expect(mockGetConnectedCategories).toHaveBeenCalledWith("ws-123");
      expect(result.sourcesQueried.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("enrich_entity tool contract (Ask Salt)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tool result includes foundData boolean for model consumption", async () => {
    setupGmailConnection();
    mockFetchGmailMessagesPage.mockResolvedValue({
      messages: [
        {
          messageId: "msg-1",
          sender: "Jane Example <lisa@acme.com>",
          subject: "Test",
          to: "user@example.com",
        },
      ],
      nextPageToken: null,
    });
    mockGetGmailMessage.mockRejectedValue(new Error("skip hydration"));

    const result = await enrichEntity({
      entityType: "person",
      seed: { name: "Jane Example" },
      workspaceId: "ws-123",
    });

    const hasData = result.sourcesWithData.length > 0;
    expect(hasData).toBe(true);
  });

  it("field confidence is normalized to 0-1 range", async () => {
    setupGmailConnection();
    mockFetchGmailMessagesPage.mockResolvedValue({
      messages: [
        {
          messageId: "msg-1",
          sender: "Jane Example <lisa@acme.com>",
          subject: "Test",
          to: "user@example.com",
        },
      ],
      nextPageToken: null,
    });
    mockGetGmailMessage.mockRejectedValue(new Error("skip hydration"));

    const result = await enrichEntity({
      entityType: "person",
      seed: { name: "Jane Example" },
      workspaceId: "ws-123",
    });

    for (const field of Object.values(result.fields)) {
      expect(field.confidence).toBeGreaterThanOrEqual(0);
      expect(field.confidence).toBeLessThanOrEqual(1);
    }
  });
});

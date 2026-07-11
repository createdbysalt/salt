import { describe, expect, it, vi, beforeEach } from "vitest";
import { gmailExtractor } from "./gmail";
import type { ExtractorContext } from "./base";
import * as connections from "../../connections";
import * as actions from "../../actions";

vi.mock("../../connections");
vi.mock("../../actions");

const mockGetConnectionStatus = vi.mocked(connections.getConnectionStatus);
const mockFetchGmailMessagesPage = vi.mocked(actions.fetchGmailMessagesPage);
const mockGetGmailMessage = vi.mocked(actions.getGmailMessage);

describe("gmailExtractor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseContext: ExtractorContext = {
    workspaceId: "ws-123",
    entityType: "person",
    seed: { email: "jane@acme.com", name: "Jane" },
    connectorToolkit: "gmail",
  };

  it("returns empty result when no email in seed", async () => {
    const ctx: ExtractorContext = {
      ...baseContext,
      seed: { name: "Jane" },
    };

    const result = await gmailExtractor.extract(ctx);

    expect(result.hasData).toBe(false);
    expect(result.source).toBe("gmail");
  });

  it("returns empty result when gmail not connected", async () => {
    mockGetConnectionStatus.mockResolvedValue({
      connected: false,
      email: null,
      integrationId: null,
      composioConnectionId: null,
      composioStatus: null,
    });

    const result = await gmailExtractor.extract(baseContext);

    expect(result.hasData).toBe(false);
  });

  it("returns empty result when no messages found", async () => {
    mockGetConnectionStatus.mockResolvedValue({
      connected: true,
      email: "user@example.com",
      integrationId: "int-1",
      composioConnectionId: "conn-1",
      composioStatus: "connected",
    });
    mockFetchGmailMessagesPage.mockResolvedValue({
      messages: [],
      nextPageToken: null,
    });

    const result = await gmailExtractor.extract(baseContext);

    expect(result.hasData).toBe(false);
  });

  it("extracts name from email From header", async () => {
    mockGetConnectionStatus.mockResolvedValue({
      connected: true,
      email: "user@example.com",
      integrationId: "int-1",
      composioConnectionId: "conn-1",
      composioStatus: "connected",
    });
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
          { name: "From", value: '"Jane Smith" <jane@acme.com>' },
          { name: "Subject", value: "Project Update" },
          { name: "Date", value: "2026-07-01" },
        ],
        body: { size: 0 },
      },
    });

    const result = await gmailExtractor.extract(baseContext);

    expect(result.hasData).toBe(true);
    expect(result.fields.name?.value).toBe("Jane Smith");
    expect(result.notes).toHaveLength(1);
    expect(result.notes?.[0].content).toContain("Project Update");
  });

  it("extracts phone and title from signature", async () => {
    mockGetConnectionStatus.mockResolvedValue({
      connected: true,
      email: "user@example.com",
      integrationId: "int-1",
      composioConnectionId: "conn-1",
      composioStatus: "connected",
    });
    mockFetchGmailMessagesPage.mockResolvedValue({
      messages: [{ id: "msg-1" }],
      nextPageToken: null,
    });

    const emailBody = Buffer.from(`
Hi there,

Thanks for reaching out about the project.

Best regards,
Jane Smith
VP of Marketing | Acme Corp
Phone: +1-555-123-4567
jane@acme.com
    `).toString("base64");

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
          { name: "From", value: "jane@acme.com" },
          { name: "Subject", value: "Re: Project" },
        ],
        body: { size: emailBody.length, data: emailBody },
      },
    });

    const result = await gmailExtractor.extract(baseContext);

    expect(result.hasData).toBe(true);
    expect(result.fields.phone?.value).toContain("555-123-4567");
    expect(result.fields.title?.value).toContain("VP of Marketing");
    expect(result.fields.organization?.value).toContain("Acme Corp");
  });

  it("creates org connection from non-freemail domain", async () => {
    mockGetConnectionStatus.mockResolvedValue({
      connected: true,
      email: "user@example.com",
      integrationId: "int-1",
      composioConnectionId: "conn-1",
      composioStatus: "connected",
    });
    mockFetchGmailMessagesPage.mockResolvedValue({
      messages: [{ id: "msg-1" }],
      nextPageToken: null,
    });

    const emailBody = Buffer.from(`
Best,
Jane
Director of Sales | Acme Corp
    `).toString("base64");

    mockGetGmailMessage.mockResolvedValue({
      id: "msg-1",
      threadId: "thread-1",
      labelIds: [],
      snippet: "",
      historyId: "123",
      internalDate: "1234567890",
      sizeEstimate: 100,
      payload: {
        partId: "",
        mimeType: "text/plain",
        filename: "",
        headers: [{ name: "From", value: "jane@acme.com" }],
        body: { size: emailBody.length, data: emailBody },
      },
    });

    const result = await gmailExtractor.extract(baseContext);

    expect(result.connections?.orgs).toHaveLength(1);
    expect(result.connections?.orgs?.[0].name).toBe("Acme Corp");
    expect(result.connections?.orgs?.[0].domain).toBe("acme.com");
  });
});

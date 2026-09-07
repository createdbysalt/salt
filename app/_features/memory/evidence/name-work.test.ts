import { describe, expect, it, vi, beforeEach } from "vitest";

const sendLlmMock = vi.fn();

vi.mock("@/app/_lib/ai/gpt", () => ({
  sendLlm: (...args: unknown[]) => sendLlmMock(...args),
  backgroundSpend: (workspaceId: string, userId?: string) => ({
    kind: "workspace" as const,
    workspaceId,
    userId,
    origin: "background" as const,
  }),
}));

import {
  buildWorkNamingPrompt,
  extractNamingContextFromCapture,
  isPersonNameCollision,
  proposeWorkName,
  WORK_NAME_CONFIDENCE_THRESHOLD,
  type WorkNamingContext,
} from "./name-work";

const baseContext: WorkNamingContext = {
  workspaceId: "ws-1",
  subject: "Barrett on the Studio",
  bodyExcerpt: "Hi, attached is the signed service agreement for the website build.",
  attachmentNames: ["Playground Website Service Agreement.pdf"],
  senderName: "Barrett",
  counterparty: "Barrett",
  knownEntityNames: ["Barrett", "The Studio"],
};

describe("proposeWorkName", () => {
  beforeEach(() => {
    sendLlmMock.mockReset();
  });

  it("returns a proposal from valid JSON", async () => {
    sendLlmMock.mockResolvedValue(
      JSON.stringify({ projectName: "Playground Website", confidence: 92 }),
    );

    const result = await proposeWorkName(baseContext);

    expect(result).toEqual({ name: "Playground Website", confidence: 92 });
  });

  it("prefers agreement filenames over a person-flavored subject (prompt contract)", async () => {
    sendLlmMock.mockResolvedValue(
      JSON.stringify({ projectName: "Playground Website", confidence: 90 }),
    );

    await proposeWorkName(baseContext);

    const prompt = sendLlmMock.mock.calls[0][0][0].content as string;
    expect(prompt).toContain("Playground Website Service Agreement.pdf");
    expect(prompt).toContain("Barrett on the Studio");
    expect(prompt).toContain("NEVER");
  });

  it("returns null when the LLM finds no project", async () => {
    sendLlmMock.mockResolvedValue(
      JSON.stringify({ projectName: null, confidence: 0 }),
    );

    expect(await proposeWorkName(baseContext)).toBeNull();
  });

  it("returns null when confidence is below the threshold", async () => {
    sendLlmMock.mockResolvedValue(
      JSON.stringify({
        projectName: "Playground Website",
        confidence: WORK_NAME_CONFIDENCE_THRESHOLD - 1,
      }),
    );

    expect(await proposeWorkName(baseContext)).toBeNull();
  });

  it("accepts a proposal at exactly the threshold", async () => {
    sendLlmMock.mockResolvedValue(
      JSON.stringify({
        projectName: "Playground Website",
        confidence: WORK_NAME_CONFIDENCE_THRESHOLD,
      }),
    );

    const result = await proposeWorkName(baseContext);
    expect(result?.name).toBe("Playground Website");
  });

  it("rejects a proposal that is the sender's name", async () => {
    sendLlmMock.mockResolvedValue(
      JSON.stringify({ projectName: "Barrett", confidence: 95 }),
    );

    expect(await proposeWorkName(baseContext)).toBeNull();
  });

  it("rejects a proposal that matches a known entity name (case-insensitive)", async () => {
    sendLlmMock.mockResolvedValue(
      JSON.stringify({ projectName: "the studio", confidence: 95 }),
    );

    expect(await proposeWorkName(baseContext)).toBeNull();
  });

  it("returns null when the LLM is unavailable", async () => {
    sendLlmMock.mockResolvedValue(null);

    expect(await proposeWorkName(baseContext)).toBeNull();
  });

  it("returns null on unparseable JSON", async () => {
    sendLlmMock.mockResolvedValue("I think the project is called Playground Website");

    expect(await proposeWorkName(baseContext)).toBeNull();
  });

  it("strips markdown code fences before parsing", async () => {
    sendLlmMock.mockResolvedValue(
      '```json\n{"projectName":"Playground Website","confidence":88}\n```',
    );

    const result = await proposeWorkName(baseContext);
    expect(result?.name).toBe("Playground Website");
  });

  it("returns null without making an LLM call when there is no context at all", async () => {
    const result = await proposeWorkName({ workspaceId: "ws-1" });

    expect(result).toBeNull();
    expect(sendLlmMock).not.toHaveBeenCalled();
  });

  it("meters as background workspace spend on the workNaming routing key", async () => {
    sendLlmMock.mockResolvedValue(
      JSON.stringify({ projectName: "Playground Website", confidence: 90 }),
    );

    await proposeWorkName(baseContext);

    const [, spend, options] = sendLlmMock.mock.calls[0];
    expect(spend).toEqual({
      kind: "workspace",
      workspaceId: "ws-1",
      userId: undefined,
      origin: "background",
    });
    expect(options.routingKey).toBe("workNaming");
  });
});

describe("isPersonNameCollision", () => {
  it("matches sender, counterparty, and known entities after normalization", () => {
    expect(isPersonNameCollision("  Barrett ", baseContext)).toBe(true);
    expect(isPersonNameCollision("The  Studio", baseContext)).toBe(true);
    expect(isPersonNameCollision("Playground Website", baseContext)).toBe(false);
  });
});

describe("buildWorkNamingPrompt", () => {
  it("includes subject, sender, attachments, and body excerpt", () => {
    const prompt = buildWorkNamingPrompt(baseContext);

    expect(prompt).toContain("Subject: Barrett on the Studio");
    expect(prompt).toContain("From: Barrett");
    expect(prompt).toContain("Playground Website Service Agreement.pdf");
    expect(prompt).toContain("attached is the signed service agreement");
  });

  it("omits empty sections", () => {
    const prompt = buildWorkNamingPrompt({
      workspaceId: "ws-1",
      subject: "Kickoff",
    });

    expect(prompt).toContain("Subject: Kickoff");
    expect(prompt).not.toContain("From:");
    expect(prompt).not.toContain("Attachments:");
  });
});

describe("extractNamingContextFromCapture", () => {
  it("pulls subject, snippet, attachment names, and sender name from adapter shapes", () => {
    const context = extractNamingContextFromCapture(
      {
        sender_email: "barrett@thestudio.com",
        subject: "Barrett on the Studio",
        snippet: "Attached is the agreement.",
        attachments: [{ name: "Playground Website Service Agreement.pdf", contentType: "application/pdf" }],
      },
      {},
    );

    expect(context).toEqual({
      subject: "Barrett on the Studio",
      bodyExcerpt: "Attached is the agreement.",
      attachmentNames: ["Playground Website Service Agreement.pdf"],
      senderName: null,
    });
  });

  it("parses the display name out of a named From header", () => {
    const context = extractNamingContextFromCapture(
      { from: "Barrett <barrett@thestudio.com>", subject: "Hello" },
      {},
    );

    expect(context.senderName).toBe("Barrett");
    expect(context.subject).toBe("Hello");
  });

  it("handles string-only attachment arrays and raw_payload fallbacks", () => {
    const context = extractNamingContextFromCapture(
      {},
      {
        sender: "barrett@thestudio.com",
        subject: "Raw subject",
        body: "Raw body",
        attachments: ["SOW.pdf"],
      },
    );

    expect(context).toEqual({
      subject: "Raw subject",
      bodyExcerpt: "Raw body",
      attachmentNames: ["SOW.pdf"],
      senderName: null,
    });
  });
});

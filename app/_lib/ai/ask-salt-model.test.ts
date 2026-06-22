import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const chatMock = vi.fn(() => ({ modelId: "chat-model" }));
const openrouterMock = vi.fn(() => ({
  chat: chatMock,
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => openrouterMock(),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => ({ modelId: "anthropic-model" })),
}));

describe("getAskSaltLanguageModel", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    chatMock.mockClear();
    openrouterMock.mockClear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses OpenRouter chat completions, not the Responses API default", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    delete process.env.ANTHROPIC_API_KEY;

    const { getAskSaltLanguageModel } = await import("./ask-salt-model");
    const model = getAskSaltLanguageModel();

    expect(chatMock).toHaveBeenCalledWith("google/gemini-3.5-flash");
    expect(model).toEqual({ modelId: "chat-model" });
  });

  it("falls back to Anthropic when OpenRouter is not configured", async () => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENAI_API_KEY;
    process.env.ANTHROPIC_API_KEY = "test-key";

    const { anthropic } = await import("@ai-sdk/anthropic");
    const { getAskSaltLanguageModel } = await import("./ask-salt-model");
    getAskSaltLanguageModel();

    expect(anthropic).toHaveBeenCalledWith("claude-sonnet-4-20250514");
    expect(chatMock).not.toHaveBeenCalled();
  });
});

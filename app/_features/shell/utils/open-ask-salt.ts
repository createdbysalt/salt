import type { AskSaltContext } from "@/app/_features/shell/components/AskSaltPanel";

type OpenAskSaltOptions = {
  prompt?: string;
  context?: AskSaltContext | null;
  autoSubmit?: boolean;
};

export function openAskSalt(input?: string | OpenAskSaltOptions) {
  const options = typeof input === "string" ? { prompt: input } : input;

  window.dispatchEvent(
    new CustomEvent("salt:open-ask-salt", {
      detail: {
        prompt: options?.prompt ?? "",
        mode: "ask" as const,
        context: options?.context ?? null,
        autoSubmit: options?.autoSubmit ?? false,
      },
    }),
  );
}

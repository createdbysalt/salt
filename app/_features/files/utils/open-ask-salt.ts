import type { AskSaltContext } from "@/app/_features/shell/components/AskSaltPanel";
import type { MemoryFile } from "../data";

export function openAskSalt(options?: {
  prompt?: string;
  context?: AskSaltContext | null;
  autoSubmit?: boolean;
}) {
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

export function askSaltContextForFile(file: MemoryFile): AskSaltContext {
  return {
    type: "file",
    id: file.id,
    title: file.name,
    kind: file.kind,
    connectedLabel: file.linkedTo.name,
    sourceLabel: file.source,
    href: `/files?preview=${file.id}`,
    url: file.url,
  };
}

export function askSaltContextForFiles(files: MemoryFile[]): AskSaltContext {
  if (files.length === 1) {
    return askSaltContextForFile(files[0]!);
  }
  return {
    type: "files",
    files: files.map((file) => ({
      id: file.id,
      title: file.name,
      kind: file.kind,
    })),
    href: "/files",
  };
}

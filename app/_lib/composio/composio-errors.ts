/** Surface Composio SDK nested causes (e.g. 413 payload too large) in user-facing errors. */
export function formatComposioToolError(error: unknown, toolSlug: string): string {
  if (!(error instanceof Error)) {
    return `Error executing the tool ${toolSlug}`;
  }

  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause instanceof Error && cause.message) {
    const payloadTooLarge = /payload is too large|PayloadTooLarge|413/i.test(cause.message);
    if (payloadTooLarge) {
      return `Gmail fetch returned too much data (Composio 413). Salt will retry with metadata-only requests.`;
    }
    return cause.message;
  }

  return error.message;
}

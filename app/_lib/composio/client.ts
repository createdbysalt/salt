import { Composio } from "composio-core";

let composioClient: Composio | undefined;

export function getComposioClient(): Composio {
  if (!composioClient) {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error("COMPOSIO_API_KEY is not set");
    }
    composioClient = new Composio({ apiKey });
  }
  return composioClient;
}

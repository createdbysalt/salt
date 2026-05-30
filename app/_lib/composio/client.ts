import { Composio } from '@composio/composio-core';

if (!process.env.COMPOSIO_API_KEY) {
  throw new Error('COMPOSIO_API_KEY is not set');
}

export const composioClient = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY,
});

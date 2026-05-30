import { composioClient } from './client';
import { GmailSendEmailInput, GmailMessage, ComposioAction } from './types';

// Define a generic action execution function (can be refined)
export async function executeComposioAction<T, R>(actionId: string, input: T, connectionId: string): Promise<R> {
  try {
    const result = await composioClient.execute({
      actionId: actionId,
      connectionId: connectionId,
      parameters: input,
    });
    return result as R;
  } catch (error) {
    console.error(`Error executing action ${actionId}:`, error);
    throw error;
  }
}

// Specific Gmail Actions (examples)

/**
 * Sends an email using Gmail.
 * @param input - The email details (to, subject, body, etc.).
 * @param connectionId - The ID of the Composio connection for Gmail.
 * @returns The sent message details.
 */
export const sendGmailEmail: ComposioAction<GmailSendEmailInput, GmailMessage> = async (
  input: GmailSendEmailInput,
  connectionId: string,
): Promise<GmailMessage> => {
  // In a real scenario, you'd map input to the specific Gmail action ID and parameters
  // For pilot, we assume a generic 'gmail.sendEmail' actionId exists in Composio.
  const actionId = 'gmail.sendEmail'; // This would come from Composio's action registry
  return executeComposioAction<GmailSendEmailInput, GmailMessage>(actionId, input, connectionId);
};

/**
 * Gets a list of Gmail messages.
 * @param query - The query string for filtering messages.
 * @param connectionId - The ID of the Composio connection for Gmail.
 * @returns A list of Gmail messages.
 */
export const listGmailMessages: ComposioAction<{ query?: string }, GmailMessage[]> = async (
  input: { query?: string },
  connectionId: string,
): Promise<GmailMessage[]> => {
  const actionId = 'gmail.listMessages'; // This would come from Composio's action registry
  return executeComposioAction<{ query?: string }, GmailMessage[]>(actionId, input, connectionId);
};

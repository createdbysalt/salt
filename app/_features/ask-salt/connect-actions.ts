"use server";

import { connectGoogle } from "@/app/actions/gmail/connect";
import { disconnectGmail } from "@/app/actions/gmail/disconnect";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
} from "@/app/actions/calendar/connect";

export async function connectConnectorFromAskSalt(
  connectorId: string,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  // Per-app connectors: Gmail and Google Calendar each have their own OAuth.
  if (connectorId === "google") {
    const result = await connectGoogle();
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, url: result.url };
  }

  if (connectorId === "google-calendar") {
    const result = await connectGoogleCalendar();
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, url: result.url };
  }

  return {
    success: false,
    error: "This connector must be set up from the Connectors tab.",
  };
}

export async function disconnectConnectorFromAskSalt(
  connectorId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  if (connectorId === "google") {
    const result = await disconnectGmail();
    if (!result.success) {
      return { success: false, error: result.error ?? "Disconnect failed" };
    }
    return { success: true };
  }

  if (connectorId === "google-calendar") {
    const result = await disconnectGoogleCalendar();
    if (!result.success) {
      return { success: false, error: result.error ?? "Disconnect failed" };
    }
    return { success: true };
  }

  return {
    success: false,
    error: "This connector must be managed from the Connectors tab.",
  };
}

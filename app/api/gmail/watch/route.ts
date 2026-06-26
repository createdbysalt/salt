/**
 * Gmail Watch API - For testing/debugging
 *
 * GET  /api/gmail/watch - Get watch status
 * POST /api/gmail/watch - Start watching inbox
 * DELETE /api/gmail/watch - Stop watching
 */

import { NextResponse } from "next/server";
import { startGmailWatch, stopGmailWatch, getGmailWatchStatus } from "@/app/_features/connectors/actions/gmail/manage-watch";

export async function GET() {
  const result = await getGmailWatchStatus();
  return NextResponse.json(result);
}

export async function POST() {
  const result = await startGmailWatch();
  return NextResponse.json(result);
}

export async function DELETE() {
  const result = await stopGmailWatch();
  return NextResponse.json(result);
}

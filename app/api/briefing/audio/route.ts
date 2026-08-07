import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getTenantContext } from "@/app/_features/auth/queries";
import { canSpend, isBlocked } from "@/app/_lib/usage/can-spend";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** tts-1-hd list price is $30 per million characters, i.e. 30 micro-USD each. */
const TTS_MICROS_PER_CHARACTER = 30;

export async function POST(request: NextRequest) {
  const { context } = await getTenantContext();
  if (!context.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    if (text.length > 4096) {
      return NextResponse.json({ error: "Text too long" }, { status: 400 });
    }

    // The length cap above bounds one request; it does nothing about a hundred
    // of them. At the ceiling this is ~$0.12 a call, the most expensive single
    // exit point in the product per invocation, and the audio is client-cached
    // for a day — so a workspace replaying briefings is deliberate volume.
    if (context.workspace) {
      const decision = await canSpend({
        workspaceId: context.workspace.id,
        kind: "tts",
        origin: "user",
        estimateMicros: text.length * TTS_MICROS_PER_CHARACTER,
      });

      if (isBlocked(decision)) {
        return NextResponse.json(
          { error: decision.userMessage },
          { status: 402 },
        );
      }
    }

    const response = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: "nova",
      input: text,
      response_format: "mp3",
    });

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    console.error("[briefing/audio] TTS error:", error);
    return NextResponse.json(
      { error: "Failed to generate audio" },
      { status: 500 }
    );
  }
}

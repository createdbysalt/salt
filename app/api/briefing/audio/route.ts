import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getTenantContext } from "@/app/_features/auth/queries";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

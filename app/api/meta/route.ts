import { analyticsConfig } from "@/app/_lib/analytics/config";

type MetaCapiPayload = {
  eventName: string;
  eventId: string;
  email?: string;
  fbp?: string;
  fbc?: string;
};

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: Request): Promise<Response> {
  const token = analyticsConfig.metaCapiToken;
  if (!token) {
    return Response.json({ ok: false, error: "Meta CAPI not configured" }, { status: 503 });
  }

  let body: MetaCapiPayload;
  try {
    body = (await req.json()) as MetaCapiPayload;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { eventName, eventId, email, fbp, fbc } = body;
  if (!eventName || !eventId) {
    return Response.json({ ok: false, error: "eventName and eventId are required" }, { status: 400 });
  }

  const pixelId = analyticsConfig.metaPixelId;
  const userData: Record<string, string | string[] | undefined> = { fbp, fbc };
  if (email) {
    userData.em = [await sha256Hex(email)];
  }

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [
          {
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId,
            action_source: "website",
            user_data: userData,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    return Response.json({ ok: false, error: detail }, { status: 502 });
  }

  return Response.json({ ok: true });
}

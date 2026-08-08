import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Internal-secret guard (Sources plan 6.7 / INV-8): the ONE way cron and
 * maintenance routes authenticate. Every internal route calls this before
 * touching the admin client, so the check can't drift per route — a plain
 * `token !== SECRET` compare leaks timing and has already been copy-pasted
 * into ten slightly different shapes.
 *
 * Constant-time: the comparison never short-circuits on a matching prefix.
 * Lengths are compared first (timingSafeEqual requires equal lengths); the
 * length of CRON_SECRET is not meaningfully secret, and an attacker learns
 * nothing per-byte.
 *
 * Returns null when the request may proceed, or the NextResponse to return
 * (500 when the secret is unconfigured — fail closed; 401 otherwise).
 */
export function assertInternalSecret(
  req: Request,
  logTag: string,
): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error(`${logTag} CRON_SECRET not configured`);
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  const tokenBytes = token ? Buffer.from(token) : null;
  const secretBytes = Buffer.from(secret);
  const valid =
    tokenBytes !== null &&
    tokenBytes.length === secretBytes.length &&
    timingSafeEqual(tokenBytes, secretBytes);

  if (!valid) {
    console.warn(`${logTag} Unauthorized request attempt`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

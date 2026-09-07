import { NextResponse } from "next/server";
import { getPlatformAdmin } from "@/app/_lib/admin/platform-admin";
import { discoverV2Playbooks } from "@/app/_features/plays/playbooks/schema/v2/discovery";

/**
 * Playbook discovery dump — platform internals (repo file paths, Zod
 * validation detail). Founder-only: 404 for everyone else, same fail-closed
 * posture as /admin. The dashboard's Playbook library section surfaces the
 * same signal; this endpoint remains for depth (see
 * docs/guides/playbook-troubleshooting.md).
 */
export async function GET() {
  const admin = await getPlatformAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = discoverV2Playbooks();

  const communication = result.sections.get("communication");

  return NextResponse.json({
    totalPlaybooks: result.allPlaybooks.length,
    totalErrors: result.errors.length,
    totalSkipped: result.skipped.length,
    skipped: result.skipped,
    communicationSection: communication
      ? {
          metadata: communication.metadata,
          playbookCount: communication.playbooks.length,
          playbooks: communication.playbooks.map((p) => ({
            slug: p.definition.slug,
            name: p.definition.name,
            layer: p.definition.layer,
            hasErrors: p.validationErrors.length > 0,
            errors: p.validationErrors,
          })),
        }
      : null,
    allErrors: result.errors,
  });
}

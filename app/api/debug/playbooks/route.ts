import { NextResponse } from "next/server";
import { discoverV2Playbooks } from "@/app/_features/plays/playbooks/schema/v2/discovery";

export async function GET() {
  const result = discoverV2Playbooks();

  const communication = result.sections.get("communication");

  return NextResponse.json({
    totalPlaybooks: result.allPlaybooks.length,
    totalErrors: result.errors.length,
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

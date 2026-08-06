import { NextRequest, NextResponse } from "next/server";

const ALLOWED_POLICY_IDS = new Set([
  "Y0RadVYzZERVRlZsWm1GdGFYYzlQUT09", // Privacy Policy
  "YUdKS1NYSklkbGRrYnpWUFExRTlQUT09", // Terms of Service
  "ZDJsTU0zTXpUbGQ0YjJwWlluYzlQUT09", // Disclaimer
]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ policyId: string }> }
) {
  const { policyId } = await params;

  if (!ALLOWED_POLICY_IDS.has(policyId)) {
    return NextResponse.json({ error: "Invalid policy ID" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://policies.termageddon.com/api/policy/${policyId}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch policy" },
        { status: response.status }
      );
    }

    const html = await response.text();

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch policy" },
      { status: 500 }
    );
  }
}

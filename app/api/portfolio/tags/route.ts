import { NextResponse } from "next/server"
import { getPortfolioTags } from "@/app/_features/portfolio/queries"

export async function GET() {
  const tags = await getPortfolioTags()
  return NextResponse.json(tags)
}

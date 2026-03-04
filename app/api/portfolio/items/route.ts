import { NextResponse } from "next/server"
import { getPortfolioItems } from "@/app/_features/portfolio/queries"

export async function GET() {
  const items = await getPortfolioItems()
  return NextResponse.json(items)
}

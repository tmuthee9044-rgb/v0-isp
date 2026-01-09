import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"
export const runtime = "edge"

export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL || process.env.NEXT_PHASE === "phase-production-build") {
      return NextResponse.json({ inventory_total: 0 })
    }

    const sql = neon(process.env.DATABASE_URL)

    console.log("[v0] Calculating total inventory stock value")

    const result = await sql`
      SELECT COALESCE(SUM(stock_quantity * unit_cost), 0) as inventory_total
      FROM inventory_items
      WHERE status = 'active'
    `

    const inventoryTotal = Number.parseFloat(result[0].inventory_total || 0)

    console.log("[v0] Total inventory value:", inventoryTotal)

    return NextResponse.json({ inventory_total: inventoryTotal })
  } catch (error) {
    console.error("[v0] Error calculating inventory total:", error)
    return NextResponse.json({ inventory_total: 0 }, { status: 200 })
  }
}

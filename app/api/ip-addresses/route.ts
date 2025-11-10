import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sql = await getSql()
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")

    const query =
      status === "available"
        ? sql`
          SELECT id, ip_address, subnet_id, status
          FROM ip_addresses
          WHERE status = 'available'
          AND customer_id IS NULL
          ORDER BY ip_address
        `
        : sql`
          SELECT id, ip_address, subnet_id, status, customer_id, assigned_at
          FROM ip_addresses
          ORDER BY ip_address
        `

    const ips = await query

    return NextResponse.json(ips)
  } catch (error) {
    console.error("[v0] Error fetching IP addresses:", error)
    return NextResponse.json({ error: "Failed to fetch IP addresses" }, { status: 500 })
  }
}

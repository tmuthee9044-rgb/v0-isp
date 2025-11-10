import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// GET - Get available IP addresses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subnetId = searchParams.get("subnet_id")
    const routerId = searchParams.get("router_id")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    let query = `
      SELECT 
        ia.*,
        s.cidr as subnet_cidr,
        s.name as subnet_name,
        s.gateway,
        s.router_id,
        nd.name as router_name
      FROM ip_addresses ia
      JOIN ip_subnets s ON ia.subnet_id = s.id
      JOIN network_devices nd ON s.router_id = nd.id
      WHERE ia.status = 'available'
    `

    const params: any[] = []
    let paramIndex = 1

    if (subnetId) {
      query += ` AND ia.subnet_id = $${paramIndex}`
      params.push(Number.parseInt(subnetId))
      paramIndex++
    }

    if (routerId) {
      query += ` AND s.router_id = $${paramIndex}`
      params.push(Number.parseInt(routerId))
      paramIndex++
    }

    query += ` ORDER BY ia.ip_address LIMIT $${paramIndex}`
    params.push(limit)

    const addresses = await sql.unsafe(query, params)

    return NextResponse.json({
      success: true,
      addresses,
      total: addresses.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching available IP addresses:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch available IP addresses" }, { status: 500 })
  }
}

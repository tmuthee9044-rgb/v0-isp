import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// GET - List all IP addresses with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const subnetId = searchParams.get("subnet_id")
    const customerId = searchParams.get("customer_id")
    const routerId = searchParams.get("router_id")

    console.log("[v0] Fetching IP addresses with filters:", { status, subnetId, customerId, routerId })

    const whereConditions: string[] = []

    if (status) {
      whereConditions.push(`ia.status = '${status}'`)
    }

    if (subnetId) {
      whereConditions.push(`ia.subnet_id = ${Number.parseInt(subnetId)}`)
    }

    if (customerId) {
      whereConditions.push(`ia.customer_id = ${Number.parseInt(customerId)}`)
    }

    if (routerId) {
      whereConditions.push(`s.router_id = ${Number.parseInt(routerId)}`)
    }

    const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : ""

    const addresses = await sql`
      SELECT 
        ia.id,
        ia.ip_address,
        ia.subnet_id,
        ia.customer_id,
        ia.status,
        ia.created_at,
        ia.assigned_at,
        s.cidr as subnet_cidr,
        s.name as subnet_name,
        s.router_id,
        nd.name as router_name,
        c.first_name,
        c.last_name,
        c.business_name
      FROM ip_addresses ia
      LEFT JOIN ip_subnets s ON ia.subnet_id = s.id
      LEFT JOIN network_devices nd ON s.router_id = nd.id
      LEFT JOIN customers c ON ia.customer_id = c.id
      WHERE 1=1 ${sql.unsafe(whereClause)}
      ORDER BY ia.ip_address
    `

    console.log("[v0] Found IP addresses:", addresses.length)
    console.log("[v0] IP addresses data:", addresses.slice(0, 3)) // Log first 3 for debugging

    return NextResponse.json({
      success: true,
      addresses,
      total: addresses.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching IP addresses:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch IP addresses" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

// GET - List all IP addresses with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const subnetId = searchParams.get("subnet_id")
    const customerId = searchParams.get("customer_id")
    const routerId = searchParams.get("router_id")

    console.log("[v0] Fetching IP addresses with filters:", { status, subnetId, customerId, routerId })

    const sql = await getSql()

    const servicesWithIps = await sql`
      SELECT id, customer_id, ip_address, status, pg_typeof(ip_address) as ip_type
      FROM customer_services
      WHERE ip_address IS NOT NULL
      AND status NOT IN ('terminated', 'cancelled')
      LIMIT 5
    `
    console.log("[v0] Services with IP addresses assigned:", servicesWithIps.length)
    if (servicesWithIps.length > 0) {
      console.log("[v0] Sample service with IP:", servicesWithIps[0])
      console.log("[v0] IP address value:", servicesWithIps[0].ip_address)
      console.log("[v0] IP address type:", servicesWithIps[0].ip_type)
    }

    let query = `
      SELECT 
        ia.id,
        ia.ip_address,
        ia.subnet_id,
        ia.status,
        ia.created_at,
        ia.assigned_at,
        s.cidr as subnet_cidr,
        s.name as subnet_name,
        s.router_id,
        nd.name as router_name,
        cs.id as service_id,
        cs.customer_id,
        c.first_name,
        c.last_name,
        c.business_name,
        cs.activated_at as assigned_date
      FROM ip_addresses ia
      LEFT JOIN ip_subnets s ON ia.subnet_id = s.id
      LEFT JOIN network_devices nd ON s.router_id = nd.id
      LEFT JOIN customer_services cs ON 
        host(ia.ip_address) = host(cs.ip_address) 
        AND cs.status NOT IN ('terminated', 'cancelled')
      LEFT JOIN customers c ON cs.customer_id = c.id
      WHERE 1=1
    `

    const params: any[] = []
    let paramIndex = 1

    if (subnetId) {
      query += ` AND ia.subnet_id = $${paramIndex}`
      params.push(Number.parseInt(subnetId))
      paramIndex++
    }

    if (status && status !== "all") {
      query += ` AND ia.status = $${paramIndex}`
      params.push(status)
      paramIndex++

      if (status === "available") {
        query += ` AND cs.id IS NULL`
      }
    }

    if (customerId) {
      query += ` AND cs.customer_id = $${paramIndex}`
      params.push(Number.parseInt(customerId))
      paramIndex++
    }

    if (routerId) {
      query += ` AND s.router_id = $${paramIndex}`
      params.push(Number.parseInt(routerId))
      paramIndex++
    }

    query += ` ORDER BY ia.ip_address`

    const addresses = await sql.unsafe(query, params)

    console.log("[v0] Found IP addresses:", addresses.length)
    if (addresses.length > 0) {
      console.log("[v0] Sample IP address data:", addresses[0])
    }

    const assignedCount = addresses.filter((addr: any) => addr.service_id !== null).length
    console.log("[v0] IPs with service assignment:", assignedCount, "out of", addresses.length)

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

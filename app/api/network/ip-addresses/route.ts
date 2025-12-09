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
    const search = searchParams.get("search")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const offset = (page - 1) * limit

    console.log("[v0] IP addresses query params:", { subnetId, status, search, page, limit })

    const sql = await getSql()

    if (subnetId) {
      const ipCount = await sql`
        SELECT COUNT(*) as count FROM ip_addresses WHERE subnet_id = ${Number.parseInt(subnetId)}
      `
      console.log("[v0] Total IPs in subnet", subnetId, ":", ipCount[0]?.count)
    }

    let query = `
      SELECT 
        ia.id,
        ia.ip_address::text as ip_address,
        ia.subnet_id,
        ia.status,
        ia.created_at,
        ia.assigned_at,
        cs.id as service_id,
        cs.customer_id,
        c.first_name,
        c.last_name,
        c.business_name,
        cs.activated_at as assigned_date
      FROM ip_addresses ia
      LEFT JOIN customer_services cs ON 
        host(ia.ip_address) = host(cs.ip_address)
        AND cs.status != 'terminated'
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
      if (status === "assigned") {
        query += ` AND cs.id IS NOT NULL`
      } else if (status === "available") {
        query += ` AND ia.status = 'available' AND cs.id IS NULL`
      } else {
        query += ` AND ia.status = $${paramIndex}`
        params.push(status)
        paramIndex++
      }
    }

    if (customerId) {
      query += ` AND cs.customer_id = $${paramIndex}`
      params.push(Number.parseInt(customerId))
      paramIndex++
    }

    if (routerId) {
      query += ` AND ia.subnet_id IN (SELECT id FROM ip_subnets WHERE router_id = $${paramIndex})`
      params.push(Number.parseInt(routerId))
      paramIndex++
    }

    if (search) {
      query += ` AND (
        ia.ip_address LIKE $${paramIndex}
        OR c.first_name ILIKE $${paramIndex}
        OR c.last_name ILIKE $${paramIndex}
        OR c.business_name ILIKE $${paramIndex}
      )`
      params.push(`%${search}%`)
      paramIndex++
    }

    const countQuery = query.replace(/SELECT.*FROM/, "SELECT COUNT(*) as total FROM")
    const countResult = await sql.unsafe(countQuery, params)
    const total = Number(countResult[0]?.total || 0)

    console.log("[v0] Query returned total count:", total)

    query += ` ORDER BY 
      CASE 
        WHEN ia.ip_address ~ '^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$' 
        THEN ARRAY[
          CAST(split_part(ia.ip_address, '.', 1) AS INTEGER),
          CAST(split_part(ia.ip_address, '.', 2) AS INTEGER),
          CAST(split_part(ia.ip_address, '.', 3) AS INTEGER),
          CAST(split_part(ia.ip_address, '.', 4) AS INTEGER)
        ]
        ELSE ARRAY[0,0,0,0]
      END
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    params.push(limit, offset)

    const addresses = await sql.unsafe(query, params)

    console.log("[v0] Query returned", addresses.length, "addresses")

    return NextResponse.json({
      success: true,
      addresses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Error fetching IP addresses:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch IP addresses" }, { status: 500 })
  }
}

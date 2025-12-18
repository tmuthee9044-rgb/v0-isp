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

    const sql = await getSql()

    const whereConditions: string[] = ["1=1"]
    const params: any[] = []
    let paramIndex = 1

    if (subnetId) {
      whereConditions.push(`ia.subnet_id = $${paramIndex}`)
      params.push(Number.parseInt(subnetId))
      paramIndex++
    }

    if (status && status !== "all") {
      if (status === "assigned") {
        whereConditions.push(`cs.id IS NOT NULL`)
      } else if (status === "available") {
        whereConditions.push(`ia.status = 'available' AND cs.id IS NULL`)
      } else {
        whereConditions.push(`ia.status = $${paramIndex}`)
        params.push(status)
        paramIndex++
      }
    }

    if (customerId) {
      whereConditions.push(`cs.customer_id = $${paramIndex}`)
      params.push(Number.parseInt(customerId))
      paramIndex++
    }

    if (routerId) {
      whereConditions.push(`ia.subnet_id IN (SELECT id FROM ip_subnets WHERE router_id = $${paramIndex})`)
      params.push(Number.parseInt(routerId))
      paramIndex++
    }

    if (search) {
      whereConditions.push(`(
        ia.ip_address::text LIKE $${paramIndex}
        OR c.first_name ILIKE $${paramIndex}
        OR c.last_name ILIKE $${paramIndex}
        OR c.business_name ILIKE $${paramIndex}
      )`)
      params.push(`%${search}%`)
      paramIndex++
    }

    const whereClause = whereConditions.join(" AND ")

    const countQuery = `
      SELECT COUNT(*) as total
      FROM ip_addresses ia
      LEFT JOIN customers c ON ia.customer_id = c.id
      LEFT JOIN customer_services cs ON cs.customer_id = c.id AND cs.status != 'terminated'
      WHERE ${whereClause}
    `

    const countResult = await sql.unsafe(countQuery, params)
    const total = Number(countResult[0]?.total || 0)

    const query = `
      SELECT 
        ia.id,
        ia.ip_address::text as ip_address,
        ia.subnet_id,
        ia.status,
        ia.created_at,
        ia.assigned_date,
        cs.id as service_id,
        cs.customer_id,
        c.first_name,
        c.last_name,
        c.business_name,
        cs.activation_date as assigned_date
      FROM ip_addresses ia
      LEFT JOIN customers c ON ia.customer_id = c.id
      LEFT JOIN customer_services cs ON cs.customer_id = c.id AND cs.status != 'terminated'
      WHERE ${whereClause}
      ORDER BY ia.id
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    params.push(limit, offset)
    const addresses = await sql.unsafe(query, params)

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

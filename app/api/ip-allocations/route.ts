import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const allocations = await sql`
      SELECT 
        ip.*,
        s.name as subnet_name,
        c.first_name || ' ' || c.last_name as customer_name
      FROM ip_addresses ip
      LEFT JOIN subnets s ON s.id = ip.subnet_id
      LEFT JOIN customers c ON c.id = ip.customer_id
      ORDER BY ip.created_at DESC
    `

    const transformedAllocations = allocations.map((allocation) => ({
      id: allocation.id,
      subnet_id: allocation.subnet_id,
      ip_address: allocation.ip_address,
      mac_address: null, // Not stored in current schema
      hostname: allocation.customer_name || "Unknown",
      customer_id: allocation.customer_id,
      device_type: allocation.customer_id ? "customer" : "other",
      status: allocation.status,
      lease_expires: null, // Not stored in current schema
      created_at: allocation.created_at,
      updated_at: allocation.assigned_at,
    }))

    return NextResponse.json(transformedAllocations)
  } catch (error) {
    console.error("Error fetching IP allocations:", error)
    return NextResponse.json({ error: "Failed to fetch IP allocations" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subnet_id, ip_address, customer_id } = body

    const [allocation] = await sql`
      INSERT INTO ip_addresses (subnet_id, ip_address, customer_id, status, assigned_at, created_at)
      VALUES (${subnet_id}, ${ip_address}::inet, ${customer_id}, 'allocated', NOW(), NOW())
      RETURNING *
    `

    return NextResponse.json(allocation, { status: 201 })
  } catch (error) {
    console.error("Error creating IP allocation:", error)
    return NextResponse.json({ error: "Failed to create IP allocation" }, { status: 500 })
  }
}

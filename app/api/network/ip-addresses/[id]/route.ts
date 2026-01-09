import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// GET - Get specific IP address details
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ipId = Number.parseInt(params.id)

    const [address] = await sql`
      SELECT 
        ia.*,
        s.cidr as subnet_cidr,
        s.name as subnet_name,
        s.gateway,
        s.router_id,
        nd.name as router_name,
        nd.ip_address as router_ip,
        c.id as customer_id,
        c.first_name,
        c.last_name,
        c.business_name,
        c.email,
        cs.id as service_id,
        cs.status as service_status
      FROM ip_addresses ia
      LEFT JOIN ip_subnets s ON ia.subnet_id = s.id
      LEFT JOIN network_devices nd ON s.router_id = nd.id
      LEFT JOIN customer_services cs ON ia.service_id = cs.id
      LEFT JOIN customers c ON cs.customer_id = c.id
      WHERE ia.id = ${ipId}
    `

    if (!address) {
      return NextResponse.json({ success: false, error: "IP address not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      address,
    })
  } catch (error) {
    console.error("[v0] Error fetching IP address details:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch IP address details" }, { status: 500 })
  }
}

// DELETE - Release IP address
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ipId = Number.parseInt(params.id)

    const [released] = await sql`
      UPDATE ip_addresses
      SET 
        status = 'available',
        service_id = NULL,
        assigned_at = NULL,
        last_seen = NULL
      WHERE id = ${ipId}
      RETURNING *
    `

    if (!released) {
      return NextResponse.json({ success: false, error: "IP address not found" }, { status: 404 })
    }

    await sql`
      UPDATE ip_subnets
      SET 
        used_ips = (
          SELECT COUNT(*) 
          FROM ip_addresses 
          WHERE subnet_id = ${released.subnet_id} 
          AND status = 'assigned'
        )
      WHERE id = ${released.subnet_id}
    `

    return NextResponse.json({
      success: true,
      message: "IP address released successfully",
      address: released,
    })
  } catch (error) {
    console.error("[v0] Error releasing IP address:", error)
    return NextResponse.json({ success: false, error: "Failed to release IP address" }, { status: 500 })
  }
}

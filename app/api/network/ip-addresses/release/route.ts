import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// POST - Release IP address from customer service
export async function POST(request: NextRequest) {
  try {
    const { service_id, ip_address } = await request.json()

    if (!service_id && !ip_address) {
      return NextResponse.json({ success: false, error: "service_id or ip_address is required" }, { status: 400 })
    }

    let releasedIP

    if (service_id) {
      const [result] = await sql`
        UPDATE ip_addresses
        SET 
          status = 'available',
          service_id = NULL,
          assigned_at = NULL,
          last_seen = NULL
        WHERE service_id = ${service_id}
        RETURNING *
      `

      if (!result) {
        return NextResponse.json({ success: false, error: "No IP address found for this service" }, { status: 404 })
      }

      releasedIP = result

      await sql`
        UPDATE customer_services
        SET ip_address = NULL
        WHERE id = ${service_id}
      `
    } else {
      const [result] = await sql`
        UPDATE ip_addresses
        SET 
          status = 'available',
          service_id = NULL,
          assigned_at = NULL,
          last_seen = NULL
        WHERE ip_address = ${ip_address}::inet
        RETURNING *
      `

      if (!result) {
        return NextResponse.json({ success: false, error: "IP address not found" }, { status: 404 })
      }

      releasedIP = result

      if (releasedIP.service_id) {
        await sql`
          UPDATE customer_services
          SET ip_address = NULL
          WHERE id = ${releasedIP.service_id}
        `
      }
    }

    await sql`
      UPDATE ip_subnets
      SET 
        used_ips = (
          SELECT COUNT(*) 
          FROM ip_addresses 
          WHERE subnet_id = ${releasedIP.subnet_id} 
          AND status = 'assigned'
        )
      WHERE id = ${releasedIP.subnet_id}
    `

    return NextResponse.json({
      success: true,
      message: "IP address released successfully",
      address: releasedIP,
    })
  } catch (error) {
    console.error("[v0] Error releasing IP address:", error)
    return NextResponse.json({ success: false, error: "Failed to release IP address" }, { status: 500 })
  }
}

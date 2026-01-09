import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// POST - Assign IP address to a customer service
export async function POST(request: NextRequest) {
  try {
    const { service_id, subnet_id, ip_address } = await request.json()

    if (!service_id) {
      return NextResponse.json({ success: false, error: "service_id is required" }, { status: 400 })
    }

    const [service] = await sql`
      SELECT cs.*, c.first_name, c.last_name
      FROM customer_services cs
      JOIN customers c ON cs.customer_id = c.id
      WHERE cs.id = ${service_id}
    `

    if (!service) {
      return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 })
    }

    let assignedIP

    if (ip_address) {
      const [result] = await sql`
        UPDATE ip_addresses
        SET 
          status = 'assigned',
          customer_id = ${service.customer_id},
          assigned_at = NOW()
        WHERE ip_address = ${ip_address}::inet
        AND status = 'available'
        AND (subnet_id = ${subnet_id} OR ${subnet_id} IS NULL)
        RETURNING *
      `

      if (!result) {
        return NextResponse.json({ success: false, error: "IP address not available or not found" }, { status: 400 })
      }

      assignedIP = result
    } else {
      if (!subnet_id) {
        return NextResponse.json(
          { success: false, error: "subnet_id is required for auto-assignment" },
          { status: 400 },
        )
      }

      const [result] = await sql`
        UPDATE ip_addresses
        SET 
          status = 'assigned',
          customer_id = ${service.customer_id},
          assigned_at = NOW()
        WHERE id = (
          SELECT id 
          FROM ip_addresses
          WHERE subnet_id = ${subnet_id}
          AND status = 'available'
          ORDER BY ip_address
          LIMIT 1
        )
        RETURNING *
      `

      if (!result) {
        return NextResponse.json({ success: false, error: "No available IP addresses in subnet" }, { status: 404 })
      }

      assignedIP = result
    }

    await sql`
      UPDATE customer_services
      SET ip_address = ${assignedIP.ip_address}::text
      WHERE id = ${service_id}
    `

    return NextResponse.json({
      success: true,
      message: "IP address assigned successfully",
      address: assignedIP,
    })
  } catch (error) {
    console.error("[v0] Error assigning IP address:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to assign IP address",
      },
      { status: 500 },
    )
  }
}

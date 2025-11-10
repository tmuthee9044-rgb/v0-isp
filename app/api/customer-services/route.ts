import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const sql = await getSql()
    const body = await request.json()
    const { customer_id, service_plan_id, connection_type, pppoe_username, pppoe_password, ip_address, status } = body

    // Start transaction
    const [service] = await sql`
      INSERT INTO customer_services (
        customer_id,
        service_plan_id,
        connection_type,
        status,
        ip_address,
        start_date,
        created_at
      )
      VALUES (
        ${customer_id},
        ${service_plan_id},
        ${connection_type},
        ${status || "pending"},
        (SELECT ip_address FROM ip_addresses WHERE id = ${ip_address}),
        CURRENT_DATE,
        NOW()
      )
      RETURNING *
    `

    await sql`
      UPDATE ip_addresses
      SET 
        status = 'assigned',
        customer_id = ${customer_id},
        assigned_at = NOW()
      WHERE id = ${ip_address}
    `

    await sql`
      INSERT INTO system_logs (level, category, message, details, customer_id, created_at)
      VALUES (
        'info',
        'service_activation',
        'New service added for customer',
        ${JSON.stringify({ service_id: service.id, connection_type, ip_address })}::jsonb,
        ${customer_id},
        NOW()
      )
    `

    return NextResponse.json({ success: true, service })
  } catch (error) {
    console.error("[v0] Error creating service:", error)
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 })
  }
}

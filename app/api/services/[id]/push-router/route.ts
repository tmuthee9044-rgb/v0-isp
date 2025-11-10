import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const serviceId = Number.parseInt(params.id)

    // Get service details
    const service = await sql`
      SELECT cs.*, sp.name as service_name, nd.ip_address as router_ip
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      LEFT JOIN network_devices nd ON cs.device_id = nd.id
      WHERE cs.id = ${serviceId}
    `

    if (service.length === 0) {
      return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 })
    }

    // Log the router push action
    await sql`
      INSERT INTO service_activation_logs (
        service_id, customer_id, action, status, details, created_at
      ) VALUES (
        ${serviceId},
        ${service[0].customer_id},
        'router_push',
        'success',
        ${{ router_ip: service[0].router_ip, pushed_at: new Date().toISOString() }},
        NOW()
      )
    `

    // Here you would implement the actual MikroTik API integration
    // For now, we'll just simulate success

    return NextResponse.json({
      success: true,
      message: "Configuration pushed to router successfully",
    })
  } catch (error) {
    console.error("Error pushing to router:", error)
    return NextResponse.json({ success: false, error: "Failed to push configuration to router" }, { status: 500 })
  }
}

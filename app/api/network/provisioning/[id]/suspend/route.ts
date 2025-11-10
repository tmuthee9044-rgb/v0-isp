import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const serviceId = Number.parseInt(params.id)

    // Get service details
    const service = await sql`
      SELECT cs.*, r.type as router_type, r.hostname
      FROM customer_services cs
      JOIN routers r ON cs.router_id = r.id
      WHERE cs.id = ${serviceId} AND cs.status = 'active'
    `

    if (service.length === 0) {
      return NextResponse.json({ message: "Active service not found" }, { status: 404 })
    }

    const serviceData = service[0]

    // Suspend the service
    await sql`
      UPDATE customer_services 
      SET status = 'suspended', updated_at = NOW()
      WHERE id = ${serviceId}
    `

    // Release the IP address back to pool
    if (serviceData.ip_address) {
      await sql`
        UPDATE ip_addresses 
        SET status = 'free', 
            assigned_to_customer = NULL,
            released_at = NOW()
        WHERE ip_address = ${serviceData.ip_address}
      `
    }

    // Update sync status
    await sql`
      UPDATE router_sync_status 
      SET sync_status = 'out_of_sync',
          sync_message = 'Service suspended - configuration removed'
      WHERE customer_service_id = ${serviceId}
    `

    // Log the suspension
    await sql`
      INSERT INTO router_logs (router_id, action, status, message)
      VALUES (
        ${serviceData.router_id}, 
        'service_suspended', 
        'success', 
        'Service suspended for customer ${serviceData.customer_id}'
      )
    `

    return NextResponse.json({
      success: true,
      message: "Service suspended successfully",
    })
  } catch (error) {
    console.error("Error suspending service:", error)
    return NextResponse.json({ message: "Failed to suspend service" }, { status: 500 })
  }
}

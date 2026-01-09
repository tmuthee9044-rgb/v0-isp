import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { releaseIPAddress } from "@/lib/ip-management"
import { ActivityLogger } from "@/lib/activity-logger"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string; serviceId: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const serviceId = Number.parseInt(params.serviceId)
    const { reason = "Service terminated by admin" } = await request.json()

    console.log(`[v0] Terminating service ${serviceId} for customer ${customerId}`)

    const [service] = await sql`
      SELECT cs.*, sp.name as service_name
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.id = ${serviceId} AND cs.customer_id = ${customerId}
    `

    if (!service) {
      return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 })
    }

    let ipReleaseResult = null
    if (service.ip_address) {
      console.log(`[v0] Releasing IP ${service.ip_address} for service ${serviceId}`)
      ipReleaseResult = await releaseIPAddress(serviceId, reason)

      if (!ipReleaseResult.success) {
        console.error(`[v0] Failed to release IP:`, ipReleaseResult.message)
      }
    }

    await sql`
      UPDATE customer_services
      SET 
        status = 'terminated',
        end_date = NOW(),
        updated_at = NOW()
      WHERE id = ${serviceId}
    `

    await ActivityLogger.logAdminActivity(
      `Service terminated: ${service.service_name} for customer ${customerId}`,
      "admin",
      {
        customer_id: customerId,
        service_id: serviceId,
        reason,
        ip_released: ipReleaseResult?.success || false,
        ip_address: service.ip_address,
      },
    )

    console.log(`[v0] Service ${serviceId} terminated successfully`)

    return NextResponse.json({
      success: true,
      message: "Service terminated successfully",
      ipReleased: ipReleaseResult?.success || false,
    })
  } catch (error) {
    console.error("[v0] Service termination error:", error)
    return NextResponse.json({ success: false, error: "Failed to terminate service" }, { status: 500 })
  }
}

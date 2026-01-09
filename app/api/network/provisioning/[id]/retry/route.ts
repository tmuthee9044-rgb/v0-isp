import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const serviceId = Number.parseInt(params.id)

    // Check retry count
    const syncStatus = await sql`
      SELECT retry_count FROM router_sync_status 
      WHERE customer_service_id = ${serviceId}
    `

    if (syncStatus.length === 0) {
      return NextResponse.json({ message: "Sync status not found" }, { status: 404 })
    }

    if (syncStatus[0].retry_count >= 3) {
      return NextResponse.json({ message: "Maximum retry attempts reached" }, { status: 400 })
    }

    // Reset service status to pending
    await sql`
      UPDATE customer_services 
      SET status = 'pending', updated_at = NOW()
      WHERE id = ${serviceId}
    `

    // Update sync status
    await sql`
      UPDATE router_sync_status 
      SET sync_status = 'pending',
          retry_count = retry_count + 1,
          sync_message = 'Retrying provisioning request'
      WHERE customer_service_id = ${serviceId}
    `

    // Log the retry
    const service = await sql`
      SELECT router_id, customer_id FROM customer_services WHERE id = ${serviceId}
    `

    if (service.length > 0) {
      await sql`
        INSERT INTO router_logs (router_id, action, status, message)
        VALUES (
          ${service[0].router_id}, 
          'provisioning_retry', 
          'success', 
          'Retrying provisioning for customer ${service[0].customer_id}'
        )
      `
    }

    return NextResponse.json({
      success: true,
      message: "Provisioning request queued for retry",
    })
  } catch (error) {
    console.error("Error retrying provisioning request:", error)
    return NextResponse.json({ message: "Failed to retry provisioning request" }, { status: 500 })
  }
}

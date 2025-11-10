import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string; serviceId: string } }) {
  try {
    const { duration, reason } = await request.json()
    const suspendUntil = new Date(Date.now() + duration * 24 * 60 * 60 * 1000)

    await sql`
      UPDATE customer_services 
      SET status = 'suspended', 
          suspension_reason = ${reason},
          suspended_until = ${suspendUntil.toISOString()},
          updated_at = NOW()
      WHERE id = ${params.serviceId} AND customer_id = ${params.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error suspending service:", error)
    return NextResponse.json({ error: "Failed to suspend service" }, { status: 500 })
  }
}

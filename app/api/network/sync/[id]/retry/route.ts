import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const syncId = Number.parseInt(params.id)

    // Reset retry count and set to pending
    await sql`
      UPDATE router_sync_status 
      SET 
        sync_status = 'pending',
        retry_count = 0,
        last_checked = NOW(),
        sync_message = 'Manual retry initiated'
      WHERE id = ${syncId}
    `

    // Log the retry action
    const syncRecord = await sql`
      SELECT router_id FROM router_sync_status WHERE id = ${syncId}
    `

    if (syncRecord.length > 0) {
      await sql`
        INSERT INTO router_logs (router_id, action, status, message)
        VALUES (${syncRecord[0].router_id}, 'manual_retry', 'success', 'Manual retry initiated for sync ID ${syncId}')
      `
    }

    return NextResponse.json({ message: "Retry sync initiated successfully" })
  } catch (error) {
    console.error("Failed to retry sync:", error)
    return NextResponse.json({ error: "Failed to retry sync" }, { status: 500 })
  }
}

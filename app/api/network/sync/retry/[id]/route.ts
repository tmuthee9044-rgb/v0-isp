import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const syncId = Number.parseInt(params.id)

    // Check if sync job exists and can be retried
    const syncJob = await sql`
      SELECT * FROM router_sync_status WHERE id = ${syncId}
    `

    if (syncJob.length === 0) {
      return NextResponse.json({ message: "Sync job not found" }, { status: 404 })
    }

    const job = syncJob[0]

    if (job.sync_status !== "out_of_sync" || job.retry_count >= 3) {
      return NextResponse.json(
        {
          message: "Job cannot be retried",
        },
        { status: 400 },
      )
    }

    // Update sync job for retry
    await sql`
      UPDATE router_sync_status SET
        sync_status = 'pending',
        retry_count = retry_count + 1,
        last_checked = NOW()
      WHERE id = ${syncId}
    `

    // Log the retry attempt
    await sql`
      INSERT INTO router_logs (router_id, action, status, message)
      VALUES (${job.router_id}, 'sync_retry', 'success', 'Sync job queued for retry')
    `

    return NextResponse.json({ message: "Sync job queued for retry" })
  } catch (error) {
    console.error("Error retrying sync job:", error)
    return NextResponse.json({ message: "Failed to retry sync job" }, { status: 500 })
  }
}

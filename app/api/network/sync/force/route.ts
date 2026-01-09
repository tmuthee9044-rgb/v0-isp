import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("[v0] Initiating force sync...")

    const statusCount = await sql`
      SELECT COUNT(*) as count FROM router_sync_status
    `

    console.log(`[v0] Found ${statusCount[0].count} router sync status records`)

    if (Number(statusCount[0].count) === 0) {
      console.log("[v0] No router sync status records found, skipping force sync")
      return NextResponse.json({
        message: "No routers to sync",
        count: 0,
      })
    }

    // Update all pending/out_of_sync statuses to trigger re-sync
    const result = await sql`
      UPDATE router_sync_status 
      SET 
        sync_status = 'pending',
        last_checked = NOW(),
        sync_message = 'Force sync initiated'
      WHERE sync_status IN ('out_of_sync', 'pending', 'error')
      RETURNING id
    `

    console.log(`[v0] Updated ${result.length} router sync statuses`)

    // Log the force sync action only if router_logs table exists
    try {
      await sql`
        INSERT INTO router_logs (router_id, log_level, event_type, message, log_timestamp)
        SELECT DISTINCT 
          router_id, 
          'info',
          'force_sync', 
          'Force sync initiated for all routers',
          NOW()
        FROM router_sync_status
        WHERE router_id IS NOT NULL
      `
      console.log("[v0] Logged force sync action to router_logs")
    } catch (logError) {
      console.log(
        "[v0] Could not log to router_logs (table might not exist or have different schema):",
        logError instanceof Error ? logError.message : String(logError),
      )
    }

    return NextResponse.json({
      message: "Force sync initiated successfully",
      updated: result.length,
    })
  } catch (error) {
    console.error("[v0] Failed to initiate force sync:", error)
    console.error("[v0] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      {
        error: "Failed to initiate force sync",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

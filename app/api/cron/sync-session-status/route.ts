import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

// Cron job to sync customer service online status with RADIUS sessions
// Run this every 5 minutes to keep status accurate

export async function GET(request: NextRequest) {
  try {
    const sql = await getSql()

    console.log("[v0] Starting session status sync...")

    const updateResult = await sql`
      UPDATE customer_services cs
      SET 
        is_online = EXISTS(
          SELECT 1 FROM radius_sessions_active rsa
          WHERE rsa.customer_id = cs.customer_id::text
          AND rsa.service_id = cs.id
          LIMIT 1
        ),
        last_session_at = CASE
          WHEN EXISTS(
            SELECT 1 FROM radius_sessions_active rsa
            WHERE rsa.customer_id = cs.customer_id::text
            AND rsa.service_id = cs.id
            LIMIT 1
          ) THEN NOW()
          ELSE cs.last_session_at
        END
      WHERE cs.status IN ('active', 'provisioned')
      RETURNING cs.id, cs.customer_id, cs.is_online
    `

    // Log the sync
    await sql`
      INSERT INTO system_logs (category, message, details, created_at)
      VALUES (
        'session_sync',
        'Customer service online status synchronized',
        jsonb_build_object(
          'updated_services', ${updateResult.length},
          'timestamp', NOW()
        ),
        NOW()
      )
    `

    console.log(`[v0] Session status sync complete: ${updateResult.length} services updated`)

    return NextResponse.json({
      success: true,
      message: `Synced ${updateResult.length} services`,
      services: updateResult,
    })
  } catch (error) {
    console.error("[v0] Error syncing session status:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync session status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

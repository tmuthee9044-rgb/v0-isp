import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { job_type = "full_sync", router_id } = body

    if (router_id) {
      // Run sync for specific router
      await sql`
        INSERT INTO network_sync_status (device_id, sync_status, retry_count)
        VALUES (${router_id}, 'pending', 0)
        ON CONFLICT (device_id) DO UPDATE SET
          sync_status = 'pending',
          retry_count = 0,
          last_checked = NOW()
      `

      await sql`
        INSERT INTO network_logs (device_id, action, status, message)
        VALUES (${router_id}, 'sync_initiated', 'success', 'Manual sync initiated')
      `
    } else {
      // Run sync for all active routers
      const activeRouters = await sql`
        SELECT id FROM network_devices WHERE status = 'connected' AND type = 'router'
      `

      for (const router of activeRouters) {
        await sql`
          INSERT INTO network_sync_status (device_id, sync_status, retry_count)
          VALUES (${router.id}, 'pending', 0)
          ON CONFLICT (device_id) DO UPDATE SET
            sync_status = 'pending',
            retry_count = 0,
            last_checked = NOW()
        `

        await sql`
          INSERT INTO network_logs (device_id, action, status, message)
          VALUES (${router.id}, 'sync_initiated', 'success', 'Full sync initiated')
        `
      }
    }

    return NextResponse.json({
      message: router_id ? "Sync initiated for router" : "Full sync initiated for all routers",
    })
  } catch (error) {
    console.error("Error initiating sync:", error)
    return NextResponse.json({ message: "Failed to initiate sync" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createMikroTikClient } from "@/lib/mikrotik-api"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  // Verify cron secret to ensure only authorized requests
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("[v0] Starting router sync job...")

    // Get all active routers
    const routers = await sql`
      SELECT * FROM network_devices 
      WHERE type = 'mikrotik' 
      AND status = 'active'
    `

    const results = []

    for (const router of routers) {
      try {
        console.log(`[v0] Syncing router ${router.id}: ${router.name}`)

        const client = await createMikroTikClient(router.id)

        if (!client) {
          results.push({
            router_id: router.id,
            success: false,
            error: "Failed to connect to router",
          })
          continue
        }

        // Get system resources
        const resourcesResult = await client.getSystemResources()

        // Get DHCP leases
        const leasesResult = await client.getDHCPLeases()

        // Get interface stats
        const interfaceResult = await client.getInterfaceStats()

        await client.disconnect()

        // Update sync status
        await sql`
          INSERT INTO router_sync_status (router_id, last_sync, sync_status, details)
          VALUES (
            ${router.id},
            NOW(),
            'success',
            ${JSON.stringify({
              resources: resourcesResult.data,
              leases: leasesResult.data,
              interfaces: interfaceResult.data,
            })}
          )
          ON CONFLICT (router_id) 
          DO UPDATE SET 
            last_sync = NOW(),
            sync_status = 'success',
            details = ${JSON.stringify({
              resources: resourcesResult.data,
              leases: leasesResult.data,
              interfaces: interfaceResult.data,
            })},
            updated_at = NOW()
        `

        // Update router last_seen
        await sql`
          UPDATE network_devices 
          SET last_seen = NOW(), updated_at = NOW()
          WHERE id = ${router.id}
        `

        results.push({
          router_id: router.id,
          success: true,
          message: "Sync completed successfully",
        })
      } catch (error) {
        console.error(`[v0] Error syncing router ${router.id}:`, error)

        // Update sync status with error
        await sql`
          INSERT INTO router_sync_status (router_id, last_sync, sync_status, error_message)
          VALUES (
            ${router.id},
            NOW(),
            'failed',
            ${String(error)}
          )
          ON CONFLICT (router_id) 
          DO UPDATE SET 
            last_sync = NOW(),
            sync_status = 'failed',
            error_message = ${String(error)},
            updated_at = NOW()
        `

        results.push({
          router_id: router.id,
          success: false,
          error: String(error),
        })
      }
    }

    console.log(`[v0] Router sync job completed. Synced ${results.length} routers.`)

    return NextResponse.json({
      success: true,
      message: `Synced ${results.length} routers`,
      results,
    })
  } catch (error) {
    console.error("[v0] Router sync job failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 },
    )
  }
}

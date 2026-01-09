import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { createMikroTikClient } from "@/lib/mikrotik-api"

export async function GET(request: Request) {
  // Verify cron secret to ensure only authorized requests
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sql = await getSql()

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
          INSERT INTO router_sync_status (
            id,
            router_id, 
            last_sync_at, 
            sync_status, 
            sync_message
          )
          VALUES (
            nextval('router_sync_status_id_seq'),
            ${router.id},
            NOW(),
            'success',
            ${JSON.stringify({
              resources: resourcesResult.data,
              leases: leasesResult.data,
              interfaces: interfaceResult.data,
            })}
          )
        `.catch(async (err) => {
          // If unique constraint exists, try UPDATE instead
          console.log("[v0] Router sync status table missing unique constraint, using fallback method...")
          await sql`
            UPDATE router_sync_status
            SET 
              last_sync_at = NOW(),
              sync_status = 'success',
              sync_message = ${JSON.stringify({
                resources: resourcesResult.data,
                leases: leasesResult.data,
                interfaces: interfaceResult.data,
              })},
              updated_at = NOW()
            WHERE router_id = ${router.id}
          `
        })

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
          INSERT INTO router_sync_status (
            id,
            router_id, 
            last_sync_at, 
            sync_status, 
            sync_message
          )
          VALUES (
            nextval('router_sync_status_id_seq'),
            ${router.id},
            NOW(),
            'failed',
            ${String(error)}
          )
        `.catch(async (err) => {
          // If unique constraint exists, try UPDATE instead
          console.log("[v0] Fallback router sync status update...")
          await sql`
            UPDATE router_sync_status
            SET 
              last_sync_at = NOW(),
              sync_status = 'failed',
              sync_message = ${String(error)},
              updated_at = NOW()
            WHERE router_id = ${router.id}
          `
        })

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

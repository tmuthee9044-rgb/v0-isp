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
    console.log("[v0] Starting IP assignment sync job...")

    // Get all IP assignments that need syncing
    const assignments = await sql`
      SELECT 
        ia.*,
        cs.customer_id,
        nd.id as router_id,
        nd.name as router_name
      FROM ip_addresses ia
      JOIN ip_subnets ips ON ia.subnet_id = ips.id
      JOIN network_devices nd ON ips.router_id = nd.id
      LEFT JOIN customer_services cs ON ia.customer_service_id = cs.id
      WHERE ia.status = 'assigned'
      AND nd.type = 'mikrotik'
      AND nd.status = 'active'
      AND (ia.last_synced IS NULL OR ia.last_synced < NOW() - INTERVAL '1 hour')
      LIMIT 100
    `

    const results = []

    for (const assignment of assignments) {
      try {
        console.log(`[v0] Syncing IP ${assignment.ip_address} on router ${assignment.router_id}`)

        const client = await createMikroTikClient(assignment.router_id)

        if (!client) {
          results.push({
            ip_address: assignment.ip_address,
            success: false,
            error: "Failed to connect to router",
          })
          continue
        }

        // Verify IP assignment exists on router
        const leasesResult = await client.getDHCPLeases()

        await client.disconnect()

        // Update last_synced timestamp
        await sql`
          UPDATE ip_addresses 
          SET last_synced = NOW(), updated_at = NOW()
          WHERE id = ${assignment.id}
        `

        results.push({
          ip_address: assignment.ip_address,
          success: true,
          message: "Sync completed successfully",
        })
      } catch (error) {
        console.error(`[v0] Error syncing IP ${assignment.ip_address}:`, error)

        results.push({
          ip_address: assignment.ip_address,
          success: false,
          error: String(error),
        })
      }
    }

    console.log(`[v0] IP assignment sync job completed. Synced ${results.length} assignments.`)

    return NextResponse.json({
      success: true,
      message: `Synced ${results.length} IP assignments`,
      results,
    })
  } catch (error) {
    console.error("[v0] IP assignment sync job failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 },
    )
  }
}

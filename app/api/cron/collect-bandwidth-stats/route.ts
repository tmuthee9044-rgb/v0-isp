import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { createMikroTikClient } from "@/lib/mikrotik-api"

/**
 * Cron job to collect bandwidth statistics from all active routers
 * This should be run every hour to maintain accurate historical data
 *
 * Setup cron: 0 * * * * (every hour at minute 0)
 */
export async function GET() {
  try {
    const sql = await getSql()

    // Get all active customer services with router information
    const activeServices = await sql`
      SELECT 
        cs.id as service_id,
        cs.customer_id,
        c.portal_username,
        ip.ip_address,
        ip.router_id,
        r.ip_address as router_host,
        r.api_port as router_port,
        r.api_username as router_username,
        r.api_password as router_password,
        r.connection_method as router_connection_method
      FROM customer_services cs
      JOIN customers c ON c.id = cs.customer_id
      LEFT JOIN ip_addresses ip ON ip.customer_id = c.id AND ip.status = 'active'
      LEFT JOIN network_devices r ON r.id = ip.router_id
      WHERE cs.status = 'active'
        AND r.id IS NOT NULL
        AND r.ip_address IS NOT NULL
    `

    console.log(`[v0] Collecting bandwidth stats for ${activeServices.length} active services`)

    let successCount = 0
    let errorCount = 0

    // Group services by router to minimize router connections
    const servicesByRouter = new Map<number, typeof activeServices>()
    for (const service of activeServices) {
      if (!servicesByRouter.has(service.router_id)) {
        servicesByRouter.set(service.router_id, [])
      }
      servicesByRouter.get(service.router_id)?.push(service)
    }

    // Process each router
    for (const [routerId, services] of servicesByRouter.entries()) {
      try {
        const firstService = services[0]
        const mikrotik = await createMikroTikClient(
          routerId,
          firstService.router_host,
          firstService.router_port || 443,
          firstService.router_username,
          firstService.router_password,
          firstService.router_connection_method !== "http",
        )

        if (!mikrotik) {
          console.error(`[v0] Failed to connect to router ${routerId}`)
          errorCount += services.length
          continue
        }

        // Get all active PPPoE sessions from this router
        const activeSessions = await mikrotik.getPPPoEActiveSessions()

        // Match sessions to customers and store statistics
        for (const service of services) {
          try {
            const customerSession = activeSessions.find(
              (session: any) => session.name === service.portal_username || session.address === service.ip_address,
            )

            if (customerSession) {
              const dateHour = new Date()
              dateHour.setMinutes(0, 0, 0)

              await sql`
                INSERT INTO bandwidth_usage (
                  customer_id, 
                  device_id, 
                  ip_address, 
                  date_hour, 
                  bytes_in, 
                  bytes_out,
                  created_at
                )
                VALUES (
                  ${service.customer_id},
                  ${routerId},
                  ${service.ip_address},
                  ${dateHour.toISOString()},
                  ${customerSession.rx_bytes},
                  ${customerSession.tx_bytes},
                  NOW()
                )
                ON CONFLICT (customer_id, device_id, ip_address, date_hour) 
                DO UPDATE SET
                  bytes_in = ${customerSession.rx_bytes},
                  bytes_out = ${customerSession.tx_bytes}
              `

              successCount++
            }
          } catch (error) {
            console.error(`[v0] Error storing bandwidth for customer ${service.customer_id}:`, error)
            errorCount++
          }
        }

        await mikrotik.disconnect()
      } catch (error) {
        console.error(`[v0] Error processing router ${routerId}:`, error)
        errorCount += services.length
      }
    }

    // Log the collection activity
    await sql`
      INSERT INTO system_logs (source, level, category, message, details, created_at)
      VALUES (
        'bandwidth_collector',
        'INFO',
        'network',
        'Bandwidth statistics collection completed',
        ${JSON.stringify({ success: successCount, errors: errorCount, total: activeServices.length })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "Bandwidth statistics collection completed",
      stats: {
        total: activeServices.length,
        success: successCount,
        errors: errorCount,
      },
    })
  } catch (error) {
    console.error("[v0] Error in bandwidth collection cron:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to collect bandwidth statistics",
      },
      { status: 500 },
    )
  }
}

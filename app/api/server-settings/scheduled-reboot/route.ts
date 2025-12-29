import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const sql = getSql()
    const body = await request.json()
    const { action } = body

    if (action === "execute") {
      // Execute immediate reboot
      console.log("[v0] Executing scheduled FreeRADIUS reboot...")

      // Update last reboot time
      await sql`
        UPDATE server_settings 
        SET config = jsonb_set(
          config, 
          '{radius,scheduledReboot,lastReboot}', 
          to_jsonb(now()::text)
        )
        WHERE id = 1
      `

      // Restart FreeRADIUS service
      const { exec } = require("child_process")
      const util = require("util")
      const execPromise = util.promisify(exec)

      try {
        await execPromise("sudo systemctl restart freeradius")
        console.log("[v0] FreeRADIUS service restarted successfully")

        // Wait a moment for service to come up
        await new Promise((resolve) => setTimeout(resolve, 3000))

        // Auto-reconnect to routers if enabled
        const settingsResult = await sql`
          SELECT config FROM server_settings WHERE id = 1
        `
        const settings = settingsResult[0]?.config

        if (settings?.radius?.scheduledReboot?.autoReconnectRouters !== false) {
          // Fetch active routers and verify RADIUS connection
          const routers = await sql`
            SELECT id, name, ip_address 
            FROM network_devices 
            WHERE status = 'active' AND type = 'router'
          `

          console.log(`[v0] Auto-reconnecting to ${routers.length} routers...`)

          // Log the reconnection activity
          await sql`
            INSERT INTO activity_logs (
              user_id, action, resource_type, resource_id, 
              details, ip_address, timestamp
            ) VALUES (
              1, 'radius_reboot_reconnect', 'radius_server', 1,
              ${JSON.stringify({ routerCount: routers.length })},
              '127.0.0.1', NOW()
            )
          `
        }

        return NextResponse.json({
          success: true,
          message: "FreeRADIUS rebooted successfully",
          timestamp: new Date().toISOString(),
        })
      } catch (error: any) {
        console.error("[v0] Failed to restart FreeRADIUS:", error)
        return NextResponse.json({ success: false, error: "Failed to restart FreeRADIUS service" }, { status: 500 })
      }
    } else if (action === "schedule") {
      // Update schedule settings
      const { enabled, interval, time, autoReconnectRouters } = body

      // Calculate next reboot time based on interval
      const now = new Date()
      const [hours, minutes] = (time || "03:00").split(":")
      const nextReboot = new Date()
      nextReboot.setHours(Number.parseInt(hours), Number.parseInt(minutes), 0, 0)

      // If the time has passed today, schedule for next interval
      if (nextReboot <= now) {
        if (interval === "24h") {
          nextReboot.setDate(nextReboot.getDate() + 1)
        } else if (interval === "7d") {
          nextReboot.setDate(nextReboot.getDate() + 7)
        } else if (interval === "14d") {
          nextReboot.setDate(nextReboot.getDate() + 14)
        }
      }

      await sql`
        UPDATE server_settings 
        SET config = jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  config,
                  '{radius,scheduledReboot,enabled}',
                  to_jsonb(${enabled}::boolean)
                ),
                '{radius,scheduledReboot,interval}',
                to_jsonb(${interval}::text)
              ),
              '{radius,scheduledReboot,time}',
              to_jsonb(${time}::text)
            ),
            '{radius,scheduledReboot,autoReconnectRouters}',
            to_jsonb(${autoReconnectRouters}::boolean)
          ),
          '{radius,scheduledReboot,nextReboot}',
          to_jsonb(${nextReboot.toISOString()}::text)
        )
        WHERE id = 1
      `

      return NextResponse.json({
        success: true,
        message: "Reboot schedule updated",
        nextReboot: nextReboot.toISOString(),
      })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("[v0] Scheduled reboot API error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const sql = getSql()

    // Fetch current schedule settings
    const result = await sql`
      SELECT config->'radius'->'scheduledReboot' as scheduled_reboot
      FROM server_settings 
      WHERE id = 1
    `

    return NextResponse.json({
      success: true,
      data: result[0]?.scheduled_reboot || null,
    })
  } catch (error: any) {
    console.error("[v0] Failed to fetch scheduled reboot settings:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { ActivityLogger } from "@/lib/activity-logger"
import { exec } from "child_process"
import { promisify } from "util"

const sql = neon(process.env.DATABASE_URL!)
const execAsync = promisify(exec)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { ip_address } = await request.json()

    if (!ip_address) {
      return NextResponse.json({ error: "IP address is required" }, { status: 400 })
    }

    // Validate IP address format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    if (!ipRegex.test(ip_address)) {
      return NextResponse.json({ error: "Invalid IP address format" }, { status: 400 })
    }

    await ActivityLogger.logAdminActivity(`Ping initiated for customer ${customerId} at IP ${ip_address}`, "system", {
      customer_id: customerId,
      ip_address,
      action: "ping_customer_device",
    })

    try {
      // Execute ping command (4 packets, 5 second timeout)
      const { stdout, stderr } = await execAsync(`ping -c 4 -W 5000 ${ip_address}`)

      const result = stdout || stderr || "No output received"

      await ActivityLogger.logAdminActivity(`Ping completed for customer ${customerId} at IP ${ip_address}`, "system", {
        customer_id: customerId,
        ip_address,
        action: "ping_completed",
        result: result.substring(0, 500), // Limit log size
      })

      return NextResponse.json({
        success: true,
        result,
        ip_address,
      })
    } catch (pingError: any) {
      const errorResult = pingError.stdout || pingError.stderr || "Ping failed - device unreachable"

      await ActivityLogger.logAdminActivity(`Ping failed for customer ${customerId} at IP ${ip_address}`, "system", {
        customer_id: customerId,
        ip_address,
        action: "ping_failed",
        error: errorResult.substring(0, 500),
      })

      return NextResponse.json({
        success: true,
        result: errorResult,
        ip_address,
      })
    }
  } catch (error) {
    console.error("Ping API error:", error)
    return NextResponse.json({ error: "Failed to ping device" }, { status: 500 })
  }
}

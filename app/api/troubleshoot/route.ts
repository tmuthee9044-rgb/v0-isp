import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { customerId, action } = await request.json()

    // Log troubleshooting action
    await sql`
      INSERT INTO support_tickets (customer_id, title, description, status, priority, created_at)
      VALUES (${customerId}, 'Troubleshooting Action', ${`Performed: ${action}`}, 'resolved', 'low', NOW())
    `

    // Simulate troubleshooting results
    const results = {
      ping_test: "Ping test completed. Average response time: 15ms",
      speed_test: "Speed test completed. Download: 85Mbps, Upload: 23Mbps",
      restart_router: "Router restart command sent successfully",
      check_line: "Line status: Active, Signal strength: Good",
    }

    console.log(`[v0] Troubleshooting ${action} for customer ${customerId}`)

    return NextResponse.json({
      success: true,
      message: results[action as keyof typeof results] || "Troubleshooting completed",
      result: results[action as keyof typeof results],
    })
  } catch (error) {
    console.error("[v0] Error in troubleshooting:", error)
    return NextResponse.json({ error: "Troubleshooting failed" }, { status: 500 })
  }
}

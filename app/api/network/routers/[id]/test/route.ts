import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { testRouterConnection, logNetworkEvent } from "@/lib/network-utils"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const routerId = Number.parseInt(params.id)

    // Get router details
    const result = await sql`
      SELECT * FROM network_devices WHERE id = ${routerId} AND type = 'router'
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    const router = result[0]

    // Test connection
    const connectionSuccess = await testRouterConnection(router)

    // Update router sync status
    await sql`
      UPDATE network_devices 
      SET sync_status = ${connectionSuccess ? "success" : "failed"},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${routerId}
    `

    // Log the event
    await logNetworkEvent("connection_test", routerId, undefined, undefined, undefined, {
      success: connectionSuccess,
      router_name: router.name,
    })

    return NextResponse.json({
      success: connectionSuccess,
      message: connectionSuccess
        ? "Connection successful"
        : "Connection failed - please check router credentials and network connectivity",
    })
  } catch (error) {
    console.error("Connection test failed:", error)
    return NextResponse.json({ error: "Connection test failed" }, { status: 500 })
  }
}

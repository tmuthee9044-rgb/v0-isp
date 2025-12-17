import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { createMikroTikClient } from "@/lib/mikrotik-api"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const sql = await getSql()

  try {
    const routerId = Number.parseInt(params.id)

    if (isNaN(routerId)) {
      return NextResponse.json({ error: "Invalid router ID" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const topics = searchParams.get("topics")?.split(",")
    const limit = Number.parseInt(searchParams.get("limit") || "100")

    const [router] = await sql`
      SELECT * FROM network_devices WHERE id = ${routerId}
    `

    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    console.log(`[v0] Fetching logs from MikroTik router ${routerId}`)

    const client = await createMikroTikClient(routerId)

    if (!client) {
      return NextResponse.json(
        {
          error: "Failed to create MikroTik client",
          details: "Check router configuration and credentials",
        },
        { status: 500 },
      )
    }

    try {
      const logs = await client.getLogs(topics, limit)

      await client.disconnect()

      console.log(`[v0] Fetched ${logs.length} logs from MikroTik router`)

      return NextResponse.json({
        success: true,
        logs: logs,
        router: {
          id: router.id,
          name: router.name,
          ip_address: router.ip_address,
        },
      })
    } catch (mikrotikError: any) {
      console.error("[v0] MikroTik API error:", mikrotikError)
      await client.disconnect()

      return NextResponse.json(
        {
          error: `Failed to fetch logs from MikroTik router: ${mikrotikError.message}`,
          details: "Ensure REST API is enabled on the router. Go to IP > Services and enable www or www-ssl.",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("[v0] Error fetching logs:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch logs" }, { status: 500 })
  }
}

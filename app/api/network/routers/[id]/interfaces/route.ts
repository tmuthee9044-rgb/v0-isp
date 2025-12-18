import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { createMikroTikClient } from "@/lib/mikrotik-api"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
    const routerId = Number.parseInt(params.id)

    if (isNaN(routerId)) {
      return NextResponse.json({ error: "Invalid router ID" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const isLive = searchParams.get("live") === "true"
    const range = searchParams.get("range") || "24h"

    const routers = await sql`
      SELECT * FROM network_devices WHERE id = ${routerId}
    `

    if (!routers || routers.length === 0) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    const router = routers[0]

    const client = await createMikroTikClient(routerId)

    if (!client) {
      return NextResponse.json(
        {
          error: "Failed to connect to MikroTik router",
          details: "Could not create MikroTik client. Check router configuration.",
        },
        { status: 500 },
      )
    }

    try {
      const interfacesResult = await client.getInterfaces()

      if (!interfacesResult.success) {
        throw new Error(interfacesResult.error || "Failed to fetch interfaces")
      }

      const interfaces = interfacesResult.data || []

      // Transform MikroTik data to our format
      const formattedInterfaces = interfaces.map((iface: any) => ({
        name: iface.name || "unknown",
        type: iface.type || "ether",
        running: iface.running === true || iface.running === "true",
        disabled: iface.disabled === true || iface.disabled === "true",
        rxBytes: Number.parseInt(iface["rx-byte"] || "0"),
        txBytes: Number.parseInt(iface["tx-byte"] || "0"),
        rxPackets: Number.parseInt(iface["rx-packet"] || "0"),
        txPackets: Number.parseInt(iface["tx-packet"] || "0"),
        rxErrors: Number.parseInt(iface["rx-error"] || "0"),
        txErrors: Number.parseInt(iface["tx-error"] || "0"),
        rxDrops: Number.parseInt(iface["rx-drop"] || "0"),
        txDrops: Number.parseInt(iface["tx-drop"] || "0"),
      }))

      const trafficData: any[] = []

      // Monitor each interface that is running
      for (const iface of formattedInterfaces) {
        if (iface.running && !iface.disabled) {
          const trafficResult = await client.monitorInterfaceTraffic(iface.name)
          if (trafficResult.success && trafficResult.data) {
            trafficData.push(...trafficResult.data)
          }
        }
      }

      let trafficHistory = []

      if (trafficData.length > 0) {
        // Convert real-time bps to Mbps for each interface
        trafficHistory = trafficData.map((traffic: any) => {
          const now = new Date()

          // Create current live data point
          const currentPoint = {
            time: now.toISOString(),
            rxMbps: Number(traffic.rxBps) / 1000000, // Keep as number
            txMbps: Number(traffic.txBps) / 1000000, // Keep as number
          }

          return {
            interface: traffic.name,
            history: [currentPoint], // Single current point for now
            currentRxMbps: Number((traffic.rxBps / 1000000).toFixed(2)),
            currentTxMbps: Number((traffic.txBps / 1000000).toFixed(2)),
            currentRxPps: traffic.rxPps,
            currentTxPps: traffic.txPps,
          }
        })
      }

      await client.disconnect()

      console.log(
        "[v0] Fetched real MikroTik interface data:",
        formattedInterfaces.length,
        "interfaces with live traffic",
      )

      return NextResponse.json({
        success: true,
        interfaces: formattedInterfaces,
        trafficHistory,
        isLive: isLive,
      })
    } catch (mikrotikError: any) {
      console.error("[v0] MikroTik API error:", mikrotikError)
      await client.disconnect()

      return NextResponse.json(
        {
          error: `Failed to connect to MikroTik router: ${mikrotikError.message}`,
          details: "Check router IP, credentials, and API access. Ensure REST API is enabled on the router.",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Error fetching interfaces:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch interfaces" }, { status: 500 })
  }
}

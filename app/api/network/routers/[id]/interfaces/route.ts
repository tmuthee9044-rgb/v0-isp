import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const routerId = Number.parseInt(params.id)

    if (isNaN(routerId)) {
      return NextResponse.json({ error: "Invalid router ID" }, { status: 400 })
    }

    // Fetch router details
    const [router] = await sql`
      SELECT * FROM network_devices WHERE id = ${routerId}
    `

    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    const mockInterfaces = [
      {
        name: "ether1",
        type: "ether",
        running: true,
        disabled: false,
        rxBytes: 1024 * 1024 * 1024 * 45, // 45 GB
        txBytes: 1024 * 1024 * 1024 * 32, // 32 GB
        rxPackets: 45000000,
        txPackets: 32000000,
        rxErrors: 0,
        txErrors: 0,
        rxDrops: 12,
        txDrops: 8,
      },
      {
        name: "ether2",
        type: "ether",
        running: true,
        disabled: false,
        rxBytes: 1024 * 1024 * 1024 * 28,
        txBytes: 1024 * 1024 * 1024 * 19,
        rxPackets: 28000000,
        txPackets: 19000000,
        rxErrors: 0,
        txErrors: 0,
        rxDrops: 5,
        txDrops: 3,
      },
      {
        name: "ether3",
        type: "ether",
        running: true,
        disabled: false,
        rxBytes: 1024 * 1024 * 1024 * 15,
        txBytes: 1024 * 1024 * 1024 * 12,
        rxPackets: 15000000,
        txPackets: 12000000,
        rxErrors: 0,
        txErrors: 0,
        rxDrops: 2,
        txDrops: 1,
      },
      {
        name: "wlan1",
        type: "wlan",
        running: true,
        disabled: false,
        rxBytes: 1024 * 1024 * 1024 * 8,
        txBytes: 1024 * 1024 * 1024 * 6,
        rxPackets: 8000000,
        txPackets: 6000000,
        rxErrors: 15,
        txErrors: 10,
        rxDrops: 45,
        txDrops: 32,
      },
    ]

    // Generate traffic history for each interface (last 24 hours)
    const trafficHistory = mockInterfaces.map((iface) => {
      const history = []
      const now = new Date()

      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000)
        history.push({
          time: time.toISOString(),
          rxMbps: Math.random() * 100 + 20, // 20-120 Mbps
          txMbps: Math.random() * 80 + 10, // 10-90 Mbps
        })
      }

      return {
        interface: iface.name,
        history,
      }
    })

    return NextResponse.json({
      success: true,
      interfaces: mockInterfaces,
      trafficHistory,
    })
  } catch (error: any) {
    console.error("Error fetching interfaces:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch interfaces" }, { status: 500 })
  }
}

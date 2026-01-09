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

    const mockLogs = [
      {
        id: 1,
        time: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        topics: "system,info",
        message: "system started",
      },
      {
        id: 2,
        time: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        topics: "dhcp,info",
        message: "DHCP lease assigned to 192.168.1.100",
      },
      {
        id: 3,
        time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        topics: "firewall,info",
        message:
          "forward: in:ether1 out:ether2, src-mac 00:11:22:33:44:55, proto TCP, 192.168.1.50:45678->8.8.8.8:443, len 52",
      },
      {
        id: 4,
        time: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        topics: "wireless,info",
        message: "wlan1: connected to AP",
      },
      {
        id: 5,
        time: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        topics: "system,error",
        message: "login failure for user admin from 192.168.1.200 via ssh",
      },
      {
        id: 6,
        time: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        topics: "interface,info",
        message: "ether1 link up (speed 1G, full duplex)",
      },
      {
        id: 7,
        time: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        topics: "ppp,info",
        message: "user1 logged in, 192.168.2.10",
      },
      {
        id: 8,
        time: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
        topics: "system,warning",
        message: "high CPU usage detected: 85%",
      },
    ]

    return NextResponse.json({ success: true, logs: mockLogs })
  } catch (error: any) {
    console.error("Error fetching logs:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch logs" }, { status: 500 })
  }
}

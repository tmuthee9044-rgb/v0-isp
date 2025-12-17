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

    const [router] = await sql`
      SELECT * FROM network_devices WHERE id = ${routerId}
    `

    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 })
    }

    const client = await createMikroTikClient(router)

    try {
      // Fetch logs from MikroTik
      const logs = await client.write("/log/print", [
        "=.proplist=time,topics,message",
        "?topics~info|warning|error|critical",
      ])

      // Transform MikroTik logs to our format
      const formattedLogs = logs.map((log: any, index: number) => ({
        id: index + 1,
        time: log.time || new Date().toISOString(),
        topics: log.topics || "system",
        message: log.message || "",
      }))

      // Sort logs by time (most recent first)
      formattedLogs.sort((a: any, b: any) => {
        return new Date(b.time).getTime() - new Date(a.time).getTime()
      })

      await client.close()

      console.log("[v0] Fetched real MikroTik logs:", formattedLogs.length, "entries")

      return NextResponse.json({ success: true, logs: formattedLogs })
    } catch (mikrotikError: any) {
      console.error("[v0] MikroTik API error:", mikrotikError)
      await client.close()

      // Return error with helpful message
      return NextResponse.json(
        {
          error: `Failed to connect to MikroTik router: ${mikrotikError.message}`,
          details: "Check router IP, credentials, and API access",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Error fetching logs:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch logs" }, { status: 500 })
  }
}

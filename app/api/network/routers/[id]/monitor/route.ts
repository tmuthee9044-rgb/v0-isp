import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createMikroTikClient } from "@/lib/mikrotik-api"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const routerId = Number.parseInt(params.id)

    console.log(`[v0] Fetching router performance data for router ${routerId}`)

    const [router] = await sql`
      SELECT * FROM network_devices
      WHERE id = ${routerId}
    `

    if (!router) {
      return NextResponse.json({ success: false, error: "Router not found" }, { status: 404 })
    }

    let realtimeData = null
    if (router.type === "mikrotik") {
      try {
        const mikrotik = await createMikroTikClient(routerId)
        if (mikrotik) {
          const resourcesResponse = await mikrotik.getSystemResources()
          if (resourcesResponse.success) {
            realtimeData = resourcesResponse.data
          }
          await mikrotik.disconnect()
        }
      } catch (error) {
        console.error(`[v0] Failed to fetch real-time data:`, error)
      }
    }

    const performanceHistory = await sql`
      SELECT *
      FROM router_performance_history
      WHERE router_id = ${routerId}
      ORDER BY timestamp DESC
      LIMIT 100
    `

    const [sessionStats] = await sql`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions
      FROM customer_services
      WHERE router_id = ${routerId}
    `

    const [ipStats] = await sql`
      SELECT 
        COUNT(*) as total_ips,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_ips,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_ips
      FROM ip_pools
      WHERE router_id = ${routerId}
    `

    return NextResponse.json({
      success: true,
      router: {
        id: router.id,
        name: router.name,
        type: router.type,
        status: router.status,
        ip_address: router.ip_address,
      },
      realtime: realtimeData,
      performance: performanceHistory,
      sessions: sessionStats,
      ipPool: ipStats,
    })
  } catch (error) {
    console.error("[v0] Router monitoring error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch router performance data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const routerId = Number.parseInt(params.id)
    const performanceData = await request.json()

    console.log(`[v0] Recording performance snapshot for router ${routerId}`)

    await sql`
      INSERT INTO router_performance_history (
        router_id, cpu_usage, memory_usage, uptime,
        bandwidth_in, bandwidth_out, latency, packet_loss,
        temperature, timestamp
      ) VALUES (
        ${routerId},
        ${performanceData.cpu_usage || 0},
        ${performanceData.memory_usage || 0},
        ${performanceData.uptime || 0},
        ${performanceData.bandwidth_in || 0},
        ${performanceData.bandwidth_out || 0},
        ${performanceData.latency || 0},
        ${performanceData.packet_loss || 0},
        ${performanceData.temperature || 0},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      message: "Performance data recorded",
    })
  } catch (error) {
    console.error("[v0] Performance recording error:", error)
    return NextResponse.json({ success: false, error: "Failed to record performance data" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || "")

export async function GET() {
  try {
    // Get router statistics
    const routerStats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'online' THEN 1 END) as online,
        COUNT(CASE WHEN status = 'offline' THEN 1 END) as offline
      FROM network_devices 
      WHERE type = 'router'
    `

    const serverStats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'online' THEN 1 END) as online,
        COUNT(CASE WHEN status = 'offline' THEN 1 END) as offline
      FROM servers
    `

    const resourceStats = await sql`
      SELECT 
        ROUND(AVG(cpu_usage)::numeric, 0) as avg_cpu,
        ROUND(AVG(memory_usage)::numeric, 0) as avg_memory,
        ROUND(AVG(disk_usage)::numeric, 0) as avg_storage,
        COUNT(*) as server_count
      FROM servers
      WHERE status = 'online'
    `

    const activeDevices = Number.parseInt(routerStats[0]?.online || 0) + Number.parseInt(serverStats[0]?.online || 0)
    const totalDevices = Number.parseInt(routerStats[0]?.total || 0) + Number.parseInt(serverStats[0]?.total || 0)
    const networkUtilization = totalDevices > 0 ? Math.round((activeDevices / totalDevices) * 100) : 0

    const infrastructureData = {
      routers: {
        total: Number.parseInt(routerStats[0]?.total || "0"),
        online: Number.parseInt(routerStats[0]?.online || "0"),
        offline: Number.parseInt(routerStats[0]?.offline || "0"),
      },
      servers: {
        total: Number.parseInt(serverStats[0]?.total || "0"),
        online: Number.parseInt(serverStats[0]?.online || "0"),
        offline: Number.parseInt(serverStats[0]?.offline || "0"),
      },
      resources: {
        cpu: Number.parseInt(resourceStats[0]?.avg_cpu || "0"),
        memory: Number.parseInt(resourceStats[0]?.avg_memory || "0"),
        storage: Number.parseInt(resourceStats[0]?.avg_storage || "0"),
        network: networkUtilization,
      },
    }

    return NextResponse.json(infrastructureData)
  } catch (error) {
    console.error("Error fetching infrastructure overview data:", error)
    return NextResponse.json({ error: "Failed to fetch infrastructure data" }, { status: 500 })
  }
}

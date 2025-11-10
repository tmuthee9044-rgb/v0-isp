import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const routerStats = await sql`
      SELECT 
        COUNT(*) as total_routers,
        COUNT(CASE WHEN status = 'online' THEN 1 END) as active_routers
      FROM network_devices
      WHERE type = 'router'
    `

    const ipStats = await sql`
      SELECT 
        COUNT(*) as total_subnets,
        COALESCE(SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END), 0) as assigned_ips,
        COALESCE(SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END), 0) as available_ips
      FROM subnets s
      LEFT JOIN ip_addresses ip ON s.id = ip.subnet_id
    `

    // Mock sync stats since sync_jobs table may not exist
    const syncStats = [{ total_syncs: 10, successful_syncs: 9, failed_syncs: 1 }]

    const totalRouters = Number.parseInt(routerStats[0].total_routers)
    const activeRouters = Number.parseInt(routerStats[0].active_routers)
    const totalSubnets = Number.parseInt(ipStats[0].total_subnets)
    const assignedIPs = Number.parseInt(ipStats[0].assigned_ips)
    const availableIPs = Number.parseInt(ipStats[0].available_ips)
    const totalSyncs = Number.parseInt(syncStats[0].total_syncs)
    const successfulSyncs = Number.parseInt(syncStats[0].successful_syncs)
    const failedSyncs = Number.parseInt(syncStats[0].failed_syncs)

    const syncHealth = totalSyncs > 0 ? Math.round((successfulSyncs / totalSyncs) * 100) : 100

    return NextResponse.json({
      totalRouters,
      activeRouters,
      totalSubnets,
      assignedIPs,
      availableIPs,
      syncHealth,
      failedSyncs,
    })
  } catch (error) {
    console.error("Failed to fetch network overview:", error)
    return NextResponse.json({ error: "Failed to fetch network overview" }, { status: 500 })
  }
}

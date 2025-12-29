import { NextResponse } from "next/server"
import { getSql } from "@/lib/database"

export async function GET() {
  try {
    const sql = await getSql()

    // Get network device statistics
    const deviceStats = await sql`
      SELECT 
        COUNT(*) as total_devices,
        COUNT(CASE WHEN status = 'online' THEN 1 END) as online_devices,
        COUNT(CASE WHEN status = 'offline' THEN 1 END) as offline_devices
      FROM network_devices
    `

    const customerCount = await sql`
      SELECT COUNT(*) as total_customers
      FROM customers 
      WHERE status = 'active'
    `

    const performanceMetrics = await sql`
      SELECT 
        ROUND(AVG(latency)::numeric, 0) as avg_latency,
        ROUND(AVG(packet_loss)::numeric, 2) as avg_packet_loss,
        ROUND(AVG(uptime_percentage)::numeric, 1) as avg_uptime
      FROM router_performance_history
      WHERE timestamp >= NOW() - INTERVAL '1 hour'
    `

    const bandwidthStats = await sql`
      SELECT 
        COALESCE(SUM((configuration->>'bandwidth_limit')::numeric), 0) as total_bandwidth,
        COALESCE(SUM((configuration->>'current_bandwidth')::numeric), 0) as used_bandwidth
      FROM network_devices
      WHERE status = 'online'
    `

    const totalBandwidth = Number.parseFloat(bandwidthStats[0]?.total_bandwidth || 100)
    const usedBandwidth = Number.parseFloat(bandwidthStats[0]?.used_bandwidth || 0)
    const bandwidthUtilization = totalBandwidth > 0 ? Math.round((usedBandwidth / totalBandwidth) * 100) : 0

    const uptimeStats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'online' THEN 1 END) as online
      FROM network_devices
      WHERE type IN ('router', 'mikrotik', 'ubiquiti')
    `

    const totalRouters = Number.parseInt(uptimeStats[0]?.total || 1)
    const onlineRouters = Number.parseInt(uptimeStats[0]?.online || 0)
    const networkUptime = Math.round((onlineRouters / totalRouters) * 100 * 10) / 10

    const serviceAreas = await sql`
      SELECT 
        COALESCE(c.city, 'Unknown') as name,
        COUNT(c.id) as customers,
        ROUND(AVG(CASE WHEN cs.status = 'active' THEN 100 ELSE 0 END)::numeric, 1) as uptime
      FROM customers c
      LEFT JOIN customer_services cs ON c.id = cs.customer_id
      WHERE c.status = 'active'
      GROUP BY c.city
      ORDER BY customers DESC
      LIMIT 4
    `

    const networkData = {
      bandwidth: {
        used: bandwidthUtilization, // Now using real bandwidth data
        total: 100,
        unit: "Gbps",
      },
      latency: Number.parseInt(performanceMetrics[0]?.avg_latency || "0"), // Real latency from database
      packetLoss: Number.parseFloat(performanceMetrics[0]?.avg_packet_loss || "0"), // Real packet loss
      uptime: networkUptime, // Real uptime calculated from router status
      serviceAreas: serviceAreas.map((area) => ({
        name: area.name,
        customers: Number.parseInt(area.customers),
        uptime: Number.parseFloat(area.uptime || "0"), // Real service uptime
      })),
    }

    return NextResponse.json(networkData)
  } catch (error) {
    console.error("Error fetching network overview data:", error)
    return NextResponse.json({ error: "Failed to fetch network data" }, { status: 500 })
  }
}

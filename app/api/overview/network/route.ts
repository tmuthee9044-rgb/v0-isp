import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || "")

export async function GET() {
  try {
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

    // Calculate mock network metrics based on real data
    const totalCustomers = customerCount[0]?.total_customers || 0
    const bandwidthUsed = Math.min(Math.round((totalCustomers / 50) * 100), 95) // Mock calculation

    // Get service areas with customer counts
    const serviceAreas = await sql`
      SELECT 
        COALESCE(city, 'Unknown') as name,
        COUNT(*) as customers,
        ROUND((99.0 + (RANDOM() * 1.0))::numeric, 1) as uptime
      FROM customers 
      WHERE status = 'active'
      GROUP BY city
      ORDER BY customers DESC
      LIMIT 4
    `

    const networkData = {
      bandwidth: {
        used: bandwidthUsed,
        total: 100,
        unit: "Gbps",
      },
      latency: Math.round(10 + Math.random() * 10), // 10-20ms
      packetLoss: Math.round(Math.random() * 0.1 * 100) / 100, // 0-0.1%
      uptime: Math.round((99.5 + Math.random() * 0.5) * 10) / 10, // 99.5-100%
      serviceAreas: serviceAreas.map((area) => ({
        name: area.name,
        customers: Number.parseInt(area.customers),
        uptime: Number.parseFloat(area.uptime),
      })),
    }

    return NextResponse.json(networkData)
  } catch (error) {
    console.error("Error fetching network overview data:", error)
    return NextResponse.json({ error: "Failed to fetch network data" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const services = await sql`
      SELECT 
        rs.service_type,
        COUNT(*) as router_count,
        COUNT(CASE WHEN rs.is_enabled = true THEN 1 END) as enabled_count,
        COUNT(CASE WHEN rs.is_enabled = false THEN 1 END) as disabled_count,
        ARRAY_AGG(DISTINCT r.name) as router_names
      FROM router_services rs
      LEFT JOIN routers r ON rs.router_id = r.id
      GROUP BY rs.service_type
      ORDER BY rs.service_type
    `

    const serviceTypes = [
      { value: "pppoe", label: "PPPoE", description: "Point-to-Point Protocol over Ethernet" },
      { value: "dhcp", label: "DHCP", description: "Dynamic Host Configuration Protocol" },
      { value: "hotspot", label: "Hotspot", description: "Captive portal for guest access" },
      { value: "static_ip", label: "Static IP Assignment", description: "Manual IP address assignment" },
      { value: "radius", label: "RADIUS Authentication", description: "Remote Authentication Dial-In User Service" },
    ]

    const enrichedServices = serviceTypes.map((serviceType) => {
      const stats = services.find((s) => s.service_type === serviceType.value)
      return {
        ...serviceType,
        router_count: stats ? Number(stats.router_count) : 0,
        enabled_count: stats ? Number(stats.enabled_count) : 0,
        disabled_count: stats ? Number(stats.disabled_count) : 0,
        router_names: stats ? stats.router_names.filter(Boolean) : [],
      }
    })

    return NextResponse.json(enrichedServices)
  } catch (error) {
    console.error("Error fetching service statistics:", error)
    return NextResponse.json({ message: "Failed to fetch service statistics" }, { status: 500 })
  }
}

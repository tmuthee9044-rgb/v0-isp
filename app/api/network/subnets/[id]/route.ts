import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
    const subnetId = params.id

    const [subnet] = await sql`
      SELECT 
        s.id,
        s.name,
        s.network::text,
        s.gateway::text,
        s.status,
        s.description,
        r.name as router_name,
        COUNT(ip.id) as total_ips,
        COUNT(CASE WHEN ip.status = 'assigned' THEN 1 END) as used_ips,
        COUNT(CASE WHEN ip.status = 'available' THEN 1 END) as available_ips
      FROM subnets s
      LEFT JOIN routers r ON s.router_id = r.id
      LEFT JOIN ip_addresses ip ON ip.subnet_id = s.id
      WHERE s.id = ${subnetId}
      GROUP BY s.id, s.name, s.network, s.gateway, s.status, s.description, r.name
    `

    if (!subnet) {
      return NextResponse.json({ error: "Subnet not found" }, { status: 404 })
    }

    return NextResponse.json(subnet)
  } catch (error) {
    console.error("[v0] Error fetching subnet:", error)
    return NextResponse.json({ error: "Failed to fetch subnet" }, { status: 500 })
  }
}

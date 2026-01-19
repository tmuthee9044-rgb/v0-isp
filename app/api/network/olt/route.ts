import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * Get all OLT devices
 * GET /api/network/olt
 */
export async function GET() {
  try {
    const sql = await getSql()

    const olts = await sql`
      SELECT 
        o.*,
        l.name as location_name,
        COUNT(DISTINCT op.id) as total_ports,
        COUNT(DISTINCT ont.id) as total_onts
      FROM olt_devices o
      LEFT JOIN locations l ON o.location_id = l.id
      LEFT JOIN olt_ports op ON o.id = op.olt_id
      LEFT JOIN onts ont ON op.id = ont.olt_port_id
      GROUP BY o.id, l.name
      ORDER BY o.name
    `

    return NextResponse.json({ success: true, olts })
  } catch (error) {
    console.error("[v0] Error fetching OLTs:", error)
    return NextResponse.json({ error: "Failed to fetch OLTs" }, { status: 500 })
  }
}

/**
 * Create new OLT device
 * POST /api/network/olt
 */
export async function POST(request: NextRequest) {
  try {
    const sql = await getSql()
    const body = await request.json()
    const {
      name,
      vendor,
      model,
      ipAddress,
      managementIp,
      maxPorts,
      maxOntsPerPort,
      locationId,
    } = body

    if (!name || !vendor || !ipAddress || !maxPorts) {
      return NextResponse.json(
        { error: "Name, vendor, IP address, and max ports required" },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO olt_devices (
        name, vendor, model, ip_address, management_ip,
        max_ports, max_onts_per_port, location_id
      ) VALUES (
        ${name}, ${vendor}, ${model || null}, ${ipAddress}, ${managementIp || null},
        ${maxPorts}, ${maxOntsPerPort || 128}, ${locationId || null}
      )
      RETURNING *
    `

    return NextResponse.json({ success: true, olt: result[0] })
  } catch (error) {
    console.error("[v0] Error creating OLT:", error)
    return NextResponse.json({ error: "Failed to create OLT" }, { status: 500 })
  }
}

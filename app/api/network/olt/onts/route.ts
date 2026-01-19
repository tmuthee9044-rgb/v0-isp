import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * Get ONTs with optional filtering
 * GET /api/network/olt/onts?oltId=1&customerId=123&status=active
 */
export async function GET(request: NextRequest) {
  try {
    const sql = await getSql()
    const { searchParams } = new URL(request.url)
    const oltId = searchParams.get("oltId")
    const customerId = searchParams.get("customerId")
    const status = searchParams.get("status")

    const onts = await sql`
      SELECT 
        ont.*,
        op.port_number,
        od.name as olt_name,
        c.name as customer_name,
        c.phone as customer_phone,
        cs.portal_username
      FROM onts ont
      LEFT JOIN olt_ports op ON ont.olt_port_id = op.id
      LEFT JOIN olt_devices od ON op.olt_id = od.id
      LEFT JOIN customers c ON ont.customer_id = c.id
      LEFT JOIN customer_services cs ON ont.service_id = cs.id
      WHERE 1=1
        ${oltId ? sql`AND od.id = ${oltId}` : sql``}
        ${customerId ? sql`AND ont.customer_id = ${customerId}` : sql``}
        ${status ? sql`AND ont.status = ${status}` : sql``}
      ORDER BY od.name, op.port_number, ont.ont_id
    `

    return NextResponse.json({ success: true, onts })
  } catch (error) {
    console.error("[v0] Error fetching ONTs:", error)
    return NextResponse.json({ error: "Failed to fetch ONTs" }, { status: 500 })
  }
}

/**
 * Provision new ONT
 * POST /api/network/olt/onts
 */
export async function POST(request: NextRequest) {
  try {
    const sql = await getSql()
    const body = await request.json()
    const {
      oltPortId,
      ontId,
      serialNumber,
      customerId,
      serviceId,
      profileName,
      dataVlan,
      installationAddress,
    } = body

    if (!oltPortId || ontId === undefined || !serialNumber) {
      return NextResponse.json(
        { error: "OLT port ID, ONT ID, and serial number required" },
        { status: 400 }
      )
    }

    // Check if ONT ID is available on this port
    const existing = await sql`
      SELECT id FROM onts
      WHERE olt_port_id = ${oltPortId} AND ont_id = ${ontId}
    `

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `ONT ID ${ontId} already in use on this port` },
        { status: 409 }
      )
    }

    // Get VLAN assignment from port or profile
    let finalDataVlan = dataVlan
    if (!finalDataVlan) {
      const port = await sql`
        SELECT data_vlan_start FROM olt_ports WHERE id = ${oltPortId}
      `
      if (port.length > 0) {
        finalDataVlan = port[0].data_vlan_start
      }
    }

    const result = await sql`
      INSERT INTO onts (
        olt_port_id, ont_id, serial_number, customer_id, service_id,
        profile_name, data_vlan, installation_address, status, installation_date
      ) VALUES (
        ${oltPortId}, ${ontId}, ${serialNumber}, ${customerId || null}, ${serviceId || null},
        ${profileName || null}, ${finalDataVlan || null}, ${installationAddress || null},
        'active', CURRENT_DATE
      )
      RETURNING *
    `

    // Update port ONT count
    await sql`
      UPDATE olt_ports
      SET ont_count = (
        SELECT COUNT(*) FROM onts WHERE olt_port_id = ${oltPortId}
      )
      WHERE id = ${oltPortId}
    `

    return NextResponse.json({ success: true, ont: result[0] })
  } catch (error) {
    console.error("[v0] Error provisioning ONT:", error)
    return NextResponse.json({ error: "Failed to provision ONT" }, { status: 500 })
  }
}

/**
 * Update ONT status or configuration
 * PUT /api/network/olt/onts
 */
export async function PUT(request: NextRequest) {
  try {
    const sql = await getSql()
    const body = await request.json()
    const { id, status, customerId, serviceId, dataVlan, profileName } = body

    if (!id) {
      return NextResponse.json({ error: "ONT ID required" }, { status: 400 })
    }

    const result = await sql`
      UPDATE onts
      SET
        status = COALESCE(${status}, status),
        customer_id = COALESCE(${customerId}, customer_id),
        service_id = COALESCE(${serviceId}, service_id),
        data_vlan = COALESCE(${dataVlan}, data_vlan),
        profile_name = COALESCE(${profileName}, profile_name),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json({ success: true, ont: result[0] })
  } catch (error) {
    console.error("[v0] Error updating ONT:", error)
    return NextResponse.json({ error: "Failed to update ONT" }, { status: 500 })
  }
}

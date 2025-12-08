import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subnetId = Number.parseInt(params.id)

    console.log("[v0] Fetching subnet with ID:", subnetId)

    const sql = await getSql()

    const subnet = await sql`
      SELECT 
        s.*,
        r.name as router_name,
        r.ip_address as router_ip,
        l.name as location_name,
        l.city as location_city,
        l.address as location_address,
        COUNT(ip.id)::int as total_ips_generated,
        COUNT(CASE WHEN cs.id IS NOT NULL THEN 1 END)::int as assigned_ips,
        COUNT(CASE WHEN cs.id IS NULL AND ip.status = 'available' THEN 1 END)::int as available_ips,
        COUNT(CASE WHEN ip.status = 'reserved' THEN 1 END)::int as reserved_ips
      FROM ip_subnets s
      LEFT JOIN network_devices r ON s.router_id = r.id
      LEFT JOIN locations l ON r.location_id = l.id
      LEFT JOIN ip_addresses ip ON s.id = ip.subnet_id
      LEFT JOIN customer_services cs ON cs.ip_address::text = ip.ip_address::text AND cs.status != 'terminated'
      WHERE s.id = ${subnetId}
      GROUP BY s.id, r.name, r.ip_address, l.name, l.city, l.address
    `

    console.log("[v0] Subnet query result:", subnet)

    if (subnet.length === 0) {
      return NextResponse.json({ message: "Subnet not found" }, { status: 404 })
    }

    return NextResponse.json(subnet[0])
  } catch (error) {
    console.error("[v0] Error fetching subnet:", error)
    return NextResponse.json({ message: "Failed to fetch subnet", error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subnetId = Number.parseInt(params.id)
    const body = await request.json()

    const { name, description, type, gateway, vlan_id } = body

    const sql = await getSql()

    const result = await sql`
      UPDATE ip_subnets SET
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        type = COALESCE(${type}, type),
        gateway = COALESCE(${gateway}, gateway),
        vlan_id = COALESCE(${vlan_id}, vlan_id),
        updated_at = NOW()
      WHERE id = ${subnetId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ message: "Subnet not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("[v0] Error updating subnet:", error)
    return NextResponse.json({ message: "Failed to update subnet" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subnetId = Number.parseInt(params.id)

    const sql = await getSql()

    // Check if subnet has assigned IP addresses
    const assignedIPs = await sql`
      SELECT COUNT(*) as count FROM ip_addresses 
      WHERE subnet_id = ${subnetId} AND status = 'assigned'
    `

    if (Number(assignedIPs[0].count) > 0) {
      return NextResponse.json(
        { message: "Cannot delete subnet with assigned IP addresses. Release all IPs first." },
        { status: 400 },
      )
    }

    // Delete the subnet (cascade will delete IP addresses)
    await sql`
      DELETE FROM ip_subnets WHERE id = ${subnetId}
    `

    return NextResponse.json({ message: "Subnet deleted successfully" })
  } catch (error) {
    console.error("[v0] Error deleting subnet:", error)
    return NextResponse.json({ message: "Failed to delete subnet" }, { status: 500 })
  }
}

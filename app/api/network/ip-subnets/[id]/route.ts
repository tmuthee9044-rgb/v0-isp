import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import sql from "sql-template-strings"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subnetId = Number.parseInt(params.id)

    const db = await getSql()

    const subnet = await db.query(sql`
      SELECT 
        s.*,
        r.name as router_name,
        r.ip_address as router_ip,
        l.name as location_name,
        l.city as location_city,
        l.address as location_address,
        COUNT(ip.id) as total_ips_generated,
        COUNT(CASE WHEN ip.status = 'assigned' THEN 1 END)::int as assigned_ips,
        COUNT(CASE WHEN ip.status = 'available' THEN 1 END)::int as available_ips,
        COUNT(CASE WHEN ip.status = 'reserved' THEN 1 END)::int as reserved_ips
      FROM ip_subnets s
      LEFT JOIN network_devices r ON s.router_id = r.id
      LEFT JOIN locations l ON r.location_id = l.id
      LEFT JOIN ip_addresses ip ON s.id = ip.subnet_id
      WHERE s.id = ${subnetId}
      GROUP BY s.id, r.name, r.ip_address, l.name, l.city, l.address
    `)

    if (subnet.length === 0) {
      return NextResponse.json({ message: "Subnet not found" }, { status: 404 })
    }

    return NextResponse.json(subnet[0])
  } catch (error) {
    console.error("[v0] Error fetching subnet:", error)
    return NextResponse.json({ message: "Failed to fetch subnet" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subnetId = Number.parseInt(params.id)
    const body = await request.json()

    const { name, description, type, gateway, vlan_id } = body

    const db = await getSql()

    const result = await db.query(sql`
      UPDATE ip_subnets SET
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        type = COALESCE(${type}, type),
        gateway = COALESCE(${gateway}, gateway),
        vlan_id = COALESCE(${vlan_id}, vlan_id)
      WHERE id = ${subnetId}
      RETURNING *
    `)

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

    const db = await getSql()

    // Check if subnet has assigned IP addresses
    const assignedIPs = await db.query(sql`
      SELECT COUNT(*) as count FROM ip_addresses 
      WHERE subnet_id = ${subnetId} AND status = 'assigned'
    `)

    if (Number(assignedIPs[0].count) > 0) {
      return NextResponse.json(
        { message: "Cannot delete subnet with assigned IP addresses. Release all IPs first." },
        { status: 400 },
      )
    }

    // Delete the subnet (cascade will delete IP addresses)
    await db.query(sql`
      DELETE FROM ip_subnets WHERE id = ${subnetId}
    `)

    return NextResponse.json({ message: "Subnet deleted successfully" })
  } catch (error) {
    console.error("[v0] Error deleting subnet:", error)
    return NextResponse.json({ message: "Failed to delete subnet" }, { status: 500 })
  }
}

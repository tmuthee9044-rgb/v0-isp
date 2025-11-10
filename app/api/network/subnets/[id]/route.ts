import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subnetId = Number.parseInt(params.id)

    const subnet = await sql`
      SELECT 
        s.*,
        nd.name as router_name,
        nd.hostname as router_hostname,
        COUNT(ip.id) as total_ips,
        COUNT(CASE WHEN ip.status = 'assigned' THEN 1 END) as assigned_ips,
        COUNT(CASE WHEN ip.status = 'available' THEN 1 END) as available_ips
      FROM subnets s
      LEFT JOIN network_devices nd ON s.router_id = nd.id AND nd.type = 'router'
      LEFT JOIN ip_addresses ip ON s.id = ip.subnet_id
      WHERE s.id = ${subnetId}
      GROUP BY s.id, nd.name, nd.hostname
    `

    if (subnet.length === 0) {
      return NextResponse.json({ message: "Subnet not found" }, { status: 404 })
    }

    return NextResponse.json(subnet[0])
  } catch (error) {
    console.error("Error fetching subnet:", error)
    return NextResponse.json({ message: "Failed to fetch subnet" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subnetId = Number.parseInt(params.id)
    const body = await request.json()

    console.log("[v0] Received subnet update data:", body)

    const { router_id, network, type, name, description } = body

    if (!network || network.trim() === "") {
      console.log("[v0] Network field is missing or empty")
      return NextResponse.json({ message: "Network CIDR is required" }, { status: 400 })
    }

    console.log("[v0] Extracted fields:", { router_id, network, type, name, description })

    // Check if subnet exists
    const existingSubnet = await sql`
      SELECT id, router_id FROM subnets WHERE id = ${subnetId}
    `

    if (existingSubnet.length === 0) {
      return NextResponse.json({ message: "Subnet not found" }, { status: 404 })
    }

    // Check if network conflicts with other subnets on the same router
    const networkConflict = await sql`
      SELECT id FROM subnets 
      WHERE router_id = ${router_id} AND network = ${network} AND id != ${subnetId}
    `

    if (networkConflict.length > 0) {
      return NextResponse.json({ message: "Subnet with this network already exists for this router" }, { status: 400 })
    }

    const result = await sql`
      UPDATE subnets SET
        router_id = ${router_id},
        network = ${network},
        subnet_type = ${type},
        name = ${name || null},
        description = ${description || null}
      WHERE id = ${subnetId}
      RETURNING *
    `

    console.log("[v0] Update result:", result[0])

    await sql`
      INSERT INTO router_logs (log_level, router_id, event_type, message)
      VALUES ('INFO', ${router_id}, 'subnet_updated', ${"IP subnet " + network + " updated"})
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating subnet:", error)
    return NextResponse.json({ message: "Failed to update subnet" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subnetId = Number.parseInt(params.id)

    // Check if subnet has assigned IP addresses
    const assignedIPs = await sql`
      SELECT COUNT(*) as count FROM ip_addresses 
      WHERE subnet_id = ${subnetId} AND status = 'assigned'
    `

    if (assignedIPs[0].count > 0) {
      return NextResponse.json({ message: "Cannot delete subnet with assigned IP addresses" }, { status: 400 })
    }

    // Get subnet info for logging
    const subnet = await sql`
      SELECT router_id, network FROM subnets WHERE id = ${subnetId}
    `

    if (subnet.length === 0) {
      return NextResponse.json({ message: "Subnet not found" }, { status: 404 })
    }

    // Delete the subnet (this will cascade delete IP addresses)
    await sql`
      DELETE FROM subnets WHERE id = ${subnetId}
    `

    await sql`
      INSERT INTO router_logs (log_level, router_id, event_type, message)
      VALUES ('INFO', ${subnet[0].router_id}, 'subnet_deleted', ${"IP subnet " + subnet[0].network + " deleted"})
    `

    return NextResponse.json({ message: "Subnet deleted successfully" })
  } catch (error) {
    console.error("Error deleting subnet:", error)
    return NextResponse.json({ message: "Failed to delete subnet" }, { status: 500 })
  }
}

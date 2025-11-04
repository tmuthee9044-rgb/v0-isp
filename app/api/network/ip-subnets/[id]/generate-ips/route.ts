import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

function generateIPv6Addresses(networkAddr: string, prefix: number, excludeGateway: boolean): string[] {
  // For IPv6, we'll generate a reasonable subset for common prefix lengths
  // Full /64 would be 18 quintillion addresses, so we limit generation

  if (prefix > 64) {
    // For /65 and higher, generate all addresses
    const hostBits = 128 - prefix
    const totalHosts = Math.min(Math.pow(2, hostBits), 10000) // Cap at 10k for safety

    const addresses: string[] = []
    const baseAddr = expandIPv6(networkAddr)

    for (let i = 1; i <= totalHosts; i++) {
      if (excludeGateway && i === 1) continue // Skip gateway
      addresses.push(incrementIPv6(baseAddr, i))
    }

    return addresses
  } else {
    // For /64 and lower, generate a practical subset (first 1000 addresses)
    const addresses: string[] = []
    const baseAddr = expandIPv6(networkAddr)
    const startOffset = excludeGateway ? 2 : 1

    for (let i = startOffset; i < startOffset + 1000; i++) {
      addresses.push(incrementIPv6(baseAddr, i))
    }

    return addresses
  }
}

function expandIPv6(addr: string): string {
  // Expand compressed IPv6 address to full form
  const parts = addr.split(":")
  const expanded: string[] = []

  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "") {
      const missing = 8 - parts.length + 1
      for (let j = 0; j < missing; j++) {
        expanded.push("0000")
      }
    } else {
      expanded.push(parts[i].padStart(4, "0"))
    }
  }

  return expanded.slice(0, 8).join(":")
}

function incrementIPv6(addr: string, increment: number): string {
  const parts = addr.split(":").map((p) => Number.parseInt(p, 16))
  let carry = increment

  for (let i = 7; i >= 0 && carry > 0; i--) {
    parts[i] += carry
    carry = Math.floor(parts[i] / 65536)
    parts[i] %= 65536
  }

  return parts.map((p) => p.toString(16).padStart(4, "0")).join(":")
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const subnetId = Number.parseInt(params.id)
    const body = await request.json().catch(() => ({}))
    const regenerate = body.regenerate === true
    const adminId = body.adminId // Added admin ID for audit logging

    console.log("[v0] Generating IPs for subnet ID:", subnetId, "Regenerate:", regenerate)

    if (adminId) {
      const [admin] = await sql`
        SELECT u.id, u.role, r.permissions
        FROM users u
        LEFT JOIN roles r ON u.role = r.name
        WHERE u.id = ${adminId}
      `

      if (!admin) {
        return NextResponse.json({ message: "Unauthorized: Admin not found" }, { status: 401 })
      }

      const permissions = admin.permissions?.split(",") || []
      const hasNetworkPermission = permissions.some(
        (p: string) => p.includes("network.configure") || p.includes("network.manage") || admin.role === "admin",
      )

      if (!hasNetworkPermission) {
        await sql`
          INSERT INTO admin_logs (admin_id, action, resource_type, resource_id, new_values, ip_address, created_at)
          VALUES (
            ${adminId}, 'ip_generation_denied', 'ip_subnet', ${subnetId},
            ${JSON.stringify({ subnetId, role: admin.role, reason: "Insufficient network privileges" })},
            NULL, NOW()
          )
        `

        return NextResponse.json(
          {
            message: "Unauthorized: Insufficient network privileges",
          },
          { status: 403 },
        )
      }
    }

    const subnet = await sql`
      SELECT * FROM ip_subnets WHERE id = ${subnetId}
    `

    if (subnet.length === 0) {
      return NextResponse.json({ message: "Subnet not found" }, { status: 404 })
    }

    const subnetData = subnet[0]
    const cidr = subnetData.cidr
    const [networkAddr, prefixStr] = cidr.split("/")
    const prefix = Number.parseInt(prefixStr)
    const gatewayIP = subnetData.gateway_ip // Get gateway IP from subnet config

    // Check if IPv6
    const isIPv6 = subnetData.version === "IPv6" || networkAddr.includes(":")

    if (isIPv6) {
      if (prefix < 48 || prefix > 120) {
        return NextResponse.json(
          { message: "IPv6 subnet prefix must be between /48 and /120 for IP generation" },
          { status: 400 },
        )
      }
    } else {
      // IPv4 validation
      if (prefix < 16 || prefix > 30) {
        return NextResponse.json(
          { message: "IPv4 subnet prefix must be between /16 and /30 for IP generation" },
          { status: 400 },
        )
      }
    }

    const existingIPs = await sql`
      SELECT COUNT(*) as count FROM ip_addresses WHERE subnet_id = ${subnetId}
    `

    if (Number(existingIPs[0].count) > 0) {
      if (!regenerate) {
        return NextResponse.json(
          {
            message: "IP addresses already exist for this subnet",
            existingCount: Number(existingIPs[0].count),
            requiresConfirmation: true,
          },
          { status: 409 },
        )
      }

      await sql`
        INSERT INTO admin_logs (admin_id, action, resource_type, resource_id, new_values, created_at)
        VALUES (
          ${adminId || null}, 'ip_regeneration_started', 'ip_subnet', ${subnetId},
          ${JSON.stringify({ cidr, existingCount: Number(existingIPs[0].count), routerId: subnetData.router_id })},
          NOW()
        )
      `

      // Delete existing IPs if regenerating
      console.log("[v0] Deleting existing IPs for regeneration...")
      await sql`
        DELETE FROM ip_addresses WHERE subnet_id = ${subnetId}
      `
    }

    let ipAddresses: string[]

    if (isIPv6) {
      const excludeGateway = !!gatewayIP
      ipAddresses = generateIPv6Addresses(networkAddr, prefix, excludeGateway)
      console.log("[v0] Generating", ipAddresses.length, "IPv6 addresses...")
    } else {
      // IPv4 generation
      const hostBits = 32 - prefix
      const totalHosts = Math.pow(2, hostBits) - 2

      if (totalHosts > 65534) {
        return NextResponse.json(
          { message: "Subnet too large. Maximum 65,534 usable addresses allowed for automatic generation." },
          { status: 400 },
        )
      }

      console.log("[v0] Generating", totalHosts, "IPv4 addresses...")

      const ipToNumber = (ip: string): number => {
        const parts = ip.split(".").map(Number)
        return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
      }

      const numberToIp = (num: number): string => {
        return [(num >>> 24) & 0xff, (num >>> 16) & 0xff, (num >>> 8) & 0xff, num & 0xff].join(".")
      }

      const networkInt = ipToNumber(networkAddr)
      const firstUsableIP = networkInt + 1
      const lastUsableIP = networkInt + totalHosts

      ipAddresses = []
      for (let i = firstUsableIP; i <= lastUsableIP; i++) {
        const ip = numberToIp(i)
        if (gatewayIP && ip === gatewayIP) {
          console.log("[v0] Excluding gateway IP:", gatewayIP)
          continue
        }
        ipAddresses.push(ip)
      }
    }

    const BATCH_SIZE = 500
    let insertedCount = 0

    for (let i = 0; i < ipAddresses.length; i += BATCH_SIZE) {
      const batch = ipAddresses.slice(i, i + BATCH_SIZE)

      // Build VALUES clause for batch insert
      const values = batch.map((ip) => `('${ip}', ${subnetId}, 'available', NOW())`).join(",")

      // Single INSERT with multiple rows
      await sql.unsafe(`
        INSERT INTO ip_addresses (ip_address, subnet_id, status, created_at)
        VALUES ${values}
      `)

      insertedCount += batch.length
      console.log("[v0] Progress:", insertedCount, "/", ipAddresses.length)
    }

    await sql`
      UPDATE ip_subnets 
      SET 
        total_ips = ${insertedCount},
        used_ips = 0
      WHERE id = ${subnetId}
    `

    await sql`
      INSERT INTO admin_logs (admin_id, action, resource_type, resource_id, new_values, created_at)
      VALUES (
        ${adminId || null}, 
        ${regenerate ? "ip_regeneration_completed" : "ip_generation_completed"}, 
        'ip_subnet', 
        ${subnetId},
        ${JSON.stringify({
          cidr,
          ipVersion: isIPv6 ? "IPv6" : "IPv4",
          totalGenerated: insertedCount,
          gatewayExcluded: !!gatewayIP,
          regenerated: regenerate,
          routerId: subnetData.router_id,
        })},
        NOW()
      )
    `

    console.log("[v0] IP generation completed:", insertedCount, "IPs created")

    return NextResponse.json({
      message: "IP addresses generated successfully",
      count: insertedCount,
      subnet: cidr,
      ipVersion: isIPv6 ? "IPv6" : "IPv4",
      regenerated: regenerate,
      gatewayExcluded: !!gatewayIP,
    })
  } catch (error) {
    console.error("[v0] Error generating IP addresses:", error)

    try {
      await sql`
        INSERT INTO admin_logs (admin_id, action, resource_type, resource_id, new_values, created_at)
        VALUES (
          NULL, 'ip_generation_failed', 'ip_subnet', ${params.id},
          ${JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
          })},
          NOW()
        )
      `
    } catch (logError) {
      console.error("[v0] Failed to log error:", logError)
    }

    return NextResponse.json(
      {
        message: "Failed to generate IP addresses",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

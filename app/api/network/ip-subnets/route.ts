import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sql = await getSql()
    const { searchParams } = new URL(request.url)
    const routerId = searchParams.get("router_id")

    let query
    if (routerId) {
      query = sql`
        SELECT 
          s.*,
          r.name as router_name,
          r.ip_address as router_ip,
          l.name as location_name,
          COUNT(DISTINCT CASE 
            WHEN cs.ip_address IS NOT NULL AND cs.status IN ('active', 'pending', 'suspended') 
            THEN ip.id 
          END) as used_ips
        FROM ip_subnets s
        LEFT JOIN network_devices r ON s.router_id = r.id
        LEFT JOIN locations l ON r.location = l.name
        LEFT JOIN ip_addresses ip ON ip.subnet_id = s.id
        LEFT JOIN customer_services cs ON CAST(ip.ip_address AS TEXT) = CAST(cs.ip_address AS TEXT) AND cs.status IN ('active', 'pending', 'suspended')
        WHERE s.router_id = ${Number.parseInt(routerId)} 
          AND (r.type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') OR r.type ILIKE '%router%')
        GROUP BY s.id, r.name, r.ip_address, l.name
        ORDER BY s.created_at DESC
      `
    } else {
      query = sql`
        SELECT 
          s.*,
          r.name as router_name,
          r.ip_address as router_ip,
          l.name as location_name,
          COUNT(DISTINCT CASE 
            WHEN cs.ip_address IS NOT NULL AND cs.status IN ('active', 'pending', 'suspended') 
            THEN ip.id 
          END) as used_ips
        FROM ip_subnets s
        LEFT JOIN network_devices r ON s.router_id = r.id
        LEFT JOIN locations l ON r.location = l.name
        LEFT JOIN ip_addresses ip ON ip.subnet_id = s.id
        LEFT JOIN customer_services cs ON CAST(ip.ip_address AS TEXT) = CAST(cs.ip_address AS TEXT) AND cs.status IN ('active', 'pending', 'suspended')
        WHERE (r.type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') OR r.type ILIKE '%router%')
        GROUP BY s.id, r.name, r.ip_address, l.name
        ORDER BY l.name, s.created_at DESC
      `
    }

    const subnets = await query

    const transformedSubnets = subnets.map((subnet) => {
      const [network, prefixStr] = subnet.cidr ? subnet.cidr.split("/") : ["", "24"]
      const prefix = Number.parseInt(prefixStr)

      let totalIPs = 0
      const isIPv6 = subnet.version === "IPv6"

      if (isIPv6) {
        totalIPs = Math.pow(2, 128 - prefix)
        if (totalIPs > 1000000) totalIPs = 1000000
      } else {
        totalIPs = Math.pow(2, 32 - prefix) - 2
      }

      const assignedIPs = Number(subnet.used_ips) || 0
      const freeIPs = (subnet.total_ips || totalIPs) - assignedIPs

      return {
        id: subnet.id,
        name: subnet.name,
        cidr: subnet.cidr,
        network: network,
        prefix: prefix,
        version: subnet.version || "IPv4",
        type: subnet.type || "private",
        allocation_mode: subnet.allocation_mode || "dynamic",
        description: subnet.description,
        router_id: subnet.router_id,
        router_name: subnet.router_name,
        location_name: subnet.location_name,
        total_ips: subnet.total_ips || totalIPs,
        assigned_ips: assignedIPs,
        used_ips: subnet.used_ips || 0,
        free_ips: freeIPs,
        status: subnet.status || "active",
        created_at: subnet.created_at,
        updated_at: subnet.updated_at,
      }
    })

    return NextResponse.json({ subnets: transformedSubnets })
  } catch (error) {
    console.error("[v0] Error fetching IP subnets:", error)
    return NextResponse.json({ error: "Failed to fetch IP subnets" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] ===== IP SUBNET API POST REQUEST START =====")

    const body = await request.json()
    console.log("[v0] Creating subnet for router:", body.router_id)

    const { router_id, cidr, name, description, version, type, allocation_mode } = body

    if (!router_id || !cidr) {
      console.log("[v0] Missing required fields")
      return NextResponse.json({ message: "Router ID and CIDR are required" }, { status: 400 })
    }

    // Validate CIDR format
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$|^([\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}\/\d{1,3}$/
    if (!cidrRegex.test(cidr)) {
      return NextResponse.json({ message: "Invalid CIDR format" }, { status: 400 })
    }

    const [networkAddr, prefixStr] = cidr.split("/")
    const prefix = Number.parseInt(prefixStr)

    // Verify router exists
    const sql = await getSql()
    const router = await sql`
      SELECT id FROM network_devices 
      WHERE id = ${router_id} 
        AND (type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') OR type ILIKE '%router%')
    `

    if (router.length === 0) {
      return NextResponse.json({ message: "Router not found" }, { status: 404 })
    }

    // Check for overlapping subnets
    const overlap = await sql`
      SELECT id, cidr FROM ip_subnets 
      WHERE router_id = ${router_id} AND cidr = ${cidr}
    `

    if (overlap.length > 0) {
      return NextResponse.json({ message: "Subnet with this CIDR already exists for this router" }, { status: 409 })
    }

    const isIPv6 = version === "IPv6" || networkAddr.includes(":")
    const ipVersion = isIPv6 ? "IPv6" : "IPv4"
    let totalIPs = 0

    if (isIPv6) {
      totalIPs = Math.pow(2, 128 - prefix)
      if (totalIPs > 1000000) totalIPs = 1000000
    } else {
      // For IPv4, exclude network and broadcast addresses
      totalIPs = Math.pow(2, 32 - prefix) - 2
    }

    console.log("[v0] Creating subnet with", totalIPs, "total IPs, version:", ipVersion)

    const result = await sql`
      INSERT INTO ip_subnets (
        router_id, cidr, name, description, type, version, total_ips, used_ips
      ) VALUES (
        ${router_id}, 
        ${cidr}, 
        ${name || null}, 
        ${description || null}, 
        ${type || "private"},
        ${ipVersion},
        ${totalIPs},
        0
      )
      RETURNING *
    `

    const createdSubnet = result[0]
    console.log("[v0] Subnet created:", createdSubnet.id)

    // Skip automatic IP generation to prevent memory issues
    // IPs will be generated on-demand when assigning to customers
    if (!isIPv6 && prefix >= 24 && totalIPs <= 254) {
      // Only auto-generate for small subnets (/24 or smaller = max 254 IPs)
      try {
        const ipToNumber = (ip: string): number => {
          const parts = ip.split(".").map(Number)
          return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
        }

        const numberToIp = (num: number): string => {
          return [(num >>> 24) & 0xff, (num >>> 16) & 0xff, (num >>> 8) & 0xff, num & 0xff].join(".")
        }

        const networkNumber = ipToNumber(networkAddr)
        const firstUsableIP = networkNumber + 1
        const lastUsableIP = networkNumber + totalIPs

        let insertedCount = 0
        for (let i = firstUsableIP; i <= lastUsableIP; i++) {
          const ip = numberToIp(i)
          await sql`
            INSERT INTO ip_addresses (ip_address, subnet_id, status, created_at)
            VALUES (${ip}, ${createdSubnet.id}, 'available', NOW())
            ON CONFLICT (ip_address) DO NOTHING
          `
          insertedCount++
        }

        await sql`
          UPDATE ip_subnets SET total_ips = ${insertedCount}, used_ips = 0
          WHERE id = ${createdSubnet.id}
        `
      } catch (ipError) {
        console.error("[v0] IP generation failed:", ipError)
      }
    }

    console.log("[v0] ===== IP SUBNET CREATED SUCCESSFULLY =====")
    return NextResponse.json(createdSubnet, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating IP subnet:", error)
    return NextResponse.json(
      { message: "Failed to create IP subnet", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
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
          COUNT(CASE WHEN ip.status = 'assigned' THEN 1 END) as used_ips
        FROM ip_subnets s
        LEFT JOIN network_devices r ON s.router_id = r.id
        LEFT JOIN locations l ON r.location = l.name
        LEFT JOIN ip_addresses ip ON ip.subnet_id = s.id
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
          COUNT(CASE WHEN ip.status = 'assigned' THEN 1 END) as used_ips
        FROM ip_subnets s
        LEFT JOIN network_devices r ON s.router_id = r.id
        LEFT JOIN locations l ON r.location = l.name
        LEFT JOIN ip_addresses ip ON ip.subnet_id = s.id
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
    console.log("[v0] Request body:", JSON.stringify(body, null, 2))

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
        router_id, cidr, name, description, type, version, total_ips, used_ips, available_ips
      ) VALUES (
        ${router_id}, 
        ${cidr}, 
        ${name || null}, 
        ${description || null}, 
        ${type || "private"},
        ${ipVersion},
        ${totalIPs},
        0,
        ${totalIPs}
      )
      RETURNING *
    `

    const createdSubnet = result[0]
    console.log("[v0] Subnet created:", createdSubnet.id)

    if (!isIPv6 && prefix >= 16 && totalIPs <= 65534) {
      console.log("[v0] Auto-generating", totalIPs, "IP addresses for subnet")

      try {
        const ipToNumber = (ip: string): number => {
          const parts = ip.split(".").map(Number)
          return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
        }

        const numberToIp = (num: number): string => {
          return [(num >>> 24) & 0xff, (num >>> 16) & 0xff, (num >>> 8) & 0xff, num & 0xff].join(".")
        }

        const networkNumber = ipToNumber(networkAddr)
        // First usable IP (skip network address)
        const firstUsableIP = networkNumber + 1
        // Last usable IP (skip broadcast address)
        const lastUsableIP = networkNumber + totalIPs

        const ipAddresses: string[] = []
        for (let i = firstUsableIP; i <= lastUsableIP; i++) {
          ipAddresses.push(numberToIp(i))
        }

        console.log("[v0] Generated", ipAddresses.length, "IP addresses, inserting in batches...")

        const BATCH_SIZE = 100
        let insertedCount = 0

        for (let i = 0; i < ipAddresses.length; i += BATCH_SIZE) {
          const batch = ipAddresses.slice(i, i + BATCH_SIZE)

          for (const ip of batch) {
            await sql`
              INSERT INTO ip_addresses (ip_address, subnet_id, status, version, created_at)
              VALUES (${ip}, ${createdSubnet.id}, 'available', ${ipVersion}, NOW())
              ON CONFLICT (ip_address, subnet_id) DO NOTHING
            `
            insertedCount++
          }

          // Log progress for large subnets
          if (ipAddresses.length > 1000 && i % 1000 === 0) {
            console.log(`[v0] Progress: ${i}/${ipAddresses.length} IPs inserted`)
          }
        }

        console.log("[v0] Successfully inserted", insertedCount, "IP addresses")

        await sql`
          UPDATE ip_subnets 
          SET 
            total_ips = ${insertedCount},
            available_ips = ${insertedCount},
            used_ips = 0
          WHERE id = ${createdSubnet.id}
        `

        console.log("[v0] Updated subnet with IP counts")
      } catch (ipError) {
        console.error("[v0] IP generation failed:", ipError)
        // Don't fail subnet creation if IP generation fails
        console.log("[v0] Subnet created but IP generation failed - IPs can be generated manually later")
      }
    } else if (isIPv6) {
      console.log("[v0] IPv6 subnet created - IP generation skipped (too many addresses)")
    } else if (totalIPs > 65534) {
      console.log("[v0] Large subnet created - IP generation skipped (more than 65,534 IPs)")
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

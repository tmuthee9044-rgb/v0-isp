import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/database"

export async function GET(request: NextRequest) {
  const sql = await getSql()

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
          l.id as location_id,
          COUNT(DISTINCT CASE WHEN ip.status = 'assigned' THEN ip.id END) as assigned_ips,
          COUNT(DISTINCT ip.id) as total_generated_ips
        FROM subnets s
        LEFT JOIN network_devices r ON s.router_id = r.id
        LEFT JOIN locations l ON r.location_id = l.id
        LEFT JOIN ip_pools ip ON ip.router_id = s.router_id AND ip.gateway = s.gateway
        WHERE s.router_id = ${Number.parseInt(routerId)} 
          AND (r.type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') OR r.type ILIKE '%router%')
        GROUP BY s.id, r.name, r.ip_address, l.name, l.id
        ORDER BY s.created_at DESC
      `
    } else {
      query = sql`
        SELECT 
          s.*,
          r.name as router_name,
          r.ip_address as router_ip,
          l.name as location_name,
          l.id as location_id,
          COUNT(DISTINCT CASE WHEN ip.status = 'assigned' THEN ip.id END) as assigned_ips,
          COUNT(DISTINCT ip.id) as total_generated_ips
        FROM subnets s
        LEFT JOIN network_devices r ON s.router_id = r.id
        LEFT JOIN locations l ON r.location_id = l.id
        LEFT JOIN ip_pools ip ON ip.router_id = s.router_id AND ip.gateway = s.gateway
        WHERE (r.type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') OR r.type ILIKE '%router%')
        GROUP BY s.id, r.name, r.ip_address, l.name, l.id
        ORDER BY l.name, s.created_at DESC
      `
    }

    const subnets = await query

    const transformedSubnets = subnets.map((subnet) => {
      const [network, prefixStr] = subnet.network ? subnet.network.split("/") : ["", "24"]
      const prefix = Number.parseInt(prefixStr)

      let totalIPs = 0
      let isIPv6 = false

      if (subnet.network && subnet.network.includes(":")) {
        isIPv6 = true
        totalIPs = Math.pow(2, 128 - prefix)
        if (totalIPs > 1000000) totalIPs = 1000000
      } else {
        totalIPs = Math.pow(2, 32 - prefix) - 2
      }

      const assignedIPs = Number(subnet.assigned_ips) || 0
      const freeIPs = totalIPs - assignedIPs

      return {
        id: subnet.id,
        name: subnet.name,
        network: network,
        cidr: `${network}/${prefix}`,
        prefix: prefix,
        type: isIPv6 ? "ipv6" : subnet.type || "private",
        allocation_mode: subnet.allocation_mode || "dynamic",
        gateway: subnet.gateway,
        dns_servers: subnet.dns_servers || [],
        description: subnet.description,
        router_id: subnet.router_id,
        router_name: subnet.router_name,
        location_id: subnet.location_id,
        location_name: subnet.location_name,
        total_ips: totalIPs,
        assigned_ips: assignedIPs,
        free_ips: freeIPs,
        status: subnet.status,
        created_at: subnet.created_at,
        updated_at: subnet.updated_at,
      }
    })

    return NextResponse.json(transformedSubnets)
  } catch (error) {
    console.error("Error fetching subnets:", error)
    return NextResponse.json({ error: "Failed to fetch subnets" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const sql = await getSql()

  try {
    console.log("[v0] ===== SUBNET API POST REQUEST START =====")

    const body = await request.json()
    console.log("[v0] Request body received:", JSON.stringify(body, null, 2))

    const { router_id, cidr, network, description, gateway, dns_servers, type, allocation_mode, name } = body

    const cidrValue = cidr || network
    console.log("[v0] CIDR value to use:", cidrValue)
    console.log("[v0] Router ID:", router_id)
    console.log("[v0] Type:", type)
    console.log("[v0] Name:", name)

    if (!router_id || !cidrValue) {
      console.log("[v0] VALIDATION FAILED - Missing required fields")
      console.log("[v0] router_id present:", !!router_id)
      console.log("[v0] cidrValue present:", !!cidrValue)
      return NextResponse.json({ message: "Router ID and CIDR are required" }, { status: 400 })
    }

    console.log("[v0] Required fields validation passed")

    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$|^([\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}\/\d{1,3}$/
    if (!cidrRegex.test(cidrValue)) {
      console.log("[v0] VALIDATION FAILED - Invalid CIDR format:", cidrValue)
      return NextResponse.json({ message: "Invalid CIDR format" }, { status: 400 })
    }

    console.log("[v0] CIDR format validation passed")

    const [networkAddr, prefixStr] = cidrValue.split("/")
    const prefix = Number.parseInt(prefixStr)
    console.log("[v0] Parsed network address:", networkAddr)
    console.log("[v0] Parsed prefix:", prefix)

    let query
    if (router_id) {
      query = sql`
        SELECT id FROM network_devices 
        WHERE id = ${router_id} 
          AND (type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') OR type ILIKE '%router%')
      `
    } else {
      return NextResponse.json({ message: "Router ID is required" }, { status: 400 })
    }

    const router = await query

    if (router.length === 0) {
      console.log("[v0] VALIDATION FAILED - Router not found in network_devices:", router_id)
      return NextResponse.json({ message: "Router not found" }, { status: 404 })
    }

    console.log("[v0] Router exists, proceeding with insert")

    const calculatedGateway = gateway || `${networkAddr.split(".").slice(0, 3).join(".")}.1`
    console.log("[v0] Gateway to use:", calculatedGateway)

    const dnsArray = dns_servers || ["8.8.8.8", "8.8.4.4"]
    console.log("[v0] DNS servers array:", dnsArray)

    console.log("[v0] Executing INSERT query...")
    const result = await sql`
      INSERT INTO subnets (
        router_id, network, description, gateway, dns_servers, status, subnet_type, name
      ) VALUES (
        ${router_id}, ${cidrValue}, ${description || null}, 
        ${calculatedGateway}, ${dnsArray}, 
        'active', ${type || "private"}, ${name || null}
      )
      RETURNING *
    `

    const createdSubnet = result[0]
    console.log("[v0] INSERT successful! Created subnet:", JSON.stringify(createdSubnet, null, 2))

    console.log("[v0] ===== STARTING AUTOMATIC IP GENERATION =====")
    console.log("[v0] Subnet ID:", createdSubnet.id)
    console.log("[v0] CIDR:", cidrValue)

    try {
      const [networkAddress, prefixLength] = cidrValue.split("/")
      const prefixNum = Number.parseInt(prefixLength)

      console.log("[v0] Network address:", networkAddress)
      console.log("[v0] Prefix length:", prefixNum)

      const isIPv6 = networkAddress.includes(":")
      console.log("[v0] Is IPv6:", isIPv6)

      if (isIPv6) {
        console.log("[v0] Skipping IP generation for IPv6 subnet")
        return NextResponse.json(createdSubnet, { status: 201 })
      }

      const totalIPs = Math.pow(2, 32 - prefixNum) - 2
      console.log("[v0] Total usable IPs:", totalIPs)

      if (totalIPs > 10000) {
        console.log(
          "[v0] Subnet too large for automatic IP generation (",
          totalIPs,
          "IPs). User can generate manually.",
        )
        return NextResponse.json(createdSubnet, { status: 201 })
      }

      if (prefixNum < 16) {
        console.log("[v0] Prefix too small (", prefixNum, "). Minimum is /16. User can generate manually.")
        return NextResponse.json(createdSubnet, { status: 201 })
      }

      console.log("[v0] Subnet size is acceptable for automatic generation")

      const ipToNumber = (ip: string): number => {
        const parts = ip.split(".").map(Number)
        return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
      }

      const numberToIp = (num: number): string => {
        return [(num >>> 24) & 0xff, (num >>> 16) & 0xff, (num >>> 8) & 0xff, num & 0xff].join(".")
      }

      const subnetMask = [
        (0xffffffff << (32 - prefixNum)) >>> 24,
        ((0xffffffff << (32 - prefixNum)) >>> 16) & 0xff,
        ((0xffffffff << (32 - prefixNum)) >>> 8) & 0xff,
        (0xffffffff << (32 - prefixNum)) & 0xff,
      ].join(".")

      console.log("[v0] Calculated subnet mask:", subnetMask)

      const networkNumber = ipToNumber(networkAddress)
      const firstUsableIP = networkNumber + 1
      const lastUsableIP = networkNumber + totalIPs

      console.log("[v0] First usable IP:", numberToIp(firstUsableIP))
      console.log("[v0] Last usable IP:", numberToIp(lastUsableIP))

      const ipAddresses: string[] = []
      for (let i = firstUsableIP; i <= lastUsableIP; i++) {
        ipAddresses.push(numberToIp(i))
      }

      console.log("[v0] Generated", ipAddresses.length, "IP addresses")

      const BATCH_SIZE = 100
      let totalInserted = 0

      for (let i = 0; i < ipAddresses.length; i += BATCH_SIZE) {
        const batch = ipAddresses.slice(i, i + BATCH_SIZE)

        console.log(
          "[v0] Inserting batch",
          Math.floor(i / BATCH_SIZE) + 1,
          "of",
          Math.ceil(ipAddresses.length / BATCH_SIZE),
        )

        for (const ip of batch) {
          try {
            await sql`
              INSERT INTO ip_pools (ip_address, status, router_id, gateway, subnet_mask)
              VALUES (${ip}, 'available', ${createdSubnet.router_id}, ${calculatedGateway}, ${subnetMask})
              ON CONFLICT (ip_address, router_id) DO NOTHING
            `
            totalInserted++
          } catch (insertError) {
            console.error("[v0] Error inserting IP", ip, ":", insertError)
          }
        }

        console.log("[v0] Progress:", totalInserted, "/", ipAddresses.length, "IPs inserted")
      }

      console.log("[v0] ===== IP GENERATION COMPLETED =====")
      console.log("[v0] Total IPs inserted:", totalInserted)
      console.log("[v0] Success rate:", ((totalInserted / ipAddresses.length) * 100).toFixed(2), "%")
    } catch (ipError) {
      console.error("[v0] ===== IP GENERATION ERROR =====")
      console.error("[v0] Error type:", ipError instanceof Error ? ipError.constructor.name : typeof ipError)
      console.error("[v0] Error message:", ipError instanceof Error ? ipError.message : String(ipError))
      console.error("[v0] Error stack:", ipError instanceof Error ? ipError.stack : "No stack trace")

      console.log("[v0] Subnet created successfully, but IP generation failed. User can generate IPs manually.")
    }

    console.log("[v0] ===== SUBNET API POST REQUEST SUCCESS =====")
    return NextResponse.json(createdSubnet, { status: 201 })
  } catch (error) {
    console.error("[v0] ===== SUBNET API POST REQUEST ERROR =====")
    console.error("[v0] Error details:", error)
    console.error("[v0] Error message:", error instanceof Error ? error.message : "Unknown error")
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")

    if (error instanceof Error && error.message.toLowerCase().includes("overlap")) {
      return NextResponse.json({ message: error.message }, { status: 409 })
    }

    if (error instanceof Error && error.message.includes("invalid cidr value")) {
      return NextResponse.json(
        {
          message:
            "Invalid CIDR format. Ensure the network address matches the subnet mask (e.g., use 192.168.0.0/16 instead of 192.168.109.0/16)",
        },
        { status: 400 },
      )
    }
    return NextResponse.json(
      { message: "Failed to create subnet", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

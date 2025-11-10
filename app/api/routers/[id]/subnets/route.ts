import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

function getDatabaseUrl() {
  const url =
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL

  if (!url) {
    console.error("[v0] No database connection string found for router subnets API")
    throw new Error("Database connection not configured")
  }

  return url
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const routerId = params.id
    const sql = neon(getDatabaseUrl())

    console.log(`[v0] Fetching subnets for router ${routerId}`)

    const subnets = await sql`
      SELECT 
        s.id,
        s.name,
        s.network,
        s.gateway,
        s.dns_servers,
        s.description,
        s.status,
        s.router_id
      FROM subnets s
      WHERE s.router_id = ${routerId}
        AND s.status = 'active'
      ORDER BY s.name
    `

    console.log(`[v0] Found ${subnets.length} subnets for router ${routerId}`)

    const subnetsWithIPs = await Promise.all(
      subnets.map(async (subnet) => {
        try {
          // Get allocated IPs for this subnet
          const allocatedIPs = await sql`
            SELECT ip_address 
            FROM ip_addresses 
            WHERE subnet_id = ${subnet.id} 
              AND status = 'allocated'
          `

          // Generate available IPs from the subnet range
          const network = subnet.network.toString()
          const [baseIP, cidr] = network.split("/")
          const availableIPs = generateAvailableIPs(
            baseIP,
            Number.parseInt(cidr),
            allocatedIPs.map((ip) => ip.ip_address),
          )

          return {
            id: subnet.id,
            name: subnet.name,
            network: subnet.network,
            gateway: subnet.gateway,
            dns_servers: subnet.dns_servers,
            description: subnet.description,
            status: subnet.status,
            available_ips: availableIPs.slice(0, 20), // Limit to first 20 available IPs
            total_available: availableIPs.length,
          }
        } catch (error) {
          console.error(`[v0] Error processing subnet ${subnet.id}:`, error)
          return {
            ...subnet,
            available_ips: [],
            total_available: 0,
          }
        }
      }),
    )

    return NextResponse.json({
      success: true,
      subnets: subnetsWithIPs,
    })
  } catch (error) {
    console.error("[v0] Error fetching router subnets:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch subnets for router",
        subnets: [],
      },
      { status: 500 },
    )
  }
}

function generateAvailableIPs(baseIP: string, cidr: number, allocatedIPs: string[]): string[] {
  const availableIPs: string[] = []
  const ipParts = baseIP.split(".").map(Number)

  // Calculate network size
  const hostBits = 32 - cidr
  const networkSize = Math.pow(2, hostBits)

  // Generate IPs (skip network and broadcast addresses)
  for (let i = 1; i < networkSize - 1; i++) {
    const ip = [...ipParts]
    let carry = i

    // Add the host portion
    for (let j = 3; j >= 0 && carry > 0; j--) {
      ip[j] += carry % 256
      carry = Math.floor(carry / 256)
      if (ip[j] > 255) {
        ip[j] = ip[j] % 256
        carry += 1
      }
    }

    const ipAddress = ip.join(".")

    // Skip if already allocated
    if (!allocatedIPs.includes(ipAddress)) {
      availableIPs.push(ipAddress)
    }

    // Limit to prevent memory issues
    if (availableIPs.length >= 100) break
  }

  return availableIPs
}

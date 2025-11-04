import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { validateAndNormalizeCIDR, validateIPAddress } from "@/lib/cidr-utils"

function getDatabaseConnection() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL

  if (!databaseUrl) {
    throw new Error("No database connection string found")
  }

  return neon(databaseUrl)
}

const sql = getDatabaseConnection()

export async function GET() {
  try {
    const subnets = await sql`
      SELECT 
        s.*,
        COUNT(ip.id) as used_ips,
        CASE 
          WHEN s.network::text LIKE '%:%' THEN 9223372036854775807::bigint
          ELSE (2^(32 - masklen(s.network)))::bigint - 2
        END as total_ips
      FROM subnets s
      LEFT JOIN ip_addresses ip ON ip.subnet_id = s.id AND ip.status = 'allocated'
      GROUP BY s.id, s.network
      ORDER BY s.created_at DESC
    `

    const transformedSubnets = subnets.map((subnet) => ({
      id: subnet.id,
      name: subnet.name,
      network: subnet.network.split("/")[0],
      cidr: Number.parseInt(subnet.network.split("/")[1]),
      type: subnet.network.includes(":") ? "ipv6" : "ipv4",
      gateway: subnet.gateway,
      dns_primary: subnet.dns_servers?.[0] || "8.8.8.8",
      dns_secondary: subnet.dns_servers?.[1] || "8.8.4.4",
      dhcp_enabled: true,
      description: subnet.description,
      total_ips: Number(subnet.total_ips),
      used_ips: Number(subnet.used_ips),
      available_ips: Number(subnet.total_ips) - Number(subnet.used_ips),
      status: subnet.status,
      created_at: subnet.created_at,
      updated_at: subnet.created_at,
    }))

    return NextResponse.json(transformedSubnets)
  } catch (error) {
    console.error("Error fetching subnets:", error)
    return NextResponse.json({ error: "Failed to fetch subnets" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error("[v0] Failed to parse request body:", error)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { name, network, cidr, gateway, dns_servers, description, router_id } = body

    if (!name || !network || !cidr) {
      return NextResponse.json({ error: "Name, network, and CIDR are required fields" }, { status: 400 })
    }

    console.log("[v0] Creating subnet with data:", { name, network, cidr, gateway, router_id })

    const cidrString = `${network}/${cidr}`
    const cidrValidation = validateAndNormalizeCIDR(cidrString)

    if (!cidrValidation.isValid) {
      console.error("[v0] CIDR validation failed:", cidrValidation.error)
      return NextResponse.json(
        {
          error: `Invalid CIDR: ${cidrValidation.error}`,
        },
        { status: 400 },
      )
    }

    if (gateway) {
      const gatewayValidation = validateIPAddress(gateway)
      if (!gatewayValidation.isValid) {
        console.error("[v0] Gateway validation failed:", gatewayValidation.error)
        return NextResponse.json(
          {
            error: `Invalid gateway IP: ${gatewayValidation.error}`,
          },
          { status: 400 },
        )
      }
    }

    let existingSubnet
    try {
      existingSubnet = await sql`
        SELECT id FROM subnets WHERE network = ${cidrValidation.normalized}::cidr
      `
    } catch (error) {
      console.error("[v0] Error checking existing subnet:", error)
      return NextResponse.json({ error: "Failed to check for existing subnet" }, { status: 500 })
    }

    if (existingSubnet.length > 0) {
      return NextResponse.json(
        {
          error: "A subnet with this network already exists",
        },
        { status: 409 },
      )
    }

    let subnet
    try {
      console.log("[v0] Inserting subnet with router_id:", router_id)
      const result = await sql`
        INSERT INTO subnets (name, network, gateway, dns_servers, description, router_id, status, created_at)
        VALUES (${name}, ${cidrValidation.normalized}::cidr, ${gateway ? `${gateway}::inet` : null}, ${dns_servers}, ${description}, ${router_id ? Number.parseInt(router_id) : null}, 'active', NOW())
        RETURNING *
      `
      subnet = result[0]
      console.log("[v0] Successfully created subnet:", subnet)
    } catch (error) {
      console.error("[v0] Error creating subnet:", error)

      if (error.message?.includes("invalid input syntax")) {
        return NextResponse.json(
          {
            error: "Invalid CIDR or IP address format",
          },
          { status: 400 },
        )
      }

      if (error.message?.includes("foreign key")) {
        return NextResponse.json(
          {
            error: "Invalid router ID specified",
          },
          { status: 400 },
        )
      }

      return NextResponse.json({ error: "Failed to create subnet" }, { status: 500 })
    }

    try {
      console.log("[v0] Auto-generating IP addresses for subnet:", subnet.id)

      // Parse network to get network and subnet mask
      const [networkAddr, prefixLength] = cidrValidation.normalized.split("/")
      const prefix = Number.parseInt(prefixLength)

      if (prefix >= 8 && prefix <= 30) {
        // Calculate number of host addresses
        const hostBits = 32 - prefix
        const totalHosts = Math.pow(2, hostBits)
        const usableHosts = totalHosts - 2 // Subtract network and broadcast addresses

        // Only generate if subnet is reasonable size (max 1000 IPs)
        if (usableHosts <= 1000) {
          // Generate IP addresses
          const networkParts = networkAddr.split(".").map(Number)
          const ipAddresses = []

          // Calculate the first and last usable IP addresses
          const networkInt =
            (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3]
          const firstUsableIP = networkInt + 1
          const lastUsableIP = networkInt + usableHosts

          for (let i = firstUsableIP; i <= lastUsableIP; i++) {
            const ip = [(i >>> 24) & 255, (i >>> 16) & 255, (i >>> 8) & 255, i & 255].join(".")

            ipAddresses.push({
              ip_address: ip,
              status: "available",
              subnet_mask: `/${prefix}`,
              gateway: gateway || null,
              customer_id: null,
              allocated_at: null,
              router_id: router_id ? Number.parseInt(router_id) : null,
            })
          }

          // Insert IP addresses in batches
          const batchSize = 100
          let insertedCount = 0

          for (let i = 0; i < ipAddresses.length; i += batchSize) {
            const batch = ipAddresses.slice(i, i + batchSize)

            const values = batch
              .map(
                (ip) =>
                  `('${ip.ip_address}', '${ip.status}', '${ip.subnet_mask}', ${ip.gateway ? `'${ip.gateway}'` : "NULL"}, NULL, NULL, ${ip.router_id || "NULL"})`,
              )
              .join(", ")

            await sql.unsafe(`
              INSERT INTO ip_pools (ip_address, status, subnet_mask, gateway, customer_id, allocated_at, router_id)
              VALUES ${values}
            `)

            insertedCount += batch.length
          }

          console.log("[v0] Successfully generated", insertedCount, "IP addresses for subnet with router assignment")
        } else {
          console.log("[v0] Subnet too large for auto IP generation:", usableHosts, "addresses")
        }
      } else {
        console.log("[v0] Subnet prefix out of range for auto IP generation:", prefix)
      }
    } catch (error) {
      console.error("[v0] Error auto-generating IP addresses:", error)
      console.log("[v0] Subnet created successfully but IP generation failed")
    }

    return NextResponse.json(subnet, { status: 201 })
  } catch (error) {
    console.error("[v0] Unexpected error in subnet creation:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const pathSegments = url.pathname.split("/")
    const id = pathSegments[pathSegments.length - 1]

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "Invalid subnet ID" }, { status: 400 })
    }

    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error("[v0] Failed to parse request body:", error)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { name, network, cidr, gateway, dns_servers, description, status, router_id } = body

    if (!name || !network || !cidr) {
      return NextResponse.json({ error: "Name, network, and CIDR are required fields" }, { status: 400 })
    }

    console.log("[v0] Updating subnet with data:", { id, name, network, cidr, gateway, router_id, status })

    const cidrString = `${network}/${cidr}`
    const cidrValidation = validateAndNormalizeCIDR(cidrString)

    if (!cidrValidation.isValid) {
      console.error("[v0] CIDR validation failed:", cidrValidation.error)
      return NextResponse.json(
        {
          error: `Invalid CIDR: ${cidrValidation.error}`,
        },
        { status: 400 },
      )
    }

    if (gateway) {
      const gatewayValidation = validateIPAddress(gateway)
      if (!gatewayValidation.isValid) {
        console.error("[v0] Gateway validation failed:", gatewayValidation.error)
        return NextResponse.json(
          {
            error: `Invalid gateway IP: ${gatewayValidation.error}`,
          },
          { status: 400 },
        )
      }
    }

    let existingSubnet
    try {
      existingSubnet = await sql`
        SELECT id FROM subnets WHERE id = ${Number(id)}
      `
    } catch (error) {
      console.error("[v0] Error checking existing subnet:", error)
      return NextResponse.json({ error: "Failed to check for existing subnet" }, { status: 500 })
    }

    if (existingSubnet.length === 0) {
      return NextResponse.json({ error: "Subnet not found" }, { status: 404 })
    }

    try {
      const duplicateCheck = await sql`
        SELECT id FROM subnets WHERE network = ${cidrValidation.normalized}::cidr AND id != ${Number(id)}
      `
      if (duplicateCheck.length > 0) {
        return NextResponse.json(
          {
            error: "A subnet with this network already exists",
          },
          { status: 409 },
        )
      }
    } catch (error) {
      console.error("[v0] Error checking for duplicate subnet:", error)
      return NextResponse.json({ error: "Failed to check for duplicate subnet" }, { status: 500 })
    }

    let subnet
    try {
      console.log("[v0] Updating subnet with router_id:", router_id)
      const result = await sql`
        UPDATE subnets 
        SET 
          name = ${name},
          network = ${cidrValidation.normalized}::cidr,
          gateway = ${gateway ? `${gateway}::inet` : null},
          dns_servers = ${dns_servers},
          description = ${description},
          router_id = ${router_id ? Number.parseInt(router_id) : null},
          status = ${status || "active"},
          updated_at = NOW()
        WHERE id = ${Number(id)}
        RETURNING *
      `
      subnet = result[0]
      console.log("[v0] Successfully updated subnet:", subnet)
    } catch (error) {
      console.error("[v0] Error updating subnet:", error)

      if (error.message?.includes("invalid input syntax")) {
        return NextResponse.json(
          {
            error: "Invalid CIDR or IP address format",
          },
          { status: 400 },
        )
      }

      if (error.message?.includes("foreign key")) {
        return NextResponse.json(
          {
            error: "Invalid router ID specified",
          },
          { status: 400 },
        )
      }

      return NextResponse.json({ error: "Failed to update subnet" }, { status: 500 })
    }

    return NextResponse.json(subnet)
  } catch (error) {
    console.error("[v0] Unexpected error in subnet update:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

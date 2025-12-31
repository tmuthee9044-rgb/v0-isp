import { getSql } from "@/lib/db"

export interface LocationBasedIPAllocation {
  success: boolean
  ip_address?: string
  subnet_id?: number
  router_id?: number
  error?: string
  message?: string
}

/**
 * Allocates an IP address based on customer location
 * Finds routers in the same location, checks their subnets, and returns an available IP
 */
export async function allocateIPByLocation(
  customerId: number,
  customerLocation?: string,
): Promise<LocationBasedIPAllocation> {
  try {
    const sql = await getSql()

    let location = customerLocation
    if (!location) {
      const [customer] = await sql`
        SELECT city, physical_city, location_id FROM customers WHERE id = ${customerId}
      `

      if (!customer) {
        return { success: false, error: "Customer not found" }
      }

      location = customer.physical_city || customer.city

      if (!location) {
        return { success: false, error: "Customer location not found. Please update customer address." }
      }
    }

    console.log("[v0] Looking for routers in location:", location)

    const routers = await sql`
      SELECT nd.id, nd.name, nd.location, nd.ip_address
      FROM network_devices nd
      WHERE LOWER(nd.location) = LOWER(${location})
      AND nd.status = 'active'
      AND nd.type IN ('router', 'mikrotik')
      ORDER BY nd.created_at DESC
    `

    if (routers.length === 0) {
      return {
        success: false,
        error: `No active routers found in ${location}. Please add routers to this location first.`,
      }
    }

    console.log(`[v0] Found ${routers.length} routers in ${location}`)

    for (const router of routers) {
      // Find IP addresses allocated to this router that are available
      const availableIPs = await sql`
        SELECT ia.id, ia.ip_address, ia.subnet_id, ia.status
        FROM ip_addresses ia
        WHERE ia.device_id = ${router.id}
        AND ia.status = 'available'
        AND ia.customer_id IS NULL
        ORDER BY ia.ip_address ASC
        LIMIT 1
      `

      if (availableIPs.length > 0) {
        const allocatedIP = availableIPs[0]

        console.log(`[v0] Found available IP ${allocatedIP.ip_address} on router ${router.name}`)

        // Mark IP as assigned
        await sql`
          UPDATE ip_addresses
          SET status = 'assigned',
              customer_id = ${customerId},
              assigned_date = CURRENT_DATE,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${allocatedIP.id}
        `

        // Log the allocation
        await sql`
          INSERT INTO activity_logs (action, entity_type, entity_id, details, created_at)
          VALUES (
            'allocate', 'ip_address', ${allocatedIP.id},
            ${JSON.stringify({
              customer_id: customerId,
              ip_address: allocatedIP.ip_address,
              router_id: router.id,
              router_name: router.name,
              location: location,
            })},
            CURRENT_TIMESTAMP
          )
        `

        return {
          success: true,
          ip_address: allocatedIP.ip_address,
          subnet_id: allocatedIP.subnet_id,
          router_id: router.id,
          message: `IP ${allocatedIP.ip_address} allocated from router ${router.name} in ${location}`,
        }
      }
    }

    // No available IPs found in any router in this location
    return {
      success: false,
      error: `No available IP addresses in ${location}. All IPs are currently allocated. Please add more IP ranges or release unused IPs.`,
    }
  } catch (error) {
    console.error("[v0] Error allocating IP by location:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to allocate IP address",
    }
  }
}

/**
 * Gets available IPs for a specific location
 */
export async function getAvailableIPsByLocation(location: string): Promise<any[]> {
  try {
    const sql = await getSql()

    const availableIPs = await sql`
      SELECT 
        ia.id,
        ia.ip_address,
        ia.subnet_id,
        ia.status,
        nd.name as router_name,
        nd.location as router_location
      FROM ip_addresses ia
      JOIN network_devices nd ON ia.device_id = nd.id
      LEFT JOIN customer_services cs ON cs.ip_address = ia.ip_address::text 
        AND cs.status IN ('active', 'pending', 'suspended')
      WHERE LOWER(nd.location) = LOWER(${location})
      AND ia.status = 'available'
      AND ia.customer_id IS NULL
      AND cs.id IS NULL
      AND nd.status = 'active'
      ORDER BY ia.ip_address ASC
    `

    return availableIPs
  } catch (error) {
    console.error("[v0] Error fetching IPs by location:", error)
    return []
  }
}

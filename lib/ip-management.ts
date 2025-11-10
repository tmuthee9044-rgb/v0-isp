import { neon } from "@neondatabase/serverless"
import { createMikroTikClient } from "./mikrotik-api"

const sql = neon(process.env.DATABASE_URL!)

export interface IPAllocationResult {
  success: boolean
  ipAddress?: string
  routerId?: number
  subnetId?: number
  error?: string
}

export interface IPReleaseResult {
  success: boolean
  message: string
}

/**
 * Select router based on customer location
 */
export async function selectRouterByLocation(customerId: number, locationId?: number): Promise<number | null> {
  try {
    console.log(`[v0] Selecting router for customer ${customerId}, location ${locationId}`)

    // If location ID is provided, use it directly
    if (locationId) {
      const [router] = await sql`
        SELECT DISTINCT nd.id 
        FROM network_devices nd
        INNER JOIN ip_subnets s ON s.router_id = nd.id
        INNER JOIN ip_addresses ia ON ia.subnet_id = s.id
        WHERE nd.location = (SELECT name FROM locations WHERE id = ${locationId})
          AND (nd.type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') OR nd.type ILIKE '%router%')
          AND nd.status = 'active'
          AND s.status = 'active'
          AND ia.status = 'available'
        ORDER BY nd.id
        LIMIT 1
      `

      if (router) {
        console.log(`[v0] Found router ${router.id} for location ${locationId} with available IPs`)
        return router.id
      }
    }

    // Otherwise, get customer's location from their address
    const [customer] = await sql`
      SELECT city, address FROM customers WHERE id = ${customerId}
    `

    if (!customer) {
      console.error(`[v0] Customer ${customerId} not found`)
      return null
    }

    const [router] = await sql`
      SELECT DISTINCT nd.id 
      FROM network_devices nd
      LEFT JOIN locations l ON nd.location = l.name
      INNER JOIN ip_subnets s ON s.router_id = nd.id
      INNER JOIN ip_addresses ia ON ia.subnet_id = s.id
      WHERE (l.city = ${customer.city} OR nd.location ILIKE ${"%" + customer.city + "%"})
        AND (nd.type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') OR nd.type ILIKE '%router%')
        AND nd.status = 'active'
        AND s.status = 'active'
        AND ia.status = 'available'
      ORDER BY nd.id
      LIMIT 1
    `

    if (router) {
      console.log(`[v0] Found router ${router.id} for customer city ${customer.city} with available IPs`)
      return router.id
    }

    const [fallbackRouter] = await sql`
      SELECT DISTINCT nd.id 
      FROM network_devices nd
      INNER JOIN ip_subnets s ON s.router_id = nd.id
      INNER JOIN ip_addresses ia ON ia.subnet_id = s.id
      WHERE (nd.type IN ('router', 'mikrotik', 'ubiquiti', 'juniper', 'other') OR nd.type ILIKE '%router%')
        AND nd.status = 'active'
        AND s.status = 'active'
        AND ia.status = 'available'
      ORDER BY nd.id
      LIMIT 1
    `

    if (fallbackRouter) {
      console.log(
        `[v0] Using fallback router ${fallbackRouter.id} with available IPs (no router found for customer location)`,
      )
      return fallbackRouter.id
    }

    console.error(`[v0] No active routers with available IP addresses found`)
    return null
  } catch (error) {
    console.error(`[v0] Error selecting router:`, error)
    return null
  }
}

/**
 * Find available subnet for router
 */
export async function findAvailableSubnet(routerId: number): Promise<number | null> {
  try {
    const [subnet] = await sql`
      SELECT 
        s.id, 
        s.cidr,
        COUNT(ia.id) FILTER (WHERE ia.status = 'available') as available_count,
        COUNT(ia.id) as total_count
      FROM ip_subnets s
      LEFT JOIN ip_addresses ia ON ia.subnet_id = s.id
      WHERE s.router_id = ${routerId}
        AND s.status = 'active'
      GROUP BY s.id, s.cidr
      HAVING COUNT(ia.id) FILTER (WHERE ia.status = 'available') > 0
      ORDER BY COUNT(ia.id) FILTER (WHERE ia.status = 'available') DESC
      LIMIT 1
    `

    if (subnet) {
      console.log(
        `[v0] Found subnet ${subnet.id} (${subnet.cidr}) with ${subnet.available_count} available IPs out of ${subnet.total_count} total`,
      )
      return subnet.id
    }

    const [anySubnet] = await sql`
      SELECT s.id, s.cidr, COUNT(ia.id) as ip_count
      FROM ip_subnets s
      LEFT JOIN ip_addresses ia ON ia.subnet_id = s.id
      WHERE s.router_id = ${routerId}
        AND s.status = 'active'
      GROUP BY s.id, s.cidr
      LIMIT 1
    `

    if (anySubnet) {
      console.error(
        `[v0] Router ${routerId} has subnet ${anySubnet.id} (${anySubnet.cidr}) but no available IPs (${anySubnet.ip_count} IPs exist)`,
      )
    } else {
      console.error(`[v0] Router ${routerId} has no active subnets assigned`)
    }

    console.error(`[v0] No available subnets found for router ${routerId}`)
    return null
  } catch (error) {
    console.error(`[v0] Error finding available subnet:`, error)
    return null
  }
}

/**
 * Allocate an IP address to a customer service with automatic router selection
 */
export async function allocateIPAddress(
  customerId: number,
  serviceId: number,
  routerId?: number,
  locationId?: number,
  connectionType?: string,
): Promise<IPAllocationResult> {
  try {
    console.log(`[v0] Allocating IP for customer ${customerId}, service ${serviceId}`)

    // Step 1: Select router based on location if not provided
    if (!routerId) {
      routerId = await selectRouterByLocation(customerId, locationId)
      if (!routerId) {
        return {
          success: false,
          error: "No active router found for customer location",
        }
      }
    }

    console.log(`[v0] Using router ${routerId}`)

    // Step 2: Find available subnet
    const subnetId = await findAvailableSubnet(routerId)
    if (!subnetId) {
      return {
        success: false,
        error: "No available IP addresses in router subnets",
      }
    }

    console.log(`[v0] Using subnet ${subnetId}`)

    // Step 3: Find first available IP in subnet
    const [availableIP] = await sql`
      SELECT * 
      FROM ip_addresses
      WHERE subnet_id = ${subnetId}
        AND status = 'available'
      ORDER BY ip_address
      LIMIT 1
    `

    if (!availableIP) {
      return {
        success: false,
        error: "No available IP addresses in the selected subnet",
      }
    }

    console.log(`[v0] Found available IP: ${availableIP.ip_address}`)

    // Step 4: Assign IP to service
    await sql`
      UPDATE ip_addresses
      SET 
        status = 'assigned',
        customer_id = ${customerId},
        assigned_at = NOW()
      WHERE id = ${availableIP.id}
    `

    // Step 5: Update customer service
    await sql`
      UPDATE customer_services
      SET 
        ip_address = ${availableIP.ip_address}::text,
        device_id = ${routerId}
      WHERE id = ${serviceId}
    `

    // Step 6: Update subnet utilization
    await sql`
      UPDATE ip_subnets
      SET used_ips = (
        SELECT COUNT(*) 
        FROM ip_addresses 
        WHERE subnet_id = ${subnetId} AND status = 'assigned'
      )
      WHERE id = ${subnetId}
    `

    // Step 7: Push configuration to MikroTik router
    try {
      const mikrotik = await createMikroTikClient(routerId)
      if (mikrotik) {
        const [service] = await sql`
          SELECT cs.*, c.first_name, c.last_name, c.email
          FROM customer_services cs
          JOIN customers c ON cs.customer_id = c.id
          WHERE cs.id = ${serviceId}
        `

        if (service && connectionType) {
          // Push configuration based on connection type
          if (connectionType === "pppoe") {
            const username = `${service.first_name.toLowerCase()}_${service.last_name.toLowerCase()}_${customerId}`
            const password = `pppoe_${Math.random().toString(36).substring(7)}`

            await mikrotik.createPPPoESecret(username, password, availableIP.ip_address, "default")
            console.log(`[v0] Created PPPoE secret for ${username}`)
          } else if (connectionType === "dhcp" || connectionType === "static") {
            // For DHCP/Static, create DHCP lease
            const macAddress = "00:00:00:00:00:00" // Placeholder - should be provided
            await mikrotik.assignIP(availableIP.ip_address, macAddress, customerId)
            console.log(`[v0] Created DHCP lease for ${availableIP.ip_address}`)
          }
        }

        await mikrotik.disconnect()
      }
    } catch (routerError) {
      console.error(`[v0] Failed to push configuration to router:`, routerError)
      // Don't fail the allocation if router push fails
    }

    // Step 8: Create sync status record
    await sql`
      INSERT INTO router_sync_status (
        router_id, ip_address_id, customer_service_id, sync_status, last_checked
      ) VALUES (
        ${routerId}, ${availableIP.id}, ${serviceId}, 'synced', NOW()
      )
      ON CONFLICT (router_id, customer_service_id) 
      DO UPDATE SET 
        ip_address_id = ${availableIP.id},
        sync_status = 'synced',
        last_checked = NOW(),
        last_synced = NOW()
    `

    // Step 9: Log the allocation
    await sql`
      INSERT INTO system_logs (
        level, category, message, details, customer_id
      ) VALUES (
        'info', 'ip_management', 
        'IP address allocated to customer service',
        ${JSON.stringify({
          customerId,
          serviceId,
          ipAddress: availableIP.ip_address,
          routerId,
          subnetId,
          connectionType,
        })},
        ${customerId}
      )
    `

    console.log(`[v0] Successfully allocated IP ${availableIP.ip_address} to customer ${customerId}`)

    return {
      success: true,
      ipAddress: availableIP.ip_address,
      routerId,
      subnetId,
    }
  } catch (error) {
    console.error(`[v0] IP allocation error:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to allocate IP address",
    }
  }
}

/**
 * Release an IP address from a customer service
 */
export async function releaseIPAddress(serviceId: number, reason = "Service terminated"): Promise<IPReleaseResult> {
  try {
    console.log(`[v0] Releasing IP for service ${serviceId}, reason: ${reason}`)

    // Get service details
    const [service] = await sql`
      SELECT cs.*, ip.id as ip_address_id, ip.subnet_id
      FROM customer_services cs
      LEFT JOIN ip_addresses ip ON cs.ip_address = ip.ip_address::text
      WHERE cs.id = ${serviceId}
    `

    if (!service) {
      return {
        success: false,
        message: "Service not found",
      }
    }

    if (!service.ip_address) {
      return {
        success: true,
        message: "No IP address assigned to this service",
      }
    }

    console.log(`[v0] Releasing IP ${service.ip_address} from service ${serviceId}`)

    // Remove configuration from MikroTik router
    if (service.device_id) {
      try {
        const mikrotik = await createMikroTikClient(service.device_id)
        if (mikrotik) {
          await mikrotik.releaseIP(service.ip_address)
          await mikrotik.disconnect()
          console.log(`[v0] Released IP ${service.ip_address} on router ${service.device_id}`)
        }
      } catch (routerError) {
        console.error(`[v0] Failed to release IP on router:`, routerError)
        // Continue even if router release fails
      }
    }

    // Update IP address status
    if (service.ip_address_id) {
      await sql`
        UPDATE ip_addresses
        SET 
          status = 'available',
          customer_id = NULL,
          assigned_at = NULL
        WHERE id = ${service.ip_address_id}
      `
    }

    // Update customer service
    await sql`
      UPDATE customer_services
      SET 
        ip_address = NULL,
        device_id = NULL
      WHERE id = ${serviceId}
    `

    // Update subnet utilization
    if (service.subnet_id) {
      await sql`
        UPDATE ip_subnets
        SET used_ips = (
          SELECT COUNT(*) 
          FROM ip_addresses 
          WHERE subnet_id = ${service.subnet_id} AND status = 'assigned'
        )
        WHERE id = ${service.subnet_id}
      `
    }

    // Update sync status
    await sql`
      UPDATE router_sync_status
      SET 
        sync_status = 'released',
        last_checked = NOW()
      WHERE customer_service_id = ${serviceId}
    `

    // Log the release
    await sql`
      INSERT INTO system_logs (
        level, category, message, details, customer_id
      ) VALUES (
        'info', 'ip_management', 
        'IP address released from customer service',
        ${JSON.stringify({
          serviceId,
          ipAddress: service.ip_address,
          customerId: service.customer_id,
          reason,
        })},
        ${service.customer_id}
      )
    `

    console.log(`[v0] Successfully released IP ${service.ip_address}`)

    return {
      success: true,
      message: `IP address ${service.ip_address} released successfully`,
    }
  } catch (error) {
    console.error(`[v0] IP release error:`, error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to release IP address",
    }
  }
}

/**
 * Release all IPs for a customer (when customer is terminated)
 */
export async function releaseAllCustomerIPs(customerId: number): Promise<IPReleaseResult> {
  try {
    console.log(`[v0] Releasing all IPs for customer ${customerId}`)

    // Get all services with IPs for this customer
    const services = await sql`
      SELECT id, ip_address
      FROM customer_services
      WHERE customer_id = ${customerId}
        AND ip_address IS NOT NULL
    `

    let releasedCount = 0
    const errors: string[] = []

    for (const service of services) {
      const result = await releaseIPAddress(service.id, "Customer terminated")
      if (result.success) {
        releasedCount++
      } else {
        errors.push(`Service ${service.id}: ${result.message}`)
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        message: `Released ${releasedCount} IPs, but ${errors.length} failed: ${errors.join(", ")}`,
      }
    }

    return {
      success: true,
      message: `Successfully released ${releasedCount} IP addresses`,
    }
  } catch (error) {
    console.error(`[v0] Error releasing customer IPs:`, error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to release customer IP addresses",
    }
  }
}

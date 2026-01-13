import { getSql } from "@/lib/db"
import { MikroTikAPI } from "./mikrotik-api"

export type VendorType = "mikrotik" | "ubiquiti" | "juniper"
export type ProvisioningMode = "radius_only" | "direct_push" | "hybrid"

export interface VendorProvisioningResult {
  success: boolean
  username?: string
  method?: "radius" | "direct"
  error?: string
  message?: string
}

/**
 * Provision user credentials based on router vendor and provisioning mode
 */
export async function provisionUserCredentials(
  serviceId: number,
  username: string,
  password: string,
  ipAddress?: string,
  profile?: string,
): Promise<VendorProvisioningResult> {
  try {
    const sql = await getSql()

    const serviceResult = await sql`
      SELECT 
        cs.*,
        nd.type as router_vendor,
        nd.customer_auth_method,
        nd.ip_address as router_ip,
        nd.api_port,
        nd.ssh_port,
        nd.username as router_username,
        nd.password as router_password,
        nd.configuration->>'provisioning_mode' as provisioning_mode
      FROM customer_services cs
      LEFT JOIN network_devices nd ON cs.router_id = nd.id
      WHERE cs.id = ${serviceId}
    `

    if (serviceResult.length === 0) {
      throw new Error("Service not found")
    }

    const service = serviceResult[0]
    const provisioningMode: ProvisioningMode = (service.provisioning_mode as ProvisioningMode) || "radius_only"
    const vendor: VendorType = (service.router_vendor?.toLowerCase() as VendorType) || "mikrotik"

    console.log(`[v0] Provisioning ${username} - Vendor: ${vendor}, Mode: ${provisioningMode}`)

    // RADIUS-only mode: Store in RADIUS tables, router pulls via RADIUS
    if (provisioningMode === "radius_only") {
      await provisionToRadius(username, password, ipAddress, profile)
      return {
        success: true,
        username,
        method: "radius",
        message: "Credentials stored in RADIUS - router will authenticate via RADIUS",
      }
    }

    // Direct push mode: Write directly to router
    if (provisioningMode === "direct_push") {
      if (!service.router_ip || !service.router_username || !service.router_password) {
        throw new Error("Router credentials not configured for direct push")
      }

      await provisionDirectToRouter(
        vendor,
        {
          host: service.router_ip,
          port: service.api_port || 8728,
          username: service.router_username,
          password: service.router_password,
        },
        username,
        password,
        ipAddress,
        profile,
      )

      return {
        success: true,
        username,
        method: "direct",
        message: "Credentials pushed directly to router",
      }
    }

    // Hybrid mode: Both RADIUS and direct push
    if (provisioningMode === "hybrid") {
      await provisionToRadius(username, password, ipAddress, profile)

      if (service.router_ip && service.router_username && service.router_password) {
        await provisionDirectToRouter(
          vendor,
          {
            host: service.router_ip,
            port: service.api_port || 8728,
            username: service.router_username,
            password: service.router_password,
          },
          username,
          password,
          ipAddress,
          profile,
        )
      }

      return {
        success: true,
        username,
        method: "radius",
        message: "Credentials stored in RADIUS and pushed to router",
      }
    }

    throw new Error(`Unknown provisioning mode: ${provisioningMode}`)
  } catch (error) {
    console.error("[v0] Vendor provisioning error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown provisioning error",
    }
  }
}

/**
 * Store credentials in RADIUS tables for router authentication
 */
async function provisionToRadius(
  username: string,
  password: string,
  ipAddress?: string,
  profile?: string,
): Promise<void> {
  const sql = await getSql()

  console.log(`[v0] Storing ${username} in RADIUS tables`)

  await sql`
    DELETE FROM radcheck 
    WHERE username = ${username} AND attribute = 'Cleartext-Password'
  `

  await sql`
    INSERT INTO radcheck (username, attribute, op, value)
    VALUES 
      (${username}, 'Cleartext-Password', ':=', ${password})
  `

  if (ipAddress) {
    await sql`
      DELETE FROM radreply 
      WHERE username = ${username} AND attribute = 'Framed-IP-Address'
    `

    await sql`
      INSERT INTO radreply (username, attribute, op, value)
      VALUES 
        (${username}, 'Framed-IP-Address', ':=', ${ipAddress})
    `
  }

  if (profile) {
    // Example: MikroTik rate limit attribute
    await sql`
      DELETE FROM radreply 
      WHERE username = ${username} AND attribute = 'Mikrotik-Rate-Limit'
    `

    await sql`
      INSERT INTO radreply (username, attribute, op, value)
      VALUES 
        (${username}, 'Mikrotik-Rate-Limit', ':=', ${profile})
    `
  }

  console.log(`[v0] Credentials stored in RADIUS for ${username}`)
}

/**
 * Push credentials directly to router (vendor-specific)
 */
async function provisionDirectToRouter(
  vendor: VendorType,
  routerConfig: { host: string; port: number; username: string; password: string },
  username: string,
  password: string,
  ipAddress?: string,
  profile?: string,
): Promise<void> {
  console.log(`[v0] Pushing ${username} directly to ${vendor} router`)

  switch (vendor) {
    case "mikrotik":
      await provisionToMikroTik(routerConfig, username, password, ipAddress, profile)
      break

    case "ubiquiti":
      await provisionToUbiquiti(routerConfig, username, password, ipAddress)
      break

    case "juniper":
      await provisionToJuniper(routerConfig, username, password, ipAddress)
      break

    default:
      throw new Error(`Unsupported vendor: ${vendor}`)
  }

  console.log(`[v0] Credentials pushed to ${vendor} router for ${username}`)
}

/**
 * Push PPPoE secret to MikroTik router via API
 */
async function provisionToMikroTik(
  config: { host: string; port: number; username: string; password: string },
  username: string,
  password: string,
  ipAddress?: string,
  profile?: string,
): Promise<void> {
  const mikrotik = new MikroTikAPI(config)
  await mikrotik.connect()

  const result = await mikrotik.createPPPoESecret(username, password, ipAddress || "auto", profile || "default")

  await mikrotik.disconnect()

  if (!result.success) {
    throw new Error(`MikroTik API error: ${result.error}`)
  }
}

/**
 * Push credentials to Ubiquiti router via SSH/API
 */
async function provisionToUbiquiti(
  config: { host: string; port: number; username: string; password: string },
  username: string,
  password: string,
  ipAddress?: string,
): Promise<void> {
  console.log(`[v0] Ubiquiti direct push not yet implemented - use RADIUS mode`)
  throw new Error("Ubiquiti direct push requires SSH implementation")
}

/**
 * Push credentials to Juniper router via NETCONF/CLI
 */
async function provisionToJuniper(
  config: { host: string; port: number; username: string; password: string },
  username: string,
  password: string,
  ipAddress?: string,
): Promise<void> {
  console.log(`[v0] Juniper direct push not yet implemented - use RADIUS mode`)
  throw new Error("Juniper direct push requires NETCONF implementation")
}

/**
 * Delete user credentials from router (vendor-specific)
 */
export async function deprovisionUserCredentials(serviceId: number, username: string): Promise<void> {
  const sql = await getSql()

  const serviceResult = await sql`
    SELECT 
      nd.type as router_vendor,
      nd.ip_address as router_ip,
      nd.api_port,
      nd.username as router_username,
      nd.password as router_password,
      nd.configuration->>'provisioning_mode' as provisioning_mode
    FROM customer_services cs
    LEFT JOIN network_devices nd ON cs.router_id = nd.id
    WHERE cs.id = ${serviceId}
  `

  if (serviceResult.length === 0) return

  const service = serviceResult[0]
  const provisioningMode: ProvisioningMode = (service.provisioning_mode as ProvisioningMode) || "radius_only"

  // Remove from RADIUS tables
  if (provisioningMode === "radius_only" || provisioningMode === "hybrid") {
    await sql`DELETE FROM radcheck WHERE username = ${username}`
    await sql`DELETE FROM radreply WHERE username = ${username}`
  }

  // Remove from router directly
  if (
    (provisioningMode === "direct_push" || provisioningMode === "hybrid") &&
    service.router_ip &&
    service.router_username &&
    service.router_password
  ) {
    const vendor: VendorType = (service.router_vendor?.toLowerCase() as VendorType) || "mikrotik"

    if (vendor === "mikrotik") {
      const mikrotik = new MikroTikAPI({
        host: service.router_ip,
        port: service.api_port || 8728,
        username: service.router_username,
        password: service.router_password,
      })
      await mikrotik.connect()
      await mikrotik.deletePPPoESecret(username)
      await mikrotik.disconnect()
    }
  }

  console.log(`[v0] Deprovisioned credentials for ${username}`)
}

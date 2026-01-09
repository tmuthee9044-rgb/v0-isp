/**
 * Direct Router Push API - Push PPPoE users and IPs directly to routers
 * Bypasses RADIUS for immediate provisioning
 */

import { MikroTikAPI } from "./mikrotik-api"
import { getSql } from "./db"

export interface RouterPushConfig {
  routerId: number
  username: string
  password: string
  profile?: string
  staticIp?: string
  pushToRouter: boolean
}

export interface RouterInfo {
  id: number
  name: string
  type: string
  ip_address: string
  port: number
  username: string
  password: string
  api_username?: string
  api_password?: string
}

/**
 * Push PPPoE user directly to MikroTik router
 */
async function pushToMikroTik(router: RouterInfo, config: RouterPushConfig): Promise<boolean> {
  try {
    console.log(`[v0] Pushing PPPoE user ${config.username} to MikroTik ${router.name}`)

    const api = new MikroTikAPI({
      host: router.ip_address,
      port: router.port || 8728,
      username: router.api_username || router.username,
      password: router.api_password || router.password,
    })

    await api.connect()

    // Add PPP secret
    const result = await api.execute("/ppp/secret/add", "PUT", {
      name: config.username,
      password: config.password,
      profile: config.profile || "default",
      service: "pppoe",
      "local-address": config.staticIp || "",
    })

    if (result.success) {
      console.log(`[v0] Successfully pushed user to MikroTik ${router.name}`)
      return true
    } else {
      throw new Error(result.error || "Failed to add PPP secret")
    }
  } catch (error) {
    console.error(`[v0] MikroTik push error:`, error)
    throw error
  }
}

/**
 * Push PPPoE user directly to Ubiquiti EdgeRouter
 */
async function pushToUbiquiti(router: RouterInfo, config: RouterPushConfig): Promise<boolean> {
  try {
    console.log(`[v0] Pushing PPPoE user ${config.username} to Ubiquiti ${router.name}`)

    // Ubiquiti EdgeRouter uses SSH for configuration
    // This requires an SSH library (not implemented in browser environment)
    // In production, this would use an SSH client or EdgeRouter API

    console.log(`[v0] Ubiquiti push requires SSH - using queue for async processing`)

    // Log to provisioning queue for background worker to process
    const sql = getSql()
    await sql`
      INSERT INTO provisioning_queue (router_id, action, username, password, status)
      VALUES (${router.id}, 'add_pppoe_user', ${config.username}, ${config.password}, 'pending')
    `

    return true
  } catch (error) {
    console.error(`[v0] Ubiquiti push error:`, error)
    throw error
  }
}

/**
 * Push PPPoE user directly to Juniper router
 */
async function pushToJuniper(router: RouterInfo, config: RouterPushConfig): Promise<boolean> {
  try {
    console.log(`[v0] Pushing PPPoE user ${config.username} to Juniper ${router.name}`)

    // Juniper uses NETCONF/SSH for configuration
    // This requires a NETCONF library (not implemented in browser environment)

    console.log(`[v0] Juniper push requires NETCONF - using queue for async processing`)

    // Log to provisioning queue for background worker to process
    const sql = getSql()
    await sql`
      INSERT INTO provisioning_queue (router_id, action, username, password, status)
      VALUES (${router.id}, 'add_pppoe_user', ${config.username}, ${config.password}, 'pending')
    `

    return true
  } catch (error) {
    console.error(`[v0] Juniper push error:`, error)
    throw error
  }
}

/**
 * Main router push function - detects vendor and pushes accordingly
 */
export async function pushUserToRouter(config: RouterPushConfig): Promise<{
  success: boolean
  message: string
  method: "direct" | "queued"
}> {
  try {
    const sql = getSql()

    // Get router info
    const routers = await sql`
      SELECT id, name, type, ip_address, port, username, password, api_username, api_password
      FROM network_devices
      WHERE id = ${config.routerId}
      LIMIT 1
    `

    if (routers.length === 0) {
      throw new Error(`Router ${config.routerId} not found`)
    }

    const router = routers[0] as RouterInfo
    const vendor = router.type?.toLowerCase() || ""

    // Route to appropriate vendor handler
    if (vendor.includes("mikrotik")) {
      await pushToMikroTik(router, config)
      return {
        success: true,
        message: `User pushed directly to MikroTik router ${router.name}`,
        method: "direct",
      }
    } else if (vendor.includes("ubiquiti") || vendor.includes("edgerouter")) {
      await pushToUbiquiti(router, config)
      return {
        success: true,
        message: `User queued for Ubiquiti router ${router.name}`,
        method: "queued",
      }
    } else if (vendor.includes("juniper")) {
      await pushToJuniper(router, config)
      return {
        success: true,
        message: `User queued for Juniper router ${router.name}`,
        method: "queued",
      }
    } else {
      throw new Error(`Unsupported router vendor: ${router.type}`)
    }
  } catch (error) {
    console.error(`[v0] Router push error:`, error)
    throw error
  }
}

/**
 * Remove PPPoE user from router
 */
export async function removeUserFromRouter(routerId: number, username: string): Promise<boolean> {
  try {
    const sql = getSql()

    const routers = await sql`
      SELECT id, name, type, ip_address, port, username, password, api_username, api_password
      FROM network_devices
      WHERE id = ${routerId}
      LIMIT 1
    `

    if (routers.length === 0) {
      throw new Error(`Router ${routerId} not found`)
    }

    const router = routers[0] as RouterInfo
    const vendor = router.type?.toLowerCase() || ""

    if (vendor.includes("mikrotik")) {
      const api = new MikroTikAPI({
        host: router.ip_address,
        port: router.port || 8728,
        username: router.api_username || router.username,
        password: router.api_password || router.password,
      })

      await api.connect()

      // Find and remove PPP secret
      const secrets = await api.execute("/ppp/secret/print", "GET", { name: username })

      if (secrets.data && secrets.data.length > 0) {
        const secretId = secrets.data[0][".id"]
        await api.execute(`/ppp/secret/remove`, "DELETE", { ".id": secretId })
        console.log(`[v0] Removed user ${username} from MikroTik ${router.name}`)
      }

      return true
    } else {
      // Queue for async processing
      await sql`
        INSERT INTO provisioning_queue (router_id, action, username, status)
        VALUES (${routerId}, 'remove_pppoe_user', ${username}, 'pending')
      `
      return true
    }
  } catch (error) {
    console.error(`[v0] Router removal error:`, error)
    throw error
  }
}

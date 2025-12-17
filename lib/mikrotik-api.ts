import { getSql } from "@/lib/db"
import { fetch } from "node-fetch"
import { AbortSignal } from "abort-controller"

export interface MikroTikConfig {
  host: string
  port: number
  username: string
  password: string
  timeout?: number
  useSSL?: boolean
}

export interface MikroTikCommand {
  command: string
  params?: Record<string, string>
}

export interface MikroTikResponse {
  success: boolean
  data?: any
  error?: string
}

/**
 * MikroTik RouterOS API Client using HTTP/REST API
 * Implements the RouterOS REST API protocol for managing MikroTik routers
 */
export class MikroTikAPI {
  private config: MikroTikConfig
  private connected = false
  private baseUrl: string
  private authHeader: string

  constructor(config: MikroTikConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || 10000,
      useSSL: config.useSSL || false,
    }

    // MikroTik REST API is available on the web port (80/443 by default)
    const protocol = this.config.useSSL ? "https" : "http"
    const webPort = this.config.useSSL ? 443 : 80
    this.baseUrl = `${protocol}://${this.config.host}:${webPort}/rest`

    // Create Basic Auth header
    const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")
    this.authHeader = `Basic ${credentials}`
  }

  /**
   * Connect to the MikroTik router (test connection)
   */
  async connect(): Promise<boolean> {
    try {
      console.log(`[v0] Connecting to MikroTik router at ${this.config.host}`)

      if (!this.config.host) {
        throw new Error("Missing required parameter: host")
      }
      if (!this.config.username) {
        throw new Error("Missing required parameter: username")
      }
      if (!this.config.password) {
        throw new Error(
          "Missing required parameter: password. Please set the MikroTik password in router configuration.",
        )
      }

      // Test connection by fetching system identity
      const result = await this.execute("/system/identity")

      if (result.success) {
        this.connected = true
        console.log(`[v0] Successfully connected to MikroTik router at ${this.config.host}`)
        return true
      } else {
        throw new Error(result.error || "Connection test failed")
      }
    } catch (error) {
      console.error(`[v0] MikroTik connection error:`, error)
      this.connected = false
      throw error
    }
  }

  /**
   * Execute a REST API command on the MikroTik router
   */
  async execute(path: string, method = "GET", params?: Record<string, any>): Promise<MikroTikResponse> {
    try {
      console.log(`[v0] Executing MikroTik ${method} ${path}`, params)

      const url = `${this.baseUrl}${path}`
      const options: RequestInit = {
        method,
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(this.config.timeout || 10000),
      }

      if (method !== "GET" && params) {
        options.body = JSON.stringify(params)
      }

      const response = await fetch(url, options)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log(`[v0] MikroTik command result:`, data)

      return {
        success: true,
        data: data,
      }
    } catch (error: any) {
      console.error(`[v0] MikroTik command execution error:`, error)
      return {
        success: false,
        error: error.message || "Unknown error",
      }
    }
  }

  /**
   * Assign IP address to customer
   */
  async assignIP(ipAddress: string, macAddress: string, customerId: number): Promise<MikroTikResponse> {
    const params = {
      address: ipAddress,
      "mac-address": macAddress,
      comment: `Customer_${customerId}`,
      server: "dhcp1",
    }

    return await this.execute("/ip/dhcp-server/lease", "PUT", params)
  }

  /**
   * Release IP address from customer
   */
  async releaseIP(ipAddress: string): Promise<MikroTikResponse> {
    return await this.execute(`/ip/dhcp-server/lease/${ipAddress}`, "DELETE")
  }

  /**
   * Create PPPoE secret for customer
   */
  async createPPPoESecret(
    username: string,
    password: string,
    ipAddress: string,
    profile: string,
  ): Promise<MikroTikResponse> {
    const params = {
      name: username,
      password: password,
      "local-address": ipAddress,
      profile: profile,
    }

    return await this.execute("/ppp/secret", "PUT", params)
  }

  /**
   * Remove PPPoE secret
   */
  async removePPPoESecret(username: string): Promise<MikroTikResponse> {
    return await this.execute(`/ppp/secret/${username}`, "DELETE")
  }

  /**
   * Suspend PPPoE service
   */
  async suspendPPPoE(username: string): Promise<MikroTikResponse> {
    const params = {
      disabled: "yes",
    }

    return await this.execute(`/ppp/secret/${username}`, "PATCH", params)
  }

  /**
   * Reactivate PPPoE service
   */
  async reactivatePPPoE(username: string, profile: string): Promise<MikroTikResponse> {
    const params = {
      disabled: "no",
      profile: profile,
    }

    return await this.execute(`/ppp/secret/${username}`, "PATCH", params)
  }

  /**
   * Get router system resources
   */
  async getSystemResources(): Promise<MikroTikResponse> {
    return await this.execute("/system/resource")
  }

  /**
   * Get active PPPoE sessions
   */
  async getActivePPPoESessions(): Promise<MikroTikResponse> {
    return await this.execute("/ppp/active")
  }

  /**
   * Get IP address pool information
   */
  async getIPPool(poolName: string): Promise<MikroTikResponse> {
    return await this.execute(`/ip/pool?name=${poolName}`)
  }

  /**
   * Add firewall rule for customer
   */
  async addFirewallRule(ipAddress: string, action = "accept", comment?: string): Promise<MikroTikResponse> {
    const params = {
      chain: "forward",
      "src-address": ipAddress,
      action: action,
      comment: comment || `Rule for ${ipAddress}`,
    }
    return await this.execute("/ip/firewall/filter", "PUT", params)
  }

  /**
   * Remove firewall rule by comment
   */
  async removeFirewallRule(comment: string): Promise<MikroTikResponse> {
    // First find the rule by comment
    const rules = await this.execute(`/ip/firewall/filter?comment=${encodeURIComponent(comment)}`)
    if (rules.success && rules.data && rules.data.length > 0) {
      const ruleId = rules.data[0][".id"]
      return await this.execute(`/ip/firewall/filter/${ruleId}`, "DELETE")
    }
    return { success: false, error: "Rule not found" }
  }

  /**
   * Get router interface statistics
   */
  async getInterfaceStats(): Promise<MikroTikResponse> {
    return await this.execute("/interface")
  }

  /**
   * Add address to router
   */
  async addAddress(ipAddress: string, networkInterface: string): Promise<MikroTikResponse> {
    const params = {
      address: ipAddress,
      interface: networkInterface,
    }
    return await this.execute("/ip/address", "PUT", params)
  }

  /**
   * Remove address from router
   */
  async removeAddress(ipAddress: string): Promise<MikroTikResponse> {
    return await this.execute(`/ip/address/${ipAddress}`, "DELETE")
  }

  /**
   * Get DHCP leases
   */
  async getDHCPLeases(): Promise<MikroTikResponse> {
    return await this.execute("/ip/dhcp-server/lease")
  }

  /**
   * Get router identity
   */
  async getIdentity(): Promise<MikroTikResponse> {
    return await this.execute("/system/identity")
  }

  /**
   * Get interface list
   */
  async getInterfaces(): Promise<MikroTikResponse> {
    return await this.execute("/interface")
  }

  /**
   * Get system logs
   */
  async getLogs(): Promise<MikroTikResponse> {
    return await this.execute("/log")
  }

  /**
   * Disconnect the API connection (cleanup)
   */
  async disconnect(): Promise<void> {
    console.log(`[v0] Disconnecting from MikroTik router`)
    this.connected = false
  }
}

/**
 * Create MikroTik API client from router configuration
 */
export async function createMikroTikClient(routerId: number): Promise<MikroTikAPI | null> {
  try {
    const sql = await getSql()

    // Fetch router configuration from database
    const [router] = await sql`
      SELECT 
        nd.*,
        nd.configuration->>'mikrotik_user' as mikrotik_user,
        nd.configuration->>'mikrotik_password' as mikrotik_password,
        nd.configuration->>'api_port' as config_api_port
      FROM network_devices nd
      WHERE nd.id = ${routerId}
        AND nd.type = 'mikrotik'
    `

    if (!router) {
      console.error(`[v0] Router ${routerId} not found or not a MikroTik router`)
      return null
    }

    const mikrotikUser = router.mikrotik_user || router.api_username || router.username || "admin"
    const mikrotikPassword = router.mikrotik_password || router.api_password || router.password

    if (!mikrotikUser) {
      throw new Error("MikroTik username not configured. Please set API username in router configuration.")
    }
    if (!mikrotikPassword) {
      throw new Error("MikroTik password not configured. Please set API password in router configuration.")
    }

    const apiPort = router.config_api_port
      ? Number.parseInt(router.config_api_port)
      : router.api_port || router.port || 8728

    const config: MikroTikConfig = {
      host: router.ip_address,
      port: apiPort,
      username: mikrotikUser,
      password: mikrotikPassword,
    }

    console.log(
      `[v0] Creating MikroTik client for router ${routerId} with host ${config.host}:${config.port}, user: ${config.username}`,
    )

    const client = new MikroTikAPI(config)
    const connected = await client.connect()

    if (!connected) {
      console.error(`[v0] Failed to connect to MikroTik router ${routerId}`)
      return null
    }

    return client
  } catch (error) {
    console.error(`[v0] Error creating MikroTik client:`, error)
    throw error // Rethrow so the error message is visible to the caller
  }
}

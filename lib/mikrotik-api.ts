import { RouterOSAPI } from "node-routeros"
import { getSql } from "@/lib/db"

export interface MikroTikConfig {
  host: string
  port: number
  username: string
  password: string
  timeout?: number
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
 * MikroTik RouterOS API Client
 * Implements the RouterOS API protocol for managing MikroTik routers
 */
export class MikroTikAPI {
  private config: MikroTikConfig
  private connected = false
  private client: RouterOSAPI | null = null

  constructor(config: MikroTikConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || 10000,
    }
  }

  /**
   * Connect to the MikroTik router
   */
  async connect(): Promise<boolean> {
    try {
      console.log(`[v0] Connecting to MikroTik router at ${this.config.host}:${this.config.port}`)

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

      this.client = new RouterOSAPI({
        host: this.config.host,
        user: this.config.username,
        password: this.config.password,
        port: this.config.port,
        timeout: this.config.timeout,
      })

      await this.client.connect()
      this.connected = true

      console.log(`[v0] Successfully connected to MikroTik router at ${this.config.host}:${this.config.port}`)
      return true
    } catch (error) {
      console.error(`[v0] MikroTik connection error:`, error)
      this.connected = false
      this.client = null
      throw error
    }
  }

  /**
   * Execute a command on the MikroTik router
   */
  async execute(command: string, params?: Record<string, string>): Promise<MikroTikResponse> {
    if (!this.connected || !this.client) {
      return {
        success: false,
        error: "Not connected to router",
      }
    }

    try {
      console.log(`[v0] Executing MikroTik command: ${command}`, params)

      const result = await this.client.write(command, params || {})

      console.log(`[v0] MikroTik command result:`, result)

      return {
        success: true,
        data: result,
      }
    } catch (error) {
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
    const command = "/ip/dhcp-server/lease/add"
    const params = {
      address: ipAddress,
      "mac-address": macAddress,
      comment: `Customer_${customerId}`,
      server: "dhcp1",
    }

    return await this.execute(command, params)
  }

  /**
   * Release IP address from customer
   */
  async releaseIP(ipAddress: string): Promise<MikroTikResponse> {
    const command = "/ip/dhcp-server/lease/remove"
    const params = {
      address: ipAddress,
    }

    return await this.execute(command, params)
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
    const command = "/ppp/secret/add"
    const params = {
      name: username,
      password: password,
      "local-address": ipAddress,
      profile: profile,
    }

    return await this.execute(command, params)
  }

  /**
   * Remove PPPoE secret
   */
  async removePPPoESecret(username: string): Promise<MikroTikResponse> {
    const command = "/ppp/secret/remove"
    const params = {
      numbers: username,
    }

    return await this.execute(command, params)
  }

  /**
   * Suspend PPPoE service
   */
  async suspendPPPoE(username: string): Promise<MikroTikResponse> {
    const command = "/ppp/secret/set"
    const params = {
      numbers: username,
      disabled: "yes",
    }

    return await this.execute(command, params)
  }

  /**
   * Reactivate PPPoE service
   */
  async reactivatePPPoE(username: string, profile: string): Promise<MikroTikResponse> {
    const command = "/ppp/secret/set"
    const params = {
      numbers: username,
      disabled: "no",
      profile: profile,
    }

    return await this.execute(command, params)
  }

  /**
   * Get router system resources
   */
  async getSystemResources(): Promise<MikroTikResponse> {
    const command = "/system/resource/print"
    return await this.execute(command)
  }

  /**
   * Get active PPPoE sessions
   */
  async getActivePPPoESessions(): Promise<MikroTikResponse> {
    const command = "/ppp/active/print"
    return await this.execute(command)
  }

  /**
   * Get IP address pool information
   */
  async getIPPool(poolName: string): Promise<MikroTikResponse> {
    const command = "/ip/pool/print"
    const params = {
      name: poolName,
    }
    return await this.execute(command, params)
  }

  /**
   * Add firewall rule for customer
   */
  async addFirewallRule(ipAddress: string, action = "accept", comment?: string): Promise<MikroTikResponse> {
    const command = "/ip/firewall/filter/add"
    const params = {
      chain: "forward",
      "src-address": ipAddress,
      action: action,
      comment: comment || `Rule for ${ipAddress}`,
    }
    return await this.execute(command, params)
  }

  /**
   * Remove firewall rule by comment
   */
  async removeFirewallRule(comment: string): Promise<MikroTikResponse> {
    const command = "/ip/firewall/filter/remove"
    const params = {
      comment: comment,
    }
    return await this.execute(command, params)
  }

  /**
   * Get router interface statistics
   */
  async getInterfaceStats(): Promise<MikroTikResponse> {
    const command = "/interface/print"
    const params = {
      stats: "yes",
    }
    return await this.execute(command, params)
  }

  /**
   * Add address to router
   */
  async addAddress(ipAddress: string, networkInterface: string): Promise<MikroTikResponse> {
    const command = "/ip/address/add"
    const params = {
      address: ipAddress,
      interface: networkInterface,
    }
    return await this.execute(command, params)
  }

  /**
   * Remove address from router
   */
  async removeAddress(ipAddress: string): Promise<MikroTikResponse> {
    const command = "/ip/address/remove"
    const params = {
      address: ipAddress,
    }
    return await this.execute(command, params)
  }

  /**
   * Get DHCP leases
   */
  async getDHCPLeases(): Promise<MikroTikResponse> {
    const command = "/ip/dhcp-server/lease/print"
    return await this.execute(command)
  }

  /**
   * Get router identity
   */
  async getIdentity(): Promise<MikroTikResponse> {
    const command = "/system/identity/print"
    return await this.execute(command)
  }

  /**
   * Disconnect the API connection
   */
  async disconnect(): Promise<void> {
    console.log(`[v0] Disconnecting from MikroTik router`)
    if (this.client) {
      try {
        await this.client.close()
      } catch (error) {
        console.error(`[v0] Error closing MikroTik connection:`, error)
      }
      this.client = null
    }
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

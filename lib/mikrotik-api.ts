import { getSql } from "@/lib/db"
// import { fetch } from "node-fetch"
// import { AbortController } from "abort-controller"

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

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 10000)

      const options: RequestInit = {
        method,
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      }

      if (method !== "GET" && params) {
        options.body = JSON.stringify(params)
      }

      const response = await fetch(url, options)

      clearTimeout(timeoutId)

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
   * The local-address is the gateway/router IP for the PPPoE server
   * The remote-address is the customer's assigned IP address
   */
  async createPPPoESecret(
    username: string,
    password: string,
    remoteAddress: string,
    profile: string,
    localAddress?: string,
  ): Promise<MikroTikResponse> {
    const params: any = {
      name: username,
      password: password,
      service: "pppoe",
      profile: profile || "default",
      comment: `ISP_System_${username}`,
    }

    // Set customer IP as remote-address (the IP they will get)
    if (remoteAddress && remoteAddress !== "0.0.0.0" && remoteAddress !== "auto") {
      params["remote-address"] = remoteAddress
    }

    // Optionally set local-address (router gateway IP)
    if (localAddress) {
      params["local-address"] = localAddress
    }

    console.log("[v0] Creating PPPoE secret with params:", { ...params, password: "***" })

    // Try POST first (RouterOS v7+), fallback to PUT if needed
    let result = await this.execute("/ppp/secret", "POST", params)

    if (!result.success && result.error?.includes("method not allowed")) {
      console.log("[v0] POST failed, trying PUT method...")
      result = await this.execute("/ppp/secret", "PUT", params)
    }

    return result
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
   * Get active PPPoE sessions with parsed data
   * Returns an array of active PPPoE sessions with user-friendly field names
   */
  async getPPPoEActiveSessions(): Promise<any[]> {
    try {
      const result = await this.execute("/ppp/active")

      if (!result.success || !result.data) {
        return []
      }

      const sessions = Array.isArray(result.data) ? result.data : [result.data]

      return sessions.map((session: any) => ({
        id: session[".id"],
        name: session.name,
        service: session.service,
        caller_id: session["caller-id"],
        address: session.address,
        uptime: session.uptime,
        encoding: session.encoding,
        session_id: session["session-id"],
        limit_bytes_in: session["limit-bytes-in"],
        limit_bytes_out: session["limit-bytes-out"],
        radius: session.radius,
        // Data transfer stats
        rx_bytes: Number.parseInt(session["rx-bytes"] || "0"),
        tx_bytes: Number.parseInt(session["tx-bytes"] || "0"),
      }))
    } catch (error) {
      console.error("[v0] Error getting PPPoE active sessions:", error)
      return []
    }
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
   * Monitor interface traffic in real-time
   * Returns current traffic rates for all interfaces
   */
  async monitorInterfaceTraffic(interfaceName?: string): Promise<MikroTikResponse> {
    try {
      // MikroTik REST API for monitor-traffic works better with POST
      const path = "/interface/monitor-traffic"

      const params: any = {
        once: true,
      }

      if (interfaceName) {
        params.interface = interfaceName
      }

      console.log(`[v0] Monitoring interface traffic with params:`, params)
      const result = await this.execute(path, "POST", params)

      if (!result.success || !result.data) {
        return result
      }

      // Transform the monitoring data to a consistent format
      const interfaces = Array.isArray(result.data) ? result.data : [result.data]

      const trafficData = interfaces.map((iface: any) => ({
        name: iface.name || interfaceName || "unknown",
        rxBps: Number.parseInt(iface["rx-bits-per-second"] || "0"),
        txBps: Number.parseInt(iface["tx-bits-per-second"] || "0"),
        rxPps: Number.parseInt(iface["rx-packets-per-second"] || "0"),
        txPps: Number.parseInt(iface["tx-packets-per-second"] || "0"),
        rxByte: Number.parseInt(iface["rx-byte"] || "0"),
        txByte: Number.parseInt(iface["tx-byte"] || "0"),
        timestamp: new Date().toISOString(),
      }))

      return {
        success: true,
        data: trafficData,
      }
    } catch (error: any) {
      console.error("[v0] Error monitoring interface traffic:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Get system logs with proper filtering and parsing
   */
  async getLogs(topics?: string[], limit = 100): Promise<any[]> {
    try {
      const path = "/log"

      console.log(`[v0] Fetching logs from path: ${path}`)

      const result = await this.execute(path)

      if (!result.success || !result.data) {
        console.error("[v0] Failed to fetch logs:", result.error)
        return []
      }

      const logs = Array.isArray(result.data) ? result.data : [result.data]

      console.log(`[v0] Received ${logs.length} log entries from MikroTik`)

      let transformedLogs = logs.map((log: any, index: number) => ({
        id: log[".id"] || `log-${index}`,
        time: log.time || new Date().toISOString(),
        topics: log.topics || "system",
        message: log.message || "",
        level: this.mapLogLevel(log.topics),
        source: "mikrotik",
      }))

      if (topics && topics.length > 0) {
        transformedLogs = transformedLogs.filter((log) => {
          const logTopics = log.topics.toLowerCase()
          return topics.some((topic) => logTopics.includes(topic.toLowerCase()))
        })
      }

      if (limit && limit > 0) {
        transformedLogs = transformedLogs.slice(0, limit)
      }

      console.log(`[v0] Returning ${transformedLogs.length} filtered logs`)

      return transformedLogs
    } catch (error) {
      console.error("[v0] Error fetching logs:", error)
      return []
    }
  }

  /**
   * Map MikroTik log topics to severity levels
   */
  private mapLogLevel(topics: string): string {
    if (!topics) return "info"

    const topicsLower = topics.toLowerCase()
    if (topicsLower.includes("error") || topicsLower.includes("critical")) return "error"
    if (topicsLower.includes("warning")) return "warning"
    if (topicsLower.includes("info") || topicsLower.includes("system")) return "info"
    return "debug"
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
export async function createMikroTikClient(routerId: number): Promise<MikroTikAPI | null>
export async function createMikroTikClient(
  routerId: number,
  host: string,
  port: number,
  username: string,
  password: string,
  useSSL?: boolean,
): Promise<MikroTikAPI>
export async function createMikroTikClient(
  routerId: number,
  host?: string,
  port?: number,
  username?: string,
  password?: string,
  useSSL?: boolean,
): Promise<MikroTikAPI | null> {
  try {
    if (host && username && password) {
      const config: MikroTikConfig = {
        host,
        port: port || 443,
        username,
        password,
        useSSL: useSSL !== false,
      }

      console.log(`[v0] Creating MikroTik client with direct parameters for router ${routerId}`)
      const client = new MikroTikAPI(config)
      await client.connect()
      return client
    }

    const sql = await getSql()

    if (typeof routerId !== "number" || isNaN(routerId)) {
      throw new Error(
        `Invalid routerId parameter. Expected number, got: ${typeof routerId}. Value: ${JSON.stringify(routerId).substring(0, 100)}`,
      )
    }

    console.log(`[v0] Creating MikroTik client for router ID: ${routerId}`)

    // Fetch router configuration from database
    const routers = await sql`
      SELECT 
        nd.*,
        nd.configuration->>'mikrotik_user' as mikrotik_user,
        nd.configuration->>'mikrotik_password' as mikrotik_password,
        nd.configuration->>'api_port' as config_api_port
      FROM network_devices nd
      WHERE nd.id = ${routerId}
        AND nd.type = 'mikrotik'
    `

    if (!routers || routers.length === 0) {
      console.error(`[v0] Router ${routerId} not found or not a MikroTik router`)
      return null
    }

    const router = routers[0]

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

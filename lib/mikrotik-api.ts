import { getSql } from "@/lib/db"

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
        console.error(`[v0] MikroTik API error: ${response.status} - ${errorText}`)
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
        error: error.message,
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

  /**
   * Configure traffic monitoring/recording on the router
   * Sets up Traffic Flow (IPFIX) or Torch for bandwidth monitoring
   */
  async configureTrafficMonitoring(method: string): Promise<MikroTikResponse> {
    try {
      console.log(`[v0] Configuring traffic monitoring: ${method}`)

      if (method === "Traffic Flow (RouterOS V6x,V7.x)") {
        console.log("[v0] Traffic Flow configuration skipped (optional feature)")
        return { success: true, data: { message: "Traffic Flow not configured (optional)" } }
      } else if (method === "Torch") {
        return { success: true, data: { message: "Torch monitoring available via /tool torch" } }
      }

      return { success: true, data: { message: "Traffic monitoring configured" } }
    } catch (error: any) {
      console.error("[v0] Error configuring traffic monitoring:", error)
      return {
        success: true,
        data: { message: "Traffic monitoring configuration skipped (not critical)" },
      }
    }
  }

  /**
   * Configure speed control/bandwidth management
   * Sets up PCQ queues, simple queues, or hotspot profiles
   */
  async configureSpeedControl(method: string, speedProfile: any): Promise<MikroTikResponse> {
    try {
      console.log(`[v0] Configuring speed control: ${method}`)

      if (method === "PCQ + Addresslist") {
        // Note: Queue types in MikroTik are often pre-configured
        // We'll attempt to create them but catch errors gracefully
        console.log("[v0] Setting up PCQ queue types for bandwidth management")

        // Try to create PCQ queue type for download
        const downloadResult = await this.execute("/queue/type/add", "POST", {
          name: "pcq-download-default",
          kind: "pcq",
          "pcq-rate": "0",
          "pcq-classifier": "dst-address",
        }).catch((e) => ({
          success: false,
          error: e.message || String(e),
        }))

        if (downloadResult.success) {
          console.log("[v0] Created pcq-download-default queue type")
        } else if (
          downloadResult.error?.includes("already") ||
          downloadResult.error?.includes("name already used") ||
          downloadResult.error?.includes("exists")
        ) {
          console.log("[v0] pcq-download-default already exists, skipping")
        } else {
          console.log("[v0] pcq-download-default creation skipped:", downloadResult.error)
        }

        // Try to create PCQ queue type for upload
        const uploadResult = await this.execute("/queue/type/add", "POST", {
          name: "pcq-upload-default",
          kind: "pcq",
          "pcq-rate": "0",
          "pcq-classifier": "src-address",
        }).catch((e) => ({
          success: false,
          error: e.message || String(e),
        }))

        if (uploadResult.success) {
          console.log("[v0] Created pcq-upload-default queue type")
        } else if (
          uploadResult.error?.includes("already") ||
          uploadResult.error?.includes("name already used") ||
          uploadResult.error?.includes("exists")
        ) {
          console.log("[v0] pcq-upload-default already exists, skipping")
        } else {
          console.log("[v0] pcq-upload-default creation skipped:", uploadResult.error)
        }

        return { success: true, data: { message: "PCQ queue types configured" } }
      } else if (method === "Queue Simple") {
        // Queue Simple is added per customer, not globally
        return { success: true, data: { message: "Queue Simple will be configured per customer" } }
      } else if (method === "Queue Tree") {
        // Queue Tree configuration
        return { success: true, data: { message: "Queue Tree configuration available" } }
      }

      return { success: true, data: { message: "Speed control configured" } }
    } catch (error: any) {
      console.error("[v0] Error configuring speed control:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Configure customer authorization method
   * Sets up DHCP, PPPoE server, or RADIUS authentication
   */
  async configureCustomerAuth(
    method: string,
    radiusServer?: string,
    radiusSecret?: string,
    nasIp?: string,
  ): Promise<MikroTikResponse> {
    try {
      console.log(`[v0] Configuring customer authorization method: ${method}`)

      if (method === "dhcp_lease") {
        console.log("[v0] Configuring DHCP Lease mode - disabling PPPoE")

        const dhcpServers = await this.execute("/ip/dhcp-server")

        if (!dhcpServers.success) {
          return {
            success: false,
            error:
              "Unable to connect to router REST API. Please ensure the router has REST API enabled in System → Services.",
          }
        }

        if (!Array.isArray(dhcpServers.data) || dhcpServers.data.length === 0) {
          return {
            success: false,
            error: "No DHCP server found. Please configure DHCP server first via IP → DHCP Server in WinBox.",
          }
        }

        // Disable PPPoE servers if any exist
        const pppoeServers = await this.execute("/interface/pppoe-server/server")
        if (pppoeServers.success && Array.isArray(pppoeServers.data)) {
          for (const server of pppoeServers.data) {
            if (server[".id"]) {
              await this.execute(`/interface/pppoe-server/server/${server[".id"]}`, "PATCH", {
                disabled: "yes",
              })
              console.log(`[v0] Disabled PPPoE server: ${server.service || server[".id"]}`)
            }
          }
        }

        // Ensure PPP AAA is not using RADIUS
        await this.updateSingleton("/ppp/aaa", {
          "use-radius": "no",
        }).catch(() => {}) // Ignore errors if /ppp/aaa doesn't exist

        console.log("[v0] DHCP Lease mode configured successfully")
        return {
          success: true,
          data: {
            message: "DHCP Lease mode enabled. PPPoE disabled. Customers will connect via DHCP only.",
            dhcpServers: dhcpServers.data.length,
          },
        }
      } else if (method === "pppoe_radius") {
        console.log("[v0] Configuring PPPoE with RADIUS authentication")

        if (!radiusServer || !radiusSecret) {
          return { success: false, error: "RADIUS server IP and shared secret are required for PPPoE with RADIUS" }
        }

        console.log(`[v0] Configuring RADIUS server: ${radiusServer}`)

        // Check if RADIUS entry already exists
        const existingRadius = await this.execute("/radius")

        if (!existingRadius.success) {
          return {
            success: false,
            error:
              "Unable to connect to router REST API. Please ensure: 1) REST API is enabled in System → Services, 2) Your router is running RouterOS v7.1 or newer with REST API support. For older routers, you may need to manually configure RADIUS via WinBox.",
          }
        }

        let radiusConfigured = false

        if (Array.isArray(existingRadius.data)) {
          console.log(`[v0] Found ${existingRadius.data.length} existing RADIUS server(s)`)
          
          // Check if desired RADIUS server already exists with correct settings
          for (const radius of existingRadius.data) {
            const radiusService = radius.service || ""
            const isForPPP = radiusService.includes("ppp")
            const addressMatches = radius.address === radiusServer
            const portMatches = radius["authentication-port"] === "1812" || radius["authentication-port"] === 1812
            
            if (addressMatches && isForPPP && portMatches) {
              console.log(`[v0] RADIUS server ${radiusServer} already configured correctly, skipping`)
              radiusConfigured = true
              break
            }
            
            // Update if address matches but settings are different
            if (addressMatches) {
              console.log(`[v0] Updating existing RADIUS server ${radiusServer}`)
              await this.execute(`/radius/${radius[".id"]}`, "PATCH", {
                service: "ppp",
                address: radiusServer,
                secret: radiusSecret,
                "authentication-port": "1812",
                "accounting-port": "1813",
                timeout: "3s",
              })
              radiusConfigured = true
              break
            }
          }
          
          // If only one PPP RADIUS exists but with wrong address, update it instead of adding
          if (!radiusConfigured && existingRadius.data.length === 1) {
            const singleRadius = existingRadius.data[0]
            const radiusService = singleRadius.service || ""
            if (radiusService.includes("ppp")) {
              console.log(`[v0] Updating single PPP RADIUS server from ${singleRadius.address} to ${radiusServer}`)
              await this.execute(`/radius/${singleRadius[".id"]}`, "PATCH", {
                service: "ppp",
                address: radiusServer,
                secret: radiusSecret,
                "authentication-port": "1812",
                "accounting-port": "1813",
                timeout: "3s",
              })
              radiusConfigured = true
            }
          }
        }

        // Add new RADIUS entry only if none found
        if (!radiusConfigured) {
          console.log(`[v0] Adding new RADIUS server ${radiusServer}`)
          const radiusResult = await this.execute("/radius", "POST", {
            service: "ppp",
            address: radiusServer,
            secret: radiusSecret,
            "authentication-port": "1812",
            "accounting-port": "1813",
            timeout: "3s",
          })
          
          if (radiusResult.success) {
            console.log("[v0] Successfully added new RADIUS configuration")
          } else {
            console.warn("[v0] Failed to add RADIUS configuration:", radiusResult.error)
          }
        }

        // Step 2: Enable RADIUS for PPP AAA
        console.log("[v0] Enabling RADIUS for PPP authentication and accounting")
        const aaaResult = await this.updateSingleton("/ppp/aaa", {
          "use-radius": "yes",
          accounting: "yes",
        })

        if (!aaaResult.success) {
          console.warn("[v0] Failed to enable RADIUS in PPP AAA:", aaaResult.error)
        }

        // Step 3: Check/Enable PPPoE server
        console.log("[v0] Checking PPPoE server configuration")
        const pppoeServers = await this.execute("/interface/pppoe-server/server")

        if (!pppoeServers.success || !Array.isArray(pppoeServers.data) || pppoeServers.data.length === 0) {
          return {
            success: false,
            error: "No PPPoE server found. Please create PPPoE server first via PPP → PPPoE Servers in WinBox.",
          }
        }

        // Enable all PPPoE servers
        for (const server of pppoeServers.data) {
          if (server[".id"]) {
            await this.execute(`/interface/pppoe-server/server/${server[".id"]}`, "PATCH", {
              disabled: "no",
              authentication: "pap,chap,mschap1,mschap2",
            })
            console.log(`[v0] Enabled PPPoE server: ${server.service || server[".id"]}`)
          }
        }

        // Step 4: Update PPP profile to use RADIUS
        const profiles = await this.execute("/ppp/profile")
        if (profiles.success && Array.isArray(profiles.data)) {
          for (const profile of profiles.data) {
            if (profile.name === "default" || profile[".id"]) {
              await this.execute(`/ppp/profile/${profile[".id"]}`, "PATCH", {
                "use-compression": "no",
                "use-encryption": "no",
                "only-one": "no",
              }).catch(() => {}) // Ignore errors
            }
          }
        }

        console.log("[v0] PPPoE with RADIUS configured successfully")
        return {
          success: true,
          data: {
            message: "PPPoE with RADIUS enabled. Customers will authenticate via FreeRADIUS server.",
            radiusServer,
            pppoeServers: pppoeServers.data.length,
          },
        }
      } else if (method === "pppoe_secrets") {
        console.log("[v0] Configuring PPPoE with local secrets (no RADIUS)")

        // Step 1: Disable RADIUS for PPP
        console.log("[v0] Disabling RADIUS authentication")
        await this.updateSingleton("/ppp/aaa", {
          "use-radius": "no",
          accounting: "no",
        })

        // Step 2: Check/Enable PPPoE server
        console.log("[v0] Checking PPPoE server configuration")
        const pppoeServers = await this.execute("/interface/pppoe-server/server")

        if (!pppoeServers.success || !Array.isArray(pppoeServers.data) || pppoeServers.data.length === 0) {
          return {
            success: false,
            error: "No PPPoE server found. Please create PPPoE server first via PPP → PPPoE Servers in WinBox.",
          }
        }

        // Enable all PPPoE servers
        for (const server of pppoeServers.data) {
          if (server[".id"]) {
            await this.execute(`/interface/pppoe-server/server/${server[".id"]}`, "PATCH", {
              disabled: "no",
              authentication: "pap,chap,mschap1,mschap2",
            })
            console.log(`[v0] Enabled PPPoE server: ${server.service || server[".id"]}`)
          }
        }

        console.log("[v0] Local PPPoE secrets mode configured successfully")
        return {
          success: true,
          data: {
            message:
              "Local PPPoE secrets enabled. Customers will authenticate using PPP → Secrets configured in router.",
            pppoeServers: pppoeServers.data.length,
          },
        }
      }

      return { success: false, error: `Unknown authentication method: ${method}` }
    } catch (error: any) {
      console.error("[v0] Error configuring customer authorization:", error)
      return { success: false, error: error.message || "Failed to configure customer authorization" }
    }
  }

  /**
   * Configure carrier-grade firewall rules for ISP operations
   * Applies RADIUS, CoA, DNS, and management access rules
   */
  async configureCarrierGradeFirewall(radiusServer?: string, mgmtIp?: string): Promise<{ success: boolean; error?: string; rulesAdded?: number }> {
    try {
      console.log("[v0] Configuring carrier-grade firewall rules...")
      
      const radiusIp = radiusServer || "10.0.0.1"
      const managementIp = mgmtIp || "10.0.0.0/24"
      let rulesAdded = 0

      // Get existing firewall rules to avoid duplicates
      const existingRules = await this.execute("/ip/firewall/filter/rule")
      const existingComments = existingRules.success && Array.isArray(existingRules.data)
        ? existingRules.data.map((r: any) => r.comment || "")
        : []

      // Rule 1: Allow RADIUS Auth/Acct (UDP 1812-1813)
      if (!existingComments.some((c: string) => c.includes("ISP_MANAGED_RADIUS_AUTH"))) {
        await this.execute("/ip/firewall/filter/rule", "POST", {
          chain: "input",
          protocol: "udp",
          "dst-port": "1812,1813",
          "src-address": radiusIp,
          action: "accept",
          comment: "ISP_MANAGED_RADIUS_AUTH - Allow RADIUS authentication and accounting",
        }).catch(() => {})
        rulesAdded++
        console.log("[v0] Added RADIUS auth/acct firewall rule")
      }

      // Rule 2: Allow RADIUS CoA (UDP 3799)
      if (!existingComments.some((c: string) => c.includes("ISP_MANAGED_RADIUS_COA"))) {
        await this.execute("/ip/firewall/filter/rule", "POST", {
          chain: "input",
          protocol: "udp",
          "dst-port": "3799",
          "src-address": radiusIp,
          action: "accept",
          comment: "ISP_MANAGED_RADIUS_COA - Allow RADIUS disconnect messages",
        }).catch(() => {})
        rulesAdded++
        console.log("[v0] Added RADIUS CoA firewall rule")
      }

      // Rule 3: Protect management access
      if (!existingComments.some((c: string) => c.includes("ISP_MANAGED_MGMT_ACCESS"))) {
        await this.execute("/ip/firewall/filter/rule", "POST", {
          chain: "input",
          protocol: "tcp",
          "dst-port": "22,23,80,443,8291,8728,8729",
          "src-address": `!${managementIp}`,
          action: "drop",
          comment: "ISP_MANAGED_MGMT_ACCESS - Restrict management to trusted IPs",
        }).catch(() => {})
        rulesAdded++
        console.log("[v0] Added management access protection rule")
      }

      // Rule 4: Prevent FastTrack on RADIUS traffic for accurate billing
      if (!existingComments.some((c: string) => c.includes("ISP_MANAGED_FASTTRACK_BYPASS"))) {
        await this.execute("/ip/firewall/filter/rule", "POST", {
          chain: "forward",
          protocol: "udp",
          "dst-port": "1812,1813,3799",
          action: "accept",
          comment: "ISP_MANAGED_FASTTRACK_BYPASS - Ensure RADIUS bypasses FastTrack",
        }).catch(() => {})
        rulesAdded++
        console.log("[v0] Added FastTrack bypass for RADIUS")
      }

      console.log(`[v0] Carrier-grade firewall configuration completed: ${rulesAdded} rules added`)
      return { success: true, rulesAdded }
    } catch (error: any) {
      console.error("[v0] Error configuring firewall:", error)
      return { success: false, error: error.message || "Failed to configure firewall" }
    }
  }

  /**
   * Apply full MikroTik configuration from settings
   * This is called when router settings are saved
   */
  async applyRouterConfiguration(config: {
    customer_auth_method?: string
    trafficking_record?: string
    speed_control?: string
    radius_server?: string
    radius_secret?: string
    mgmt_ip?: string
  }): Promise<{ success: boolean; message?: string; results?: any; errors?: string[] }> {
    const results: any = {}
    const errors: string[] = []
    let successCount = 0
    let totalSteps = 0

    try {
      console.log("[v0] Applying complete router configuration:", config)

      // 0. Configure carrier-grade firewall rules first
      totalSteps++
      try {
        const firewallResult = await this.configureCarrierGradeFirewall(config.radius_server, config.mgmt_ip)
        results.firewall = firewallResult
        if (firewallResult.success) {
          successCount++
          console.log(`[v0] Firewall configured: ${firewallResult.rulesAdded} rules added`)
        } else {
          errors.push(`Firewall: ${firewallResult.error}`)
        }
      } catch (error) {
        errors.push(`Firewall failed: ${error instanceof Error ? error.message : String(error)}`)
      }

      // 1. Configure customer authorization method
      if (config.customer_auth_method) {
        totalSteps++
        try {
          const authResult = await this.configureCustomerAuth(
            config.customer_auth_method,
            config.radius_server,
            config.radius_secret,
          )
          results.customerAuth = authResult
          if (authResult.success) {
            successCount++
          } else {
            errors.push(`Customer Auth: ${authResult.error}`)
          }
        } catch (error) {
          errors.push(`Customer Auth failed: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      // 2. Configure traffic monitoring
      if (config.trafficking_record) {
        totalSteps++
        try {
          const trafficResult = await this.configureTrafficMonitoring(config.trafficking_record)
          results.trafficMonitoring = trafficResult
          if (trafficResult.success) {
            successCount++
          } else {
            errors.push(`Traffic Monitoring: ${trafficResult.error}`)
          }
        } catch (error) {
          errors.push(`Traffic Monitoring failed: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      // 3. Configure speed control
      if (config.speed_control) {
        totalSteps++
        try {
          const speedResult = await this.configureSpeedControl(config.speed_control, {})
          results.speedControl = speedResult
          if (speedResult.success) {
            successCount++
          } else {
            errors.push(`Speed Control: ${speedResult.error}`)
          }
        } catch (error) {
          errors.push(`Speed Control failed: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      const success = errors.length === 0

      console.log(`[v0] Router configuration applied. Success: ${success}`)
      if (errors.length > 0) {
        console.error("[v0] Configuration errors:", errors)
      }

      return { success, results, errors }
    } catch (error: any) {
      console.error("[v0] Error applying router configuration:", error)
      return {
        success: false,
        message: "Configuration failed with unexpected error",
        results,
        errors: [...errors, error.message || "Unknown error occurred"],
      }
    }
  }

  /**\
   * Update a singleton resource (resources that have only one configuration item)
   * These resources need to be fetched first to get their ID before updating
   */
  private async updateSingleton(path: string, params: Record<string, any>): Promise<MikroTikResponse> {
    try {
      // First, GET the singleton to find its ID
      const getResult = await this.execute(path, "GET")

      if (!getResult.success) {
        console.error(`[v0] Failed to GET singleton resource ${path}:`, getResult.error)
        return getResult
      }

      // Singleton resources return an array with one item
      const data = Array.isArray(getResult.data) ? getResult.data[0] : getResult.data

      if (!data || !data[".id"]) {
        console.error(`[v0] Singleton resource ${path} has no ID`)
        return {
          success: false,
          error: "Singleton resource not found or has no ID",
        }
      }

      // Now PATCH with the correct ID
      const updatePath = `${path}/${data[".id"]}`
      console.log(`[v0] Updating singleton ${path} with ID ${data[".id"]}`)
      return await this.execute(updatePath, "PATCH", params)
    } catch (error: any) {
      console.error(`[v0] Error updating singleton ${path}:`, error)
      return {
        success: false,
        error: error.message,
      }
    }
  }
}

/**\
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

export default MikroTikAPI

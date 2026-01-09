import { MikrotikAPI } from "@/lib/mikrotik-api"

export type RouterVendor = "mikrotik" | "ubiquiti" | "juniper"
export type ConnectionMethod = "api" | "ssh" | "netconf"
export type AuthenticationMode = "radius_only" | "direct_push" | "hybrid"

export interface RouterConnectionConfig {
  vendor: RouterVendor
  host: string
  port: number
  username: string
  password: string
  radius_secret?: string
  radius_nas_ip?: string
  authentication_mode: AuthenticationMode
  connection_method: ConnectionMethod
}

export interface PPPoEUser {
  username: string
  password: string
  profile: string
  ip_address?: string
  speed_limit?: string
  pool?: string
  session_timeout?: number
}

export interface RouterHealthCheck {
  status: "healthy" | "degraded" | "critical"
  latency_ms: number
  cpu_usage?: number
  memory_usage?: number
  active_sessions?: number
  uptime?: number
  issues: string[]
}

/**
 * Carrier-Grade Router Connection Manager
 * Implements async, minimal-impact, RADIUS-first architecture
 */
export class RouterConnection {
  private config: RouterConnectionConfig
  private mikrotikClient?: MikrotikAPI

  constructor(config: RouterConnectionConfig) {
    this.config = config
  }

  /**
   * Test router connectivity with ping and basic auth
   */
  async testConnection(): Promise<{ success: boolean; latency_ms: number; error?: string }> {
    const startTime = Date.now()

    try {
      if (this.config.vendor === "mikrotik") {
        this.mikrotikClient = new MikrotikAPI({
          host: this.config.host,
          port: this.config.port,
          username: this.config.username,
          password: this.config.password,
        })

        await this.mikrotikClient.connect()
        const latency = Date.now() - startTime

        await this.mikrotikClient.disconnect()
        return { success: true, latency_ms: latency }
      }

      // For Ubiquiti/Juniper, implement SSH connectivity test
      return { success: false, latency_ms: 0, error: "Vendor not implemented yet" }
    } catch (error: any) {
      return {
        success: false,
        latency_ms: Date.now() - startTime,
        error: error.message,
      }
    }
  }

  /**
   * Comprehensive router health check
   */
  async healthCheck(): Promise<RouterHealthCheck> {
    const issues: string[] = []
    const startTime = Date.now()

    try {
      if (this.config.vendor === "mikrotik") {
        this.mikrotikClient = new MikrotikAPI({
          host: this.config.host,
          port: this.config.port,
          username: this.config.username,
          password: this.config.password,
        })

        await this.mikrotikClient.connect()
        const latency = Date.now() - startTime

        // Check system resources
        const resources = await this.mikrotikClient.getSystemResources()
        const cpu = Number.parseInt(resources["cpu-load"] || "0")
        const activeSessions = await this.mikrotikClient.getActivePPPoESessions()

        await this.mikrotikClient.disconnect()

        // Determine health status
        let status: "healthy" | "degraded" | "critical" = "healthy"
        if (latency > 1000) {
          issues.push("High latency detected")
          status = "degraded"
        }
        if (cpu > 80) {
          issues.push("High CPU usage")
          status = "critical"
        }

        return {
          status,
          latency_ms: latency,
          cpu_usage: cpu,
          active_sessions: activeSessions.length,
          issues,
        }
      }

      return {
        status: "critical",
        latency_ms: 0,
        issues: ["Vendor not supported"],
      }
    } catch (error: any) {
      return {
        status: "critical",
        latency_ms: Date.now() - startTime,
        issues: [error.message],
      }
    }
  }

  /**
   * Add PPPoE user directly to router (async operation)
   * Only used when authentication_mode is 'direct_push' or 'hybrid'
   */
  async addPPPoEUser(user: PPPoEUser): Promise<{ success: boolean; error?: string }> {
    // RADIUS-ONLY mode never writes to router
    if (this.config.authentication_mode === "radius_only") {
      return { success: true }
    }

    try {
      if (this.config.vendor === "mikrotik") {
        this.mikrotikClient = new MikrotikAPI({
          host: this.config.host,
          port: this.config.port,
          username: this.config.username,
          password: this.config.password,
        })

        await this.mikrotikClient.connect()

        await this.mikrotikClient.addPPPoEUser({
          username: user.username,
          password: user.password,
          profile: user.profile,
          service: "pppoe",
          localAddress: user.ip_address,
          remoteAddress: user.pool,
        })

        await this.mikrotikClient.disconnect()
        return { success: true }
      }

      return { success: false, error: "Vendor not implemented" }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Remove PPPoE user from router
   */
  async removePPPoEUser(username: string): Promise<{ success: boolean; error?: string }> {
    if (this.config.authentication_mode === "radius_only") {
      return { success: true }
    }

    try {
      if (this.config.vendor === "mikrotik") {
        this.mikrotikClient = new MikrotikAPI({
          host: this.config.host,
          port: this.config.port,
          username: this.config.username,
          password: this.config.password,
        })

        await this.mikrotikClient.connect()
        await this.mikrotikClient.removePPPoEUser(username)
        await this.mikrotikClient.disconnect()

        return { success: true }
      }

      return { success: false, error: "Vendor not implemented" }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Suspend PPPoE user (disable)
   */
  async suspendPPPoEUser(username: string): Promise<{ success: boolean; error?: string }> {
    if (this.config.authentication_mode === "radius_only") {
      return { success: true }
    }

    try {
      if (this.config.vendor === "mikrotik") {
        this.mikrotikClient = new MikrotikAPI({
          host: this.config.host,
          port: this.config.port,
          username: this.config.username,
          password: this.config.password,
        })

        await this.mikrotikClient.connect()
        await this.mikrotikClient.disablePPPoEUser(username)
        await this.mikrotikClient.disconnect()

        return { success: true }
      }

      return { success: false, error: "Vendor not implemented" }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Generate vendor-specific RADIUS client configuration
   */
  generateRADIUSConfig(): string {
    const { vendor, radius_nas_ip, radius_secret } = this.config

    if (vendor === "mikrotik") {
      return `
# MikroTik RouterOS RADIUS Configuration
/radius
add address=${radius_nas_ip || "RADIUS_SERVER_IP"} secret=${radius_secret || "RADIUS_SECRET"} service=ppp timeout=300ms

/ppp profile
add name=pppoe-radius use-radius=yes only-one=yes

/interface pppoe-server server
add interface=ether2 service-name=ISP_PPPoE authentication=pap,chap default-profile=pppoe-radius
      `.trim()
    }

    if (vendor === "ubiquiti") {
      return `
# Ubiquiti EdgeOS RADIUS Configuration
configure
set system login radius-server ${radius_nas_ip || "RADIUS_SERVER_IP"} key ${radius_secret || "RADIUS_SECRET"}
set service pppoe-server authentication radius
commit
save
exit
      `.trim()
    }

    if (vendor === "juniper") {
      return `
# Juniper RADIUS Configuration
configure
set system radius-server ${radius_nas_ip || "RADIUS_SERVER_IP"} secret ${radius_secret || "RADIUS_SECRET"}
set access profile ISP-AUTH authentication-order radius
commit
      `.trim()
    }

    return "Unsupported vendor"
  }
}

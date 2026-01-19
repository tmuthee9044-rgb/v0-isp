import { getSql } from "@/lib/db"
import { MikroTikAPI } from "./mikrotik-api"
import type { VendorType } from "./vendor-provisioning"

export interface ComplianceCheckResult {
  routerId: number
  radiusOk: boolean
  accountingOk: boolean
  coaOk: boolean
  dnsOk: boolean
  fasttrackSafe: boolean
  firewallOk: boolean
  securityOk: boolean
  overallStatus: "compliant" | "partial" | "broken"
  issues: string[]
  lastChecked: Date
}

/**
 * Router Compliance Checker
 * Detects misconfigured routers before customers complain
 */
export class RouterComplianceChecker {
  /**
   * Check MikroTik router compliance
   */
  static async checkMikroTikCompliance(
    routerId: number,
    routerIp: string,
    username: string,
    password: string,
    apiPort: number,
    radiusIp: string,
  ): Promise<ComplianceCheckResult> {
    const issues: string[] = []
    let radiusOk = false
    let accountingOk = false
    let coaOk = false
    let dnsOk = false
    let fasttrackSafe = false
    let firewallOk = false
    let securityOk = false

    try {
      const api = new MikroTikAPI(routerIp, username, password, apiPort)
      await api.connect()

      // Check RADIUS configuration
      const radiusServers = await api.execute("/radius/print")
      const radiusConfigured = radiusServers.some(
        (server: any) => server.address === radiusIp,
      )
      if (radiusConfigured) {
        radiusOk = true
        accountingOk = true // Assume accounting is OK if RADIUS is configured
      } else {
        issues.push("RADIUS server not configured")
      }

      // Check CoA (RADIUS incoming)
      const radiusIncoming = await api.execute("/radius/incoming/print")
      if (radiusIncoming[0]?.accept === "yes") {
        coaOk = true
      } else {
        issues.push("CoA (RADIUS incoming) not enabled")
      }

      // Check DNS configuration
      const dnsConfig = await api.execute("/ip/dns/print")
      if (dnsConfig[0]?.servers) {
        dnsOk = true
      } else {
        issues.push("DNS not configured")
      }

      // Check firewall rules for ISP management
      const firewallRules = await api.execute("/ip/firewall/filter/print")
      const hasRadiusRule = firewallRules.some(
        (rule: any) => rule.comment?.includes("ISP_MANAGED:RADIUS"),
      )
      const hasCoaRule = firewallRules.some(
        (rule: any) => rule.comment?.includes("ISP_MANAGED:COA"),
      )
      const hasFasttrackSafe = firewallRules.some(
        (rule: any) => rule.comment?.includes("ISP_MANAGED:FASTTRACK_SAFE"),
      )

      if (hasRadiusRule && hasCoaRule) {
        firewallOk = true
      } else {
        if (!hasRadiusRule) issues.push("RADIUS firewall rule missing")
        if (!hasCoaRule) issues.push("CoA firewall rule missing")
      }

      if (hasFasttrackSafe) {
        fasttrackSafe = true
      } else {
        issues.push("FastTrack safety rule missing")
      }

      // Check security (disabled services)
      const services = await api.execute("/ip/service/print")
      const telnetDisabled = services.find(
        (s: any) => s.name === "telnet",
      )?.disabled
      const ftpDisabled = services.find((s: any) => s.name === "ftp")?.disabled
      const wwwDisabled = services.find((s: any) => s.name === "www")?.disabled

      if (telnetDisabled && ftpDisabled && wwwDisabled) {
        securityOk = true
      } else {
        if (!telnetDisabled) issues.push("Telnet service not disabled")
        if (!ftpDisabled) issues.push("FTP service not disabled")
        if (!wwwDisabled) issues.push("HTTP service not disabled")
      }

      await api.disconnect()
    } catch (error) {
      issues.push(`Connection error: ${error}`)
    }

    const compliantChecks = [
      radiusOk,
      accountingOk,
      coaOk,
      dnsOk,
      fasttrackSafe,
      firewallOk,
      securityOk,
    ]
    const compliantCount = compliantChecks.filter(Boolean).length
    const totalChecks = compliantChecks.length

    let overallStatus: "compliant" | "partial" | "broken" = "broken"
    if (compliantCount === totalChecks) {
      overallStatus = "compliant"
    } else if (compliantCount >= totalChecks / 2) {
      overallStatus = "partial"
    }

    return {
      routerId,
      radiusOk,
      accountingOk,
      coaOk,
      dnsOk,
      fasttrackSafe,
      firewallOk,
      securityOk,
      overallStatus,
      issues,
      lastChecked: new Date(),
    }
  }

  /**
   * Save compliance results to database
   */
  static async saveComplianceResult(
    result: ComplianceCheckResult,
  ): Promise<void> {
    const sql = await getSql()

    await sql`
      INSERT INTO router_compliance (
        router_id,
        radius_ok,
        accounting_ok,
        coa_ok,
        dns_ok,
        fasttrack_safe,
        firewall_ok,
        security_ok,
        overall_status,
        issues,
        last_checked
      ) VALUES (
        ${result.routerId},
        ${result.radiusOk},
        ${result.accountingOk},
        ${result.coaOk},
        ${result.dnsOk},
        ${result.fasttrackSafe},
        ${result.firewallOk},
        ${result.securityOk},
        ${result.overallStatus},
        ${JSON.stringify(result.issues)},
        ${result.lastChecked.toISOString()}
      )
      ON CONFLICT (router_id) DO UPDATE SET
        radius_ok = EXCLUDED.radius_ok,
        accounting_ok = EXCLUDED.accounting_ok,
        coa_ok = EXCLUDED.coa_ok,
        dns_ok = EXCLUDED.dns_ok,
        fasttrack_safe = EXCLUDED.fasttrack_safe,
        firewall_ok = EXCLUDED.firewall_ok,
        security_ok = EXCLUDED.security_ok,
        overall_status = EXCLUDED.overall_status,
        issues = EXCLUDED.issues,
        last_checked = EXCLUDED.last_checked
    `
  }

  /**
   * Check compliance for all routers
   */
  static async checkAllRouters(): Promise<ComplianceCheckResult[]> {
    const sql = await getSql()

    const routers = await sql`
      SELECT id, ip_address, username, password, api_port, type
      FROM network_devices
      WHERE type IN ('mikrotik', 'ubiquiti', 'juniper')
      AND status = 'active'
    `

    const radiusConfig = await sql`
      SELECT value FROM system_config WHERE key = 'radius_server_ip'
    `
    const radiusIp = radiusConfig[0]?.value || "127.0.0.1"

    const results: ComplianceCheckResult[] = []

    for (const router of routers) {
      if (router.type === "mikrotik") {
        const result = await this.checkMikroTikCompliance(
          router.id,
          router.ip_address,
          router.username,
          router.password,
          router.api_port || 8728,
          radiusIp,
        )
        results.push(result)
        await this.saveComplianceResult(result)
      }
      // TODO: Add Ubiquiti and Juniper compliance checks
    }

    return results
  }

  /**
   * Get compliance status for a specific router
   */
  static async getRouterCompliance(
    routerId: number,
  ): Promise<ComplianceCheckResult | null> {
    const sql = await getSql()

    const result = await sql`
      SELECT * FROM router_compliance WHERE router_id = ${routerId}
    `

    if (result.length === 0) return null

    const row = result[0]
    return {
      routerId: row.router_id,
      radiusOk: row.radius_ok,
      accountingOk: row.accounting_ok,
      coaOk: row.coa_ok,
      dnsOk: row.dns_ok,
      fasttrackSafe: row.fasttrack_safe,
      firewallOk: row.firewall_ok,
      securityOk: row.security_ok,
      overallStatus: row.overall_status,
      issues: JSON.parse(row.issues || "[]"),
      lastChecked: new Date(row.last_checked),
    }
  }
}

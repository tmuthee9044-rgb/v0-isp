import { getSql } from "@/lib/db"
import { RouterAutoProvision } from "./router-auto-provision"
import { RouterComplianceChecker } from "./router-compliance"

/**
 * Router Enforcement Worker
 * Continuously monitors and fixes router configurations to maintain compliance
 * 
 * Key Responsibilities:
 * 1. Connect to routers periodically
 * 2. Verify ISP_MANAGED rules exist
 * 3. Apply missing rules only
 * 4. Never touch non-ISP rules
 * 5. Log every action
 */
export class RouterEnforcementWorker {
  private static isRunning = false

  /**
   * Run compliance check and auto-repair for all active routers
   */
  static async enforceAllRouters(): Promise<{
    checked: number
    compliant: number
    repaired: number
    failed: number
  }> {
    if (this.isRunning) {
      console.log("[Worker] Enforcement already running, skipping")
      return { checked: 0, compliant: 0, repaired: 0, failed: 0 }
    }

    this.isRunning = true
    console.log("[Worker] Starting router enforcement cycle")

    try {
      const sql = await getSql()
      if (!sql) {
        console.error("[Worker] Database unavailable")
        return { checked: 0, compliant: 0, repaired: 0, failed: 0 }
      }

      // Get all active routers
      const routers = await sql`
        SELECT id, name, ip_address, type as vendor, 
               api_port, api_username, api_password,
               radius_server, radius_secret, management_ip
        FROM routers 
        WHERE status = 'active'
      `

      let checked = 0
      let compliant = 0
      let repaired = 0
      let failed = 0

      for (const router of routers) {
        try {
          checked++
          console.log(`[Worker] Checking router ${router.id}: ${router.name}`)

          // Run compliance check
          const result = await RouterComplianceChecker.checkRouter(
            router.id,
            router.ip_address,
            router.vendor,
            {
              radiusServer: router.radius_server,
              radiusSecret: router.radius_secret,
              managementIp: router.management_ip,
            }
          )

          if (result.overallStatus === "compliant") {
            compliant++
            console.log(`[Worker] Router ${router.id} is compliant`)
            continue
          }

          // Router is non-compliant, attempt auto-repair
          console.log(`[Worker] Router ${router.id} non-compliant, attempting repair`)

          const repairResult = await this.repairRouter(router)

          if (repairResult.success) {
            repaired++
            console.log(`[Worker] Router ${router.id} repaired successfully`)

            // Update router status
            await sql`
              UPDATE routers 
              SET last_compliance_check = NOW(),
                  compliance_status = 'compliant'
              WHERE id = ${router.id}
            `
          } else {
            failed++
            console.error(`[Worker] Router ${router.id} repair failed:`, repairResult.error)

            // Mark router as non-compliant
            await sql`
              UPDATE routers 
              SET last_compliance_check = NOW(),
                  compliance_status = 'non_compliant',
                  compliance_notes = ${repairResult.error}
              WHERE id = ${router.id}
            `
          }
        } catch (error) {
          failed++
          console.error(`[Worker] Error processing router ${router.id}:`, error)
        }
      }

      console.log(
        `[Worker] Enforcement complete: ${checked} checked, ${compliant} compliant, ${repaired} repaired, ${failed} failed`
      )

      // Log summary to database
      await sql`
        INSERT INTO system_logs (event_type, severity, message, metadata, created_at)
        VALUES (
          'router_enforcement',
          ${failed > 0 ? "warning" : "info"},
          ${`Router enforcement: ${checked} checked, ${compliant} compliant, ${repaired} repaired, ${failed} failed`},
          ${sql.json({ checked, compliant, repaired, failed })},
          NOW()
        )
      `.catch(() => {})

      return { checked, compliant, repaired, failed }
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Repair a single router by applying missing ISP_MANAGED rules
   */
  private static async repairRouter(router: any): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // Generate fresh provisioning script
      const script = RouterAutoProvision.generateScript({
        routerId: router.id,
        routerIp: router.ip_address,
        radiusIp: router.radius_server,
        radiusSecret: router.radius_secret,
        mgmtIp: router.management_ip,
        safeDNS: true,
        vendor: router.vendor,
      })

      // TODO: Apply script to router via API/SSH
      // For now, we generate the script and log it
      // In production, this would connect via RouterOS API, SSH, or NETCONF

      console.log(`[Worker] Generated repair script for router ${router.id}`)
      console.log(script)

      // Mark as needing manual intervention for now
      // In production, this would automatically apply the script
      return {
        success: false,
        error: "Auto-repair requires router API integration",
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Check a specific router and repair if needed
   */
  static async enforceRouter(routerId: number): Promise<{
    success: boolean
    compliant: boolean
    repaired: boolean
    error?: string
  }> {
    try {
      const sql = await getSql()
      if (!sql) {
        return {
          success: false,
          compliant: false,
          repaired: false,
          error: "Database unavailable",
        }
      }

      const [router] = await sql`
        SELECT id, name, ip_address, type as vendor,
               radius_server, radius_secret, management_ip
        FROM routers 
        WHERE id = ${routerId}
      `

      if (!router) {
        return {
          success: false,
          compliant: false,
          repaired: false,
          error: "Router not found",
        }
      }

      // Run compliance check
      const result = await RouterComplianceChecker.checkRouter(
        router.id,
        router.ip_address,
        router.vendor,
        {
          radiusServer: router.radius_server,
          radiusSecret: router.radius_secret,
          managementIp: router.management_ip,
        }
      )

      if (result.overallStatus === "compliant") {
        return {
          success: true,
          compliant: true,
          repaired: false,
        }
      }

      // Attempt repair
      const repairResult = await this.repairRouter(router)

      return {
        success: repairResult.success,
        compliant: repairResult.success,
        repaired: repairResult.success,
        error: repairResult.error,
      }
    } catch (error) {
      return {
        success: false,
        compliant: false,
        repaired: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}

import { neon } from "@neondatabase/serverless"
import { testRouterConnection, logNetworkEvent } from "./network-utils"

const sql = neon(process.env.DATABASE_URL!)

export interface ServiceAction {
  customerId: number
  serviceId: number
  serviceType: "pppoe" | "dhcp" | "hotspot" | "static_ip" | "radius"
  ipAddress?: string
  routerId?: string
  reason?: string
}

export interface RouterActionResult {
  success: boolean
  message: string
  command?: string
  response?: string
}

export class RouterService {
  /**
   * Suspend a customer service on the router
   */
  static async suspendService(action: ServiceAction): Promise<RouterActionResult> {
    try {
      // Get router information
      const router = await this.getRouterInfo(action.routerId)
      if (!router) {
        return {
          success: false,
          message: `Router ${action.routerId} not found`,
        }
      }

      // Test router connection first
      const isConnected = await testRouterConnection(router)
      if (!isConnected) {
        return {
          success: false,
          message: `Cannot connect to router ${router.name}`,
        }
      }

      // Execute suspension based on service type
      let result: RouterActionResult
      switch (action.serviceType) {
        case "pppoe":
          result = await this.suspendPPPoEService(router, action)
          break
        case "dhcp":
          result = await this.suspendDHCPService(router, action)
          break
        case "hotspot":
          result = await this.suspendHotspotService(router, action)
          break
        case "static_ip":
          result = await this.suspendStaticIPService(router, action)
          break
        case "radius":
          result = await this.suspendRADIUSService(router, action)
          break
        default:
          result = {
            success: false,
            message: `Unsupported service type: ${action.serviceType}`,
          }
      }

      // Log network event
      await logNetworkEvent("service_suspended", router.id, action.customerId, action.serviceId, action.ipAddress, {
        serviceType: action.serviceType,
        reason: action.reason,
        result,
      })

      return result
    } catch (error) {
      console.error("RouterService.suspendService error:", error)
      return {
        success: false,
        message: error.message || "Unknown router service error",
      }
    }
  }

  /**
   * Reactivate a customer service on the router
   */
  static async reactivateService(action: ServiceAction): Promise<RouterActionResult> {
    try {
      // Get router information
      const router = await this.getRouterInfo(action.routerId)
      if (!router) {
        return {
          success: false,
          message: `Router ${action.routerId} not found`,
        }
      }

      // Test router connection first
      const isConnected = await testRouterConnection(router)
      if (!isConnected) {
        return {
          success: false,
          message: `Cannot connect to router ${router.name}`,
        }
      }

      // Execute reactivation based on service type
      let result: RouterActionResult
      switch (action.serviceType) {
        case "pppoe":
          result = await this.reactivatePPPoEService(router, action)
          break
        case "dhcp":
          result = await this.reactivateDHCPService(router, action)
          break
        case "hotspot":
          result = await this.reactivateHotspotService(router, action)
          break
        case "static_ip":
          result = await this.reactivateStaticIPService(router, action)
          break
        case "radius":
          result = await this.reactivateRADIUSService(router, action)
          break
        default:
          result = {
            success: false,
            message: `Unsupported service type: ${action.serviceType}`,
          }
      }

      // Log network event
      await logNetworkEvent("service_reactivated", router.id, action.customerId, action.serviceId, action.ipAddress, {
        serviceType: action.serviceType,
        reason: action.reason,
        result,
      })

      return result
    } catch (error) {
      console.error("RouterService.reactivateService error:", error)
      return {
        success: false,
        message: error.message || "Unknown router service error",
      }
    }
  }

  // PPPoE Service Management
  private static async suspendPPPoEService(router: any, action: ServiceAction): Promise<RouterActionResult> {
    const username = `customer_${action.customerId}_${action.serviceId}`

    switch (router.type) {
      case "mikrotik":
        // Option 1: Disable PPP secret
        const disableCommand = `/ppp secret set [find name="${username}"] disabled=yes`
        // Option 2: Move to suspended profile
        const suspendCommand = `/ppp secret set [find name="${username}"] profile=suspended`

        // Use suspended profile approach for easier reactivation
        return await this.executeMikroTikCommand(router, suspendCommand, "PPPoE service suspended")

      default:
        return { success: false, message: `PPPoE suspension not implemented for ${router.type}` }
    }
  }

  private static async reactivatePPPoEService(router: any, action: ServiceAction): Promise<RouterActionResult> {
    const username = `customer_${action.customerId}_${action.serviceId}`

    switch (router.type) {
      case "mikrotik":
        // Get original service plan profile
        const [service] = await sql`
          SELECT sp.name as profile_name
          FROM customer_services cs
          JOIN service_plans sp ON cs.service_plan_id = sp.id
          WHERE cs.id = ${action.serviceId}
        `

        const profileName = service?.profile_name || "default"
        const reactivateCommand = `/ppp secret set [find name="${username}"] profile="${profileName}" disabled=no`

        return await this.executeMikroTikCommand(router, reactivateCommand, "PPPoE service reactivated")

      default:
        return { success: false, message: `PPPoE reactivation not implemented for ${router.type}` }
    }
  }

  // DHCP Service Management
  private static async suspendDHCPService(router: any, action: ServiceAction): Promise<RouterActionResult> {
    if (!action.ipAddress) {
      return { success: false, message: "IP address required for DHCP suspension" }
    }

    switch (router.type) {
      case "mikrotik":
        const suspendCommand = `/ip dhcp-server lease set [find address="${action.ipAddress}"] disabled=yes`
        return await this.executeMikroTikCommand(router, suspendCommand, "DHCP lease suspended")

      default:
        return { success: false, message: `DHCP suspension not implemented for ${router.type}` }
    }
  }

  private static async reactivateDHCPService(router: any, action: ServiceAction): Promise<RouterActionResult> {
    if (!action.ipAddress) {
      return { success: false, message: "IP address required for DHCP reactivation" }
    }

    switch (router.type) {
      case "mikrotik":
        const reactivateCommand = `/ip dhcp-server lease set [find address="${action.ipAddress}"] disabled=no`
        return await this.executeMikroTikCommand(router, reactivateCommand, "DHCP lease reactivated")

      default:
        return { success: false, message: `DHCP reactivation not implemented for ${router.type}` }
    }
  }

  // Hotspot Service Management
  private static async suspendHotspotService(router: any, action: ServiceAction): Promise<RouterActionResult> {
    const username = `customer_${action.customerId}_${action.serviceId}`

    switch (router.type) {
      case "mikrotik":
        const suspendCommand = `/ip hotspot user set [find name="${username}"] profile=suspended`
        return await this.executeMikroTikCommand(router, suspendCommand, "Hotspot user suspended")

      default:
        return { success: false, message: `Hotspot suspension not implemented for ${router.type}` }
    }
  }

  private static async reactivateHotspotService(router: any, action: ServiceAction): Promise<RouterActionResult> {
    const username = `customer_${action.customerId}_${action.serviceId}`

    switch (router.type) {
      case "mikrotik":
        // Get original service plan profile
        const [service] = await sql`
          SELECT sp.name as profile_name
          FROM customer_services cs
          JOIN service_plans sp ON cs.service_plan_id = sp.id
          WHERE cs.id = ${action.serviceId}
        `

        const profileName = service?.profile_name || "default"
        const reactivateCommand = `/ip hotspot user set [find name="${username}"] profile="${profileName}"`

        return await this.executeMikroTikCommand(router, reactivateCommand, "Hotspot user reactivated")

      default:
        return { success: false, message: `Hotspot reactivation not implemented for ${router.type}` }
    }
  }

  // Static IP Service Management
  private static async suspendStaticIPService(router: any, action: ServiceAction): Promise<RouterActionResult> {
    if (!action.ipAddress) {
      return { success: false, message: "IP address required for static IP suspension" }
    }

    switch (router.type) {
      case "mikrotik":
        const suspendCommand = `/ip firewall filter add chain=forward src-address=${action.ipAddress} action=drop comment="Suspended customer_${action.customerId}"`
        return await this.executeMikroTikCommand(router, suspendCommand, "Static IP blocked via firewall")

      default:
        return { success: false, message: `Static IP suspension not implemented for ${router.type}` }
    }
  }

  private static async reactivateStaticIPService(router: any, action: ServiceAction): Promise<RouterActionResult> {
    if (!action.ipAddress) {
      return { success: false, message: "IP address required for static IP reactivation" }
    }

    switch (router.type) {
      case "mikrotik":
        const reactivateCommand = `/ip firewall filter remove [find comment="Suspended customer_${action.customerId}"]`
        return await this.executeMikroTikCommand(router, reactivateCommand, "Static IP firewall rule removed")

      default:
        return { success: false, message: `Static IP reactivation not implemented for ${router.type}` }
    }
  }

  // RADIUS Service Management
  private static async suspendRADIUSService(router: any, action: ServiceAction): Promise<RouterActionResult> {
    // RADIUS suspension is handled at the database level
    const username = `customer_${action.customerId}_${action.serviceId}`

    try {
      await sql`
        UPDATE radius_users 
        SET status = 'suspended', suspended_at = NOW()
        WHERE username = ${username}
      `

      return {
        success: true,
        message: "RADIUS user suspended in database",
        command: `UPDATE radius_users SET status = 'suspended'`,
        response: "Database updated successfully",
      }
    } catch (error) {
      return {
        success: false,
        message: `RADIUS suspension failed: ${error.message}`,
      }
    }
  }

  private static async reactivateRADIUSService(router: any, action: ServiceAction): Promise<RouterActionResult> {
    // RADIUS reactivation is handled at the database level
    const username = `customer_${action.customerId}_${action.serviceId}`

    try {
      await sql`
        UPDATE radius_users 
        SET status = 'active', reactivated_at = NOW()
        WHERE username = ${username}
      `

      return {
        success: true,
        message: "RADIUS user reactivated in database",
        command: `UPDATE radius_users SET status = 'active'`,
        response: "Database updated successfully",
      }
    } catch (error) {
      return {
        success: false,
        message: `RADIUS reactivation failed: ${error.message}`,
      }
    }
  }

  // Helper Methods
  private static async getRouterInfo(routerId?: string): Promise<any> {
    if (!routerId) return null

    const [router] = await sql`
      SELECT * FROM network_devices 
      WHERE (id = ${routerId} OR name = ${routerId}) AND type = 'router'
    `

    return router
  }

  private static async executeMikroTikCommand(
    router: any,
    command: string,
    successMessage: string,
  ): Promise<RouterActionResult> {
    try {
      // In a real implementation, this would use the RouterOS API
      // For now, we'll simulate the command execution

      // Simulate command execution delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Simulate 90% success rate
      const success = Math.random() > 0.1

      if (success) {
        return {
          success: true,
          message: successMessage,
          command,
          response: "Command executed successfully",
        }
      } else {
        return {
          success: false,
          message: "Router command execution failed",
          command,
          response: "Connection timeout or command error",
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `MikroTik command failed: ${error.message}`,
        command,
        response: error.message,
      }
    }
  }

  /**
   * Retry failed router operations
   */
  static async retryFailedOperations(): Promise<void> {
    const failedLogs = await sql`
      SELECT * FROM router_logs 
      WHERE status = 'retry' 
        AND retry_count < 3 
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      ORDER BY executed_at ASC
      LIMIT 10
    `

    for (const log of failedLogs) {
      try {
        const action: ServiceAction = {
          customerId: log.customer_id,
          serviceId: log.service_id,
          serviceType: log.service_type,
          ipAddress: log.metadata?.ipAddress,
          routerId: log.router_id,
          reason: "Retry failed operation",
        }

        let result: RouterActionResult
        if (log.action === "suspend") {
          result = await this.suspendService(action)
        } else if (log.action === "reactivate") {
          result = await this.reactivateService(action)
        } else {
          continue
        }

        // Update log with retry result
        await sql`
          UPDATE router_logs 
          SET 
            status = ${result.success ? "success" : "retry"},
            retry_count = retry_count + 1,
            response_received = ${result.response || result.message},
            error_message = ${result.success ? null : result.message}
          WHERE id = ${log.id}
        `
      } catch (error) {
        console.error(`Retry failed for log ${log.id}:`, error)

        await sql`
          UPDATE router_logs 
          SET 
            status = 'failed',
            retry_count = retry_count + 1,
            error_message = ${error.message}
          WHERE id = ${log.id}
        `
      }
    }
  }
}

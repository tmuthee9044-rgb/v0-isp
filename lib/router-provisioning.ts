import { getSql } from "@/lib/db"
import { createMikroTikClient } from "./mikrotik-api"

export interface ProvisionServiceParams {
  serviceId: number
  customerId: number
  routerId: number
  ipAddress?: string
  connectionType: "pppoe" | "static_ip" | "dhcp"
  pppoeUsername?: string
  pppoePassword?: string
  speedProfile?: string
  downloadSpeed?: number
  uploadSpeed?: number
}

export interface DeprovisionServiceParams {
  serviceId: number
  customerId: number
  routerId?: number
  connectionType: string
  ipAddress?: string
  pppoeUsername?: string
  reason: string
}

/**
 * Provision a customer service to the physical MikroTik router
 * This runs when a service is created or activated
 */
export async function provisionServiceToRouter(params: ProvisionServiceParams): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  const sql = await getSql()

  try {
    console.log(`[v0] === Provisioning service ${params.serviceId} to router ${params.routerId} ===`)

    const mikrotik = await Promise.race([
      createMikroTikClient(params.routerId),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 5000)),
    ])

    if (!mikrotik) {
      throw new Error(`Unable to connect to router ${params.routerId}`)
    }

    let provisionResult

    if (params.connectionType === "pppoe" && params.pppoeUsername && params.pppoePassword) {
      console.log(`[v0] Provisioning PPPoE service for ${params.pppoeUsername}`)

      const profile = params.speedProfile || "default"

      provisionResult = await mikrotik.createPPPoESecret(
        params.pppoeUsername,
        params.pppoePassword,
        params.ipAddress || "0.0.0.0",
        profile,
      )

      if (!provisionResult.success) {
        throw new Error(`Failed to create PPPoE secret: ${provisionResult.error}`)
      }

      console.log(`[v0] PPPoE secret created successfully for ${params.pppoeUsername}`)
    } else if (params.connectionType === "static_ip" && params.ipAddress) {
      // Provision static IP service
      console.log(`[v0] Provisioning static IP ${params.ipAddress}`)

      provisionResult = await mikrotik.addFirewallRule(
        params.ipAddress,
        "accept",
        `Customer_${params.customerId}_Service_${params.serviceId}`,
      )

      if (!provisionResult.success) {
        console.log(`[v0] Warning: Failed to add firewall rule: ${provisionResult.error}`)
      }

      console.log(`[v0] Static IP provisioned successfully`)
    }

    await Promise.all([
      sql`
        UPDATE customer_services
        SET 
          router_provisioned = true,
          router_provisioned_at = NOW(),
          updated_at = NOW()
        WHERE id = ${params.serviceId}
      `,
      sql`
        INSERT INTO activity_logs (
          user_id, action, entity_type, entity_id, description, created_at
        ) VALUES (
          1, 'provision', 'customer_service', ${params.serviceId},
          ${`Provisioned ${params.connectionType} service for customer ${params.customerId} to router ${params.routerId}`},
          NOW()
        ) ON CONFLICT DO NOTHING
      `,
      sql`
        INSERT INTO router_logs (router_id, action, status, message, created_at)
        VALUES (
          ${params.routerId},
          'service_provisioned',
          'success',
          ${`Service ${params.serviceId} provisioned for customer ${params.customerId}${params.pppoeUsername ? ` (PPPoE: ${params.pppoeUsername})` : params.ipAddress ? ` (IP: ${params.ipAddress})` : ""}`},
          NOW()
        ) ON CONFLICT DO NOTHING
      `,
    ])

    await mikrotik.disconnect()

    console.log(`[v0] === Provisioning completed successfully ===`)

    return {
      success: true,
      message: `Service successfully provisioned to router`,
    }
  } catch (error) {
    console.error(`[v0] Provisioning error:`, error)

    Promise.all([
      sql`
        INSERT INTO activity_logs (
          user_id, action, entity_type, entity_id, description, created_at
        ) VALUES (
          1, 'provision_failed', 'customer_service', ${params.serviceId},
          ${`Failed to provision service: ${error instanceof Error ? error.message : String(error)}`},
          NOW()
        ) ON CONFLICT DO NOTHING
      `,
      params.routerId
        ? sql`
        INSERT INTO router_logs (router_id, action, status, message, created_at)
        VALUES (
          ${params.routerId},
          'service_provision_failed',
          'failed',
          ${`Failed to provision service ${params.serviceId}: ${error instanceof Error ? error.message : String(error)}`},
          NOW()
        ) ON CONFLICT DO NOTHING
      `
        : Promise.resolve(),
    ]).catch((err) => console.error("[v0] Failed to log provision error:", err))

    return {
      success: false,
      message: "Failed to provision service to router",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Deprovision a customer service from the physical MikroTik router
 * This runs when a service becomes inactive, suspended, or deleted
 */
export async function deprovisionServiceFromRouter(params: DeprovisionServiceParams): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  const sql = await getSql()

  try {
    console.log(`[v0] === Deprovisioning service ${params.serviceId} ===`)
    console.log(`[v0] Reason: ${params.reason}`)

    if (!params.routerId) {
      console.log(`[v0] No router ID provided, skipping router deprovision`)
      return { success: true, message: "No router to deprovision from" }
    }

    const mikrotik = await Promise.race([
      createMikroTikClient(params.routerId),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 5000)),
    ])

    if (!mikrotik) {
      throw new Error(`Unable to connect to router ${params.routerId}`)
    }

    let deprovisionResult

    if (params.connectionType === "pppoe" && params.pppoeUsername) {
      // Remove PPPoE secret
      console.log(`[v0] Removing PPPoE secret for ${params.pppoeUsername}`)

      deprovisionResult = await mikrotik.removePPPoESecret(params.pppoeUsername)

      if (!deprovisionResult.success) {
        console.log(`[v0] Warning: Failed to remove PPPoE secret: ${deprovisionResult.error}`)
      } else {
        console.log(`[v0] PPPoE secret removed successfully`)
      }
    } else if (params.connectionType === "static_ip" && params.ipAddress) {
      // Remove firewall rule
      console.log(`[v0] Removing firewall rule for IP ${params.ipAddress}`)

      const comment = `Customer_${params.customerId}_Service_${params.serviceId}`
      deprovisionResult = await mikrotik.removeFirewallRule(comment)

      if (!deprovisionResult.success) {
        console.log(`[v0] Warning: Failed to remove firewall rule: ${deprovisionResult.error}`)
      } else {
        console.log(`[v0] Firewall rule removed successfully`)
      }
    }

    await Promise.all([
      sql`
        UPDATE customer_services
        SET 
          router_provisioned = false,
          router_deprovisioned_at = NOW(),
          updated_at = NOW()
        WHERE id = ${params.serviceId}
      `,
      sql`
        INSERT INTO activity_logs (
          user_id, action, entity_type, entity_id, description, created_at
        ) VALUES (
          1, 'deprovision', 'customer_service', ${params.serviceId},
          ${`Deprovisioned service from router ${params.routerId}. Reason: ${params.reason}`},
          NOW()
        ) ON CONFLICT DO NOTHING
      `,
      sql`
        INSERT INTO router_logs (router_id, action, status, message, created_at)
        VALUES (
          ${params.routerId},
          'service_deprovisioned',
          'success',
          ${`Service ${params.serviceId} deprovisioned. Reason: ${params.reason}`},
          NOW()
        ) ON CONFLICT DO NOTHING
      `,
    ])

    await mikrotik.disconnect()

    console.log(`[v0] === Deprovisioning completed successfully ===`)

    return {
      success: true,
      message: `Service successfully deprovisioned from router`,
    }
  } catch (error) {
    console.error(`[v0] Deprovisioning error:`, error)

    Promise.all([
      sql`
        INSERT INTO activity_logs (
          user_id, action, entity_type, entity_id, description, created_at
        ) VALUES (
          1, 'deprovision_failed', 'customer_service', ${params.serviceId},
          ${`Failed to deprovision service: ${error instanceof Error ? error.message : String(error)}`},
          NOW()
        ) ON CONFLICT DO NOTHING
      `,
    ]).catch((err) => console.error("[v0] Failed to log deprovision error:", err))

    return {
      success: false,
      message: "Failed to deprovision service from router",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Check service status and deprovision if needed
 * This is called by a cron job every 10-30 seconds for real-time monitoring
 */
export async function checkAndDeprovisionInactiveServices(): Promise<void> {
  const sql = await getSql()

  try {
    console.log(`[v0] === Checking for services to deprovision ===`)

    const servicesToDeprovision = await sql`
      SELECT 
        cs.id as service_id,
        cs.customer_id,
        cs.router_id,
        cs.connection_type,
        cs.ip_address,
        cs.pppoe_username,
        cs.status,
        cs.next_billing_date,
        CASE 
          WHEN cs.status = 'suspended' THEN 'Service suspended'
          WHEN cs.status = 'inactive' THEN 'Service inactive'
          WHEN cs.status = 'terminated' THEN 'Service terminated'
          WHEN cs.status = 'pending' THEN 'Service pending activation'
          WHEN cs.next_billing_date < CURRENT_DATE THEN 'Service past due date'
          ELSE 'Service status changed'
        END as deprovision_reason
      FROM customer_services cs
      WHERE cs.router_provisioned = true
        AND cs.router_id IS NOT NULL
        AND (
          cs.status IN ('suspended', 'inactive', 'terminated', 'pending')
          OR cs.next_billing_date < CURRENT_DATE
        )
      LIMIT 50
    `

    console.log(`[v0] Found ${servicesToDeprovision.length} services to deprovision`)

    const deprovisionPromises = servicesToDeprovision.map((service) => {
      console.log(`[v0] Deprovisioning service ${service.service_id} (${service.deprovision_reason})`)

      return deprovisionServiceFromRouter({
        serviceId: service.service_id,
        customerId: service.customer_id,
        routerId: service.router_id,
        connectionType: service.connection_type || "pppoe",
        ipAddress: service.ip_address,
        pppoeUsername: service.pppoe_username,
        reason: service.deprovision_reason,
      })
    })

    await Promise.all(deprovisionPromises)

    console.log(`[v0] === Deprovision check completed in ${Date.now()} ===`)
  } catch (error) {
    console.error(`[v0] Error checking inactive services:`, error)
  }
}

/**
 * Check for active services that need provisioning
 * This is called by a cron job every 10-30 seconds for real-time activation
 */
export async function checkAndProvisionActiveServices(): Promise<void> {
  const sql = await getSql()

  try {
    console.log(`[v0] === Checking for services to provision ===`)

    // Find services that should be provisioned:
    // 1. Status is active
    // 2. Not yet provisioned (router_provisioned = false or NULL)
    // 3. Has a router_id
    // 4. Has connection details (IP or PPPoE credentials)
    const servicesToProvision = await sql`
      SELECT 
        cs.id as service_id,
        cs.customer_id,
        cs.router_id,
        cs.connection_type,
        cs.ip_address,
        cs.pppoe_username,
        cs.pppoe_password,
        cs.speed_profile,
        cs.download_speed,
        cs.upload_speed
      FROM customer_services cs
      WHERE cs.status = 'active'
        AND (cs.router_provisioned = false OR cs.router_provisioned IS NULL)
        AND cs.router_id IS NOT NULL
        AND cs.next_billing_date >= CURRENT_DATE
        AND (
          (cs.connection_type = 'pppoe' AND cs.pppoe_username IS NOT NULL AND cs.pppoe_password IS NOT NULL)
          OR (cs.connection_type = 'static_ip' AND cs.ip_address IS NOT NULL)
        )
      LIMIT 50
    `

    console.log(`[v0] Found ${servicesToProvision.length} services to provision`)

    const provisionPromises = servicesToProvision.map((service) => {
      console.log(`[v0] Provisioning service ${service.service_id}`)

      return provisionServiceToRouter({
        serviceId: service.service_id,
        customerId: service.customer_id,
        routerId: service.router_id,
        ipAddress: service.ip_address,
        connectionType: service.connection_type || "pppoe",
        pppoeUsername: service.pppoe_username,
        pppoePassword: service.pppoe_password,
        speedProfile: service.speed_profile,
        downloadSpeed: service.download_speed,
        uploadSpeed: service.upload_speed,
      })
    })

    await Promise.all(provisionPromises)

    console.log(`[v0] === Provision check completed ===`)
  } catch (error) {
    console.error(`[v0] Error checking active services:`, error)
  }
}

"use server"

import { getSql } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { provisionServiceToRouter, deprovisionServiceFromRouter } from "@/lib/router-provisioning"
import { provisionRadiusUser, suspendRadiusUser, updateRadiusSpeed, deprovisionRadiusUser } from "@/lib/radius-manager"
import { provisionToStandardRadiusTables } from "@/lib/radius-provisioning"
import { queueServiceProvisioning } from "@/lib/router-selection"

export async function getCustomerServices(customerId: number) {
  try {
    const sql = await getSql()

    const services = await sql`
      SELECT 
        cs.*,
        sp.name as service_name,
        sp.description as service_description,
        sp.download_speed,
        sp.upload_speed,
        sp.data_limit,
        sp.price as plan_price
      FROM customer_services cs
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.customer_id = ${customerId}
      ORDER BY cs.created_at DESC
    `

    return services || []
  } catch (error) {
    console.error("Error fetching customer services:", error)
    return []
  }
}

export async function getServicePlans() {
  try {
    const sql = await getSql()

    const plans = await sql`
      SELECT * FROM service_plans 
      WHERE status = 'active' 
      ORDER BY price ASC
    `

    return { success: true, plans: plans || [] }
  } catch (error) {
    console.error("Error fetching service plans:", error)
    return { success: false, plans: [], error: "Failed to fetch service plans" }
  }
}

export async function addCustomerService(customerId: number, formData: FormData) {
  try {
    const sql = await getSql()

    console.log("[v0] === addCustomerService START ===")
    console.log("[v0] Timestamp:", new Date().toISOString())

    const servicePlanId = Number.parseInt(formData.get("service_plan_id") as string)
    const routerId = formData.get("router_id") as string
    const authMethod = (formData.get("auth_method") as string) || "pppoe"
    const enforcementMode = (formData.get("enforcement_mode") as string) || "radius"
    const connectionType = formData.get("connection_type") as string
    const locationId = formData.get("location_id") as string
    const macAddress = formData.get("mac_address") as string
    const lockToMac = formData.get("lock_to_mac") === "on"
    const pppoeEnabled = formData.get("pppoe_enabled") === "on"
    const pppoeUsername = formData.get("pppoe_username") as string
    const pppoePassword = formData.get("pppoe_password") as string
    const ipAddress = formData.get("ip_address") as string
    const autoRenew = formData.get("auto_renew") === "on"

    console.log("[v0] Customer ID:", customerId)
    console.log("[v0] Service Plan ID:", servicePlanId)
    console.log("[v0] Router ID:", routerId)
    console.log("[v0] Auth Method:", authMethod)
    console.log("[v0] Enforcement Mode:", enforcementMode)
    console.log("[v0] Connection Type:", connectionType)
    console.log("[v0] Location ID:", locationId)
    console.log("[v0] MAC Address:", macAddress)
    console.log("[v0] Lock to MAC:", lockToMac)
    console.log("[v0] PPPoE Enabled:", pppoeEnabled)
    console.log("[v0] PPPoE Username:", pppoeUsername)
    console.log("[v0] PPPoE Password:", pppoePassword)
    console.log("[v0] IP Address:", ipAddress)
    console.log("[v0] Auto Renew:", autoRenew)

    if (!servicePlanId || isNaN(servicePlanId)) {
      console.log("[v0] Invalid service plan ID")
      return {
        success: false,
        error: "Invalid service plan selected. Please select a valid service plan.",
      }
    }

    if (!connectionType) {
      return {
        success: false,
        error: "Connection type is required. Please select a connection type.",
      }
    }

    if (ipAddress && ipAddress !== "auto") {
      console.log("[v0] Checking for duplicate IP address...")
      const existingIpAssignment = await sql`
        SELECT cs.id, sp.name as service_name
        FROM customer_services cs
        LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
        WHERE cs.customer_id = ${customerId} 
        AND cs.ip_address = ${ipAddress}
        AND cs.status IN ('active', 'pending', 'suspended')
        LIMIT 1
      `

      if (existingIpAssignment.length > 0) {
        console.log("[v0] DUPLICATE IP DETECTED - IP already assigned:", ipAddress)
        return {
          success: false,
          error: `This IP address (${ipAddress}) is already assigned to another service for this customer: ${existingIpAssignment[0].service_name || "Unknown Service"}. Please select a different IP address.`,
        }
      }
      console.log("[v0] IP address is available")
    }

    console.log("[v0] Proceeding with service creation...")

    const servicePlan = await sql`
      SELECT id, name, price, speed_download, speed_upload 
      FROM service_plans 
      WHERE id = ${servicePlanId} AND is_active = true
      LIMIT 1
    `

    if (servicePlan.length === 0) {
      return {
        success: false,
        error: `Service plan not found (ID: ${servicePlanId}). Please select a valid service plan.`,
      }
    }

    console.log("[v0] Creating new service...")

    const [service] = await sql`
      INSERT INTO customer_services (
        customer_id,
        service_plan_id,
        router_id,
        auth_method,
        enforcement_mode,
        connection_type,
        location_id,
        ip_address,
        mac_address,
        lock_to_mac,
        pppoe_username,
        pppoe_password,
        auto_renew,
        status,
        installation_date
      ) VALUES (
        ${customerId},
        ${servicePlanId},
        ${routerId || null},
        ${authMethod},
        ${enforcementMode},
        ${connectionType},
        ${locationId || null},
        ${ipAddress || null},
        ${macAddress || null},
        ${lockToMac},
        ${pppoeUsername || null},
        ${pppoePassword || null},
        ${autoRenew},
        'active',
        CURRENT_DATE
      )
      RETURNING id
    `

    const serviceId = service.id

    console.log("[v0] Handling provisioning based on enforcement mode:", enforcementMode)

    if (enforcementMode === "radius" || enforcementMode === "hybrid") {
      console.log("[v0] Provisioning to RADIUS...")
      // Provision to RADIUS
      await provisionRadiusUser({
        username: pppoeUsername,
        password: pppoePassword,
        planId: servicePlanId,
        ipAddress: ipAddress || null,
      })
    }

    if (enforcementMode === "direct" || enforcementMode === "hybrid") {
      console.log("[v0] Queueing async router provisioning...")
      // Queue async router provisioning
      await queueServiceProvisioning(serviceId, Number.parseInt(routerId), "CREATE", enforcementMode)
    }

    revalidatePath("/customers")
    console.log("[v0] Service created successfully:", serviceId)
    console.log("[v0] === addCustomerService END ===")

    return { success: true, serviceId }
  } catch (error) {
    console.error("[v0] Error adding customer service:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add service. Please try again.",
    }
  }
}

export async function updateCustomerServiceWithoutInvoice(serviceId: number, formData: FormData) {
  try {
    const sql = await getSql()

    const servicePlanIdStr = formData.get("service_plan_id") as string
    const servicePlanId = Number.parseInt(servicePlanIdStr)

    if (!servicePlanIdStr || isNaN(servicePlanId)) {
      return {
        success: false,
        error: "Invalid service plan selected. Please select a valid service plan.",
      }
    }

    const connectionType = formData.get("connection_type") as string

    if (!connectionType) {
      return {
        success: false,
        error: "Connection type is required. Please select a connection type.",
      }
    }

    const autoRenew = formData.get("auto_renew") === "on"
    const ipAddress = formData.get("ip_address") as string
    const device_id = formData.get("device_id") as string
    const lockToMac = formData.get("lock_to_mac") === "on"
    const pppoeEnabled = formData.get("pppoe_enabled") === "on"
    const pppoeUsername = formData.get("pppoe_username") as string
    const pppoePassword = formData.get("pppoe_password") as string

    // Get the service plan details
    const servicePlan = await sql`
      SELECT id, name, price, speed_download, speed_upload 
      FROM service_plans 
      WHERE id = ${servicePlanId}
      LIMIT 1
    `

    if (servicePlan.length === 0) {
      return {
        success: false,
        error: `Service plan not found (ID: ${servicePlanId}). Please select a valid service plan.`,
      }
    }

    // Update the service WITHOUT creating a new invoice
    const result = await sql`
      UPDATE customer_services
      SET
        service_plan_id = ${servicePlanId},
        status = ${formData.get("status")},
        monthly_fee = ${servicePlan[0].price},
        ip_address = ${ipAddress && ipAddress !== "auto" ? ipAddress : null},
        device_id = ${device_id || null},
        connection_type = ${connectionType || "pppoe"},
        lock_to_mac = ${lockToMac},
        auto_renew = ${autoRenew},
        pppoe_enabled = ${pppoeEnabled},
        pppoe_username = ${pppoeEnabled && pppoeUsername ? pppoeUsername : null},
        pppoe_password = ${pppoeEnabled && pppoePassword ? pppoePassword : null},
        updated_at = NOW()
      WHERE id = ${serviceId}
      RETURNING *
    `

    if (result.length === 0) {
      return {
        success: false,
        error: "Service not found",
      }
    }

    // Provision PPPoE credentials to RADIUS if enabled
    if (pppoeEnabled && pppoeUsername && pppoePassword) {
      console.log("[v0] Provisioning PPPoE credentials to RADIUS...")
      try {
        await provisionToStandardRadiusTables(
          pppoeUsername,
          pppoePassword,
          servicePlan[0].speed_download || "10M",
          servicePlan[0].speed_upload || "10M",
        )
        console.log("[v0] PPPoE credentials provisioned to RADIUS successfully")
      } catch (radiusError) {
        console.error("[v0] RADIUS provisioning failed:", radiusError)
        // Continue even if RADIUS provisioning fails
      }
    }

    // Log the activity
    await sql`
      INSERT INTO activity_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        description,
        created_at
      ) VALUES (
        1,
        'update',
        'customer_service',
        ${serviceId},
        ${`Updated service to ${servicePlan[0].name}`},
        NOW()
      )
      ON CONFLICT DO NOTHING
    `

    const customerId = result[0].customer_id
    revalidatePath(`/customers/${customerId}`, "page")

    return {
      success: true,
      service: result[0],
      message: "Service updated successfully",
    }
  } catch (error) {
    console.error("Error updating customer service:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update service. Please try again.",
    }
  }
}

export async function updateCustomerService(serviceId: number, formData: FormData) {
  try {
    const sql = await getSql()

    const servicePlanId = formData.get("service_plan_id")
      ? Number.parseInt(formData.get("service_plan_id") as string)
      : undefined
    const connectionType = formData.get("connection_type") as string
    const lockToMac = formData.get("lock_to_mac") === "on"
    const pppoeEnabled = formData.get("pppoe_enabled") === "on"
    const pppoeUsername = formData.get("pppoe_username") as string
    const pppoePassword = formData.get("pppoe_password") as string
    const ipAddress = formData.get("ip_address") as string
    const macAddress = formData.get("mac_address") as string
    const autoRenew = formData.get("auto_renew") === "on"

    const serviceData = await sql`
      SELECT cs.*, c.id as customer_id, c.portal_username,
             ia.ip_address, ia.router_id,
             r.ip_address as router_ip, r.configuration
      FROM customer_services cs
      JOIN customers c ON c.id = cs.customer_id
      LEFT JOIN ip_addresses ia ON ia.customer_id = cs.customer_id AND ia.status = 'allocated'
      LEFT JOIN network_devices r ON r.id = ia.router_id
      WHERE cs.id = ${serviceId}
      LIMIT 1
    `

    if (serviceData.length === 0) {
      return { success: false, error: "Service not found" }
    }

    const service = serviceData[0]

    console.log("[v0] Updating service in database...")

    const result = await sql`
      UPDATE customer_services
      SET 
        ${servicePlanId ? sql`service_plan_id = ${servicePlanId},` : sql``}
        ${connectionType ? sql`connection_type = ${connectionType},` : sql``}
        ${ipAddress ? sql`ip_address = ${ipAddress},` : sql``}
        ${macAddress ? sql`device_id = ${macAddress},` : sql``}
        ${macAddress ? sql`mac_address = ${macAddress},` : sql``}
        lock_to_mac = ${lockToMac},
        auto_renew = ${autoRenew},
        pppoe_enabled = ${pppoeEnabled},
        pppoe_username = ${pppoeUsername || null},
        pppoe_password = ${pppoePassword || null},
        updated_at = NOW()
      WHERE id = ${serviceId}
      RETURNING *
    `

    if (result.length === 0) {
      return { success: false, error: "Service not found" }
    }

    // Provision PPPoE credentials to RADIUS if enabled
    if (pppoeEnabled && (pppoeUsername || pppoePassword)) {
      const radiusUsername = pppoeUsername || service.portal_username || `customer_${service.customer_id}`
      const radiusPassword = pppoePassword || radiusUsername

      console.log(`[v0] Provisioning service ${service.id} to RADIUS...`)
      const radiusResult = await provisionRadiusUser({
        customerId: service.customer_id,
        serviceId: service.id,
        username: radiusUsername,
        password: radiusPassword,
        ipAddress: service.ip_address || undefined,
        downloadSpeed: service.download_speed,
        uploadSpeed: service.upload_speed,
        nasId: service.router_id || undefined,
      })

      if (!radiusResult.success) {
        console.error(`[v0] RADIUS provisioning failed:`, radiusResult.error)
      } else {
        console.log(`[v0] RADIUS provisioning successful`)
      }
    }

    if (servicePlanId && pppoeUsername) {
      try {
        const router = await sql`
          SELECT type FROM network_devices 
          WHERE id = (SELECT router_id FROM customer_services WHERE id = ${serviceId})
          LIMIT 1
        `
        const vendor = router[0]?.type || "mikrotik"

        await updateRadiusSpeed(pppoeUsername, servicePlanId, vendor)
        console.log(`[v0] RADIUS speed updated for service ${serviceId}`)
      } catch (error) {
        console.error("[v0] Failed to update RADIUS speed:", error)
      }
    }

    if (service.router_id && service.router_ip) {
      // Fire and forget - don't await
      Promise.resolve().then(async () => {
        try {
          // Status changed from pending to active - ADD to router AND RADIUS
          if (service.status === "pending" && formData.get("status") === "active") {
            console.log("[v0] Async provisioning: pending -> active")

            const [routerResult, radiusResult] = await Promise.all([
              provisionServiceToRouter({
                serviceId: service.id,
                customerId: service.customer_id,
                routerId: service.router_id,
                ipAddress: service.ip_address,
                connectionType: service.ip_address ? "static_ip" : "pppoe",
                pppoeUsername: service.portal_username,
                pppoePassword: service.portal_username,
                downloadSpeed: service.download_speed,
                uploadSpeed: service.upload_speed,
              }),
              provisionRadiusUser({
                customerId: service.customer_id,
                serviceId,
                username: service.portal_username || `customer_${service.customer_id}`,
                password: service.portal_username || `customer_${service.customer_id}`,
                ipAddress: service.ip_address,
                downloadSpeed: service.download_speed,
                uploadSpeed: service.upload_speed,
                nasId: service.router_id,
              }),
            ])

            console.log("[v0] Router result:", routerResult.success ? "OK" : routerResult.error)
            console.log("[v0] RADIUS result:", radiusResult.success ? "OK" : radiusResult.error)
          }

          // Status changed to suspended - REMOVE from router AND RADIUS
          if (formData.get("status") === "suspended" && service.status !== "suspended") {
            console.log("[v0] Async deprovisioning: -> suspended")

            await Promise.all([
              deprovisionServiceFromRouter({
                serviceId: service.id,
                customerId: service.customer_id,
                routerId: service.router_id,
                connectionType: service.ip_address ? "static_ip" : "pppoe",
                ipAddress: service.ip_address,
                pppoeUsername: service.portal_username,
                reason: "Service suspended",
              }),
              suspendRadiusUser({
                customerId: service.customer_id,
                serviceId,
                username: service.portal_username || `customer_${service.customer_id}`,
                reason: "Service suspended",
              }),
            ])
          }

          // Status changed from suspended to active - RE-ADD to router AND RADIUS
          if (formData.get("status") === "active" && service.status === "suspended") {
            console.log("[v0] Async re-provisioning: suspended -> active")

            await Promise.all([
              provisionServiceToRouter({
                serviceId: service.id,
                customerId: service.customer_id,
                routerId: service.router_id,
                ipAddress: service.ip_address,
                connectionType: service.ip_address ? "static_ip" : "pppoe",
                pppoeUsername: service.portal_username,
                pppoePassword: service.portal_username,
                downloadSpeed: service.download_speed,
                uploadSpeed: service.upload_speed,
              }),
              provisionRadiusUser({
                customerId: service.customer_id,
                serviceId,
                username: service.portal_username || `customer_${service.customer_id}`,
                password: service.portal_username || `customer_${service.customer_id}`,
                ipAddress: service.ip_address,
                downloadSpeed: service.download_speed,
                uploadSpeed: service.upload_speed,
                nasId: service.router_id,
              }),
            ])
          }
        } catch (provisionError) {
          console.error("[v0] Async router provisioning error:", provisionError)
        }
      })
    }

    revalidatePath(`/customers`)
    return { success: true, service: result[0] }
  } catch (error) {
    console.error("Error updating customer service:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update service" }
  }
}

export async function deleteCustomerService(serviceId: number) {
  try {
    const sql = await getSql()

    const serviceData = await sql`
      SELECT cs.*, c.id as customer_id, c.portal_username,
             ia.router_id, ia.ip_address
      FROM customer_services cs
      JOIN customers c ON c.id = cs.customer_id
      LEFT JOIN ip_addresses ia ON ia.customer_id = c.id AND ia.status = 'allocated'
      WHERE cs.id = ${serviceId}
      LIMIT 1
    `

    if (serviceData.length === 0) {
      return { success: false, error: "Service not found" }
    }

    const service = serviceData[0]

    if (service.portal_username) {
      await deprovisionRadiusUser({
        customerId: service.customer_id,
        serviceId,
        username: service.portal_username,
        reason: "Service deleted",
      }).catch((err) => console.error("[v0] RADIUS deprovision error:", err))
    }

    // Deprovision from router if provisioned
    if (service.router_id && (service.ip_address || service.portal_username)) {
      await deprovisionServiceFromRouter({
        serviceId,
        customerId: service.customer_id,
        routerId: service.router_id,
        connectionType: service.ip_address ? "static_ip" : "pppoe",
        ipAddress: service.ip_address,
        pppoeUsername: service.portal_username,
        reason: "Service deleted",
      }).catch((err) => console.error("[v0] Router deprovision error:", err))
    }

    await sql`
      DELETE FROM customer_services 
      WHERE id = ${serviceId}
    `

    revalidatePath(`/customers`)
    return {
      success: true,
      message: "Service terminated successfully and IP address released",
      service: serviceData[0],
    }
  } catch (error) {
    console.error("Error removing service:", error)
    return { success: false, error: "Failed to remove service" }
  }
}

export async function validateCustomerServiceRelationships() {
  try {
    const sql = await getSql()

    const orphanedServices = await sql`
      SELECT cs.id, cs.customer_id, cs.service_plan_id
      FROM customer_services cs
      LEFT JOIN customers c ON cs.customer_id = c.id
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE c.id IS NULL OR sp.id IS NULL
    `

    const customersWithoutServices = await sql`
      SELECT c.id, c.first_name, c.last_name, c.email
      FROM customers c
      LEFT JOIN customer_services cs ON c.id = cs.customer_id
      WHERE cs.id IS NULL AND c.status = 'active'
    `

    return {
      success: true,
      orphanedServices: orphanedServices.length,
      customersWithoutServices: customersWithoutServices.length,
      details: {
        orphaned: orphanedServices,
        withoutServices: customersWithoutServices,
      },
    }
  } catch (error) {
    console.error("Error validating relationships:", error)
    return { success: false, error: "Failed to validate relationships" }
  }
}

export async function fixOrphanedServices() {
  try {
    const sql = await getSql()

    const result = await sql`
      DELETE FROM customer_services 
      WHERE customer_id NOT IN (SELECT id FROM customers)
         OR service_plan_id NOT IN (SELECT id FROM service_plans)
      RETURNING id
    `

    return {
      success: true,
      message: `Cleaned up ${result.length} orphaned service records`,
      deletedCount: result.length,
    }
  } catch (error) {
    console.error("Error fixing orphaned services:", error)
    return { success: false, error: "Failed to fix orphaned services" }
  }
}

export async function processPayment(customerId: number, invoiceId: number, amount: number) {
  try {
    const sql = await getSql()

    // Update the invoice as paid
    await sql`
      UPDATE invoices
      SET status = 'paid',
          paid_amount = ${amount},
          paid_at = NOW(),
          updated_at = NOW()
      WHERE id = ${invoiceId} AND customer_id = ${customerId}
    `

    // Get pending services for this customer
    const pendingServices = await sql`
      SELECT cs.*, sp.download_speed, sp.upload_speed, sp.name as service_name
      FROM customer_services cs
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.customer_id = ${customerId} 
      AND cs.status = 'pending'
    `

    // Activate all pending services
    for (const service of pendingServices) {
      await sql`
        UPDATE customer_services
        SET status = 'active',
            activation_date = NOW(),
            updated_at = NOW()
        WHERE id = ${service.id}
      `

      // Generate PPPoE credentials
      const pppoeUsername = service.pppoe_username || `customer_${customerId}_service_${service.id}`
      const pppoePassword = service.pppoe_password || Math.random().toString(36).substring(2, 15)

      // Provision to RADIUS
      await provisionRadiusUser({
        customerId,
        serviceId: service.id,
        username: pppoeUsername,
        password: pppoePassword,
        ipAddress: service.ip_address || undefined,
        downloadSpeed: service.download_speed || 10,
        uploadSpeed: service.upload_speed || 10,
      })

      // Provision to standard RADIUS tables
      await provisionToStandardRadiusTables(
        pppoeUsername,
        pppoePassword,
        service.download_speed || "10M",
        service.upload_speed || "10M",
      )

      // Log the activation
      await sql`
        INSERT INTO activity_logs (
          user_id,
          action,
          entity_type,
          entity_id,
          description,
          created_at
        ) VALUES (
          1,
          'activate',
          'customer_service',
          ${service.id},
          ${`Service activated after payment: ${service.service_name}`},
          NOW()
        )
        ON CONFLICT DO NOTHING
      `
    }

    revalidatePath(`/customers/${customerId}`)

    return {
      success: true,
      message: `Payment processed successfully. ${pendingServices.length} service(s) activated.`,
      activatedServices: pendingServices.length,
    }
  } catch (error) {
    console.error("Error processing payment:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to process payment",
    }
  }
}

export async function updateServiceStatus(
  serviceId: string,
  newStatus: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const sql = await getSql()

    const service = await sql`
      SELECT cs.*, c.portal_username
      FROM customer_services cs
      JOIN customers c ON c.id = cs.customer_id
      WHERE cs.id = ${serviceId}
      LIMIT 1
    `

    if (service.length === 0) {
      return { success: false, error: "Service not found" }
    }

    const serviceData = service[0]
    const oldStatus = serviceData.status

    await sql`
      UPDATE customer_services
      SET status = ${newStatus},
          ${newStatus === "suspended" ? sql`suspension_date = NOW(),` : sql``}
          ${newStatus === "terminated" ? sql`termination_date = NOW(),` : sql``}
          ${newStatus === "active" ? sql`activation_date = NOW(),` : sql``}
          updated_at = NOW()
      WHERE id = ${serviceId}
    `

    // Handle RADIUS provisioning based on status change
    const username = serviceData.pppoe_username || serviceData.portal_username || `customer_${serviceData.customer_id}`
    const password = serviceData.pppoe_password || username

    if (newStatus === "active" && oldStatus !== "active") {
      // Activate in RADIUS
      await provisionRadiusUser({
        customerId: serviceData.customer_id,
        serviceId,
        username,
        password,
        ipAddress: serviceData.ip_address || undefined,
        downloadSpeed: serviceData.download_speed || 10,
        uploadSpeed: serviceData.upload_speed || 10,
      })
    } else if (newStatus === "suspended") {
      // Suspend in RADIUS
      await suspendRadiusUser({
        customerId: serviceData.customer_id,
        serviceId,
        username,
        reason: reason || "Service suspended",
      })
    } else if (newStatus === "terminated") {
      // Remove from RADIUS
      await deprovisionRadiusUser({
        customerId: serviceData.customer_id,
        serviceId,
        username,
        reason: reason || "Service terminated",
      })
    }

    // Log the status change
    await sql`
      INSERT INTO activity_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        description,
        created_at
      ) VALUES (
        1,
        'status_change',
        'customer_service',
        ${serviceId},
        ${`Status changed from ${oldStatus} to ${newStatus}${reason ? `: ${reason}` : ""}`},
        NOW()
      )
      ON CONFLICT DO NOTHING
    `

    revalidatePath(`/customers/${serviceData.customer_id}`)

    return {
      success: true,
      message: `Service status updated to ${newStatus}`,
      oldStatus,
      newStatus,
    }
  } catch (error) {
    console.error("Error updating service status:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update service status",
    }
  }
}

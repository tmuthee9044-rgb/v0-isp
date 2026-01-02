"use server"

import { getSql } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { ActivityLogger } from "@/lib/activity-logger"
import { releaseIPAddress } from "@/lib/ip-management"
import { provisionServiceToRouter, deprovisionServiceFromRouter } from "@/lib/router-provisioning"
import { provisionRadiusUser, suspendRadiusUser, deprovisionRadiusUser } from "@/lib/radius-integration"

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
    console.log("[v0] Customer ID:", customerId)
    console.log("[v0] Timestamp:", new Date().toISOString())

    const servicePlanIdStr = formData.get("service_plan_id") as string
    const servicePlanId = Number.parseInt(servicePlanIdStr)

    console.log("[v0] Service Plan ID:", servicePlanId)

    if (!servicePlanIdStr || isNaN(servicePlanId)) {
      console.log("[v0] Invalid service plan ID")
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
    const subnetId = formData.get("subnet_id") as string
    const locationId = formData.get("location_id") as string
    const macAddress = formData.get("mac_address") as string
    const lockToMac = formData.get("lock_to_mac") === "on"
    const pppoeEnabled = formData.get("pppoe_enabled") === "on"
    const pppoeUsername = formData.get("pppoe_username") as string
    const pppoePassword = formData.get("pppoe_password") as string
    const inventoryItems = formData.get("inventory_items") as string
    const adminOverride = formData.get("admin_override") === "on"
    const routerId = formData.get("router_id") as string

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

    const initialStatus = adminOverride ? "active" : "pending"

    console.log("[v0] Creating new service with status:", initialStatus)

    const result = await sql`
      INSERT INTO customer_services (
        customer_id, 
        service_plan_id, 
        status, 
        monthly_fee, 
        connection_type,
        mac_address,
        lock_to_mac,
        auto_renew,
        pppoe_username,
        pppoe_password,
        activation_date,
        created_at,
        updated_at
      ) VALUES (
        ${customerId},
        ${servicePlanId},
        ${initialStatus},
        ${servicePlan[0].price},
        ${connectionType},
        ${macAddress || null},
        ${lockToMac},
        ${autoRenew},
        ${pppoeEnabled ? pppoeUsername : null},
        ${pppoeEnabled ? pppoePassword : null},
        ${initialStatus === "active" ? sql`NOW()` : null},
        NOW(),
        NOW()
      ) RETURNING *
    `

    const serviceId = result[0].id
    let allocatedIpAddress = null

    if (ipAddress === "auto" || !ipAddress) {
      await sql`
        INSERT INTO pending_tasks (
          task_type, 
          resource_type, 
          resource_id, 
          data,
          status,
          created_at
        ) VALUES (
          'allocate_ip',
          'customer_service',
          ${serviceId},
          ${JSON.stringify({ customerId, serviceId, locationId, connectionType })}::jsonb,
          'pending',
          NOW()
        )
        ON CONFLICT DO NOTHING
      `
    } else if (ipAddress && subnetId) {
      await sql`
        UPDATE ip_addresses
        SET status = 'assigned', customer_id = ${customerId}, service_id = ${serviceId}
        WHERE ip_address::text = ${ipAddress}
      `
      allocatedIpAddress = ipAddress

      await sql`
        UPDATE customer_services
        SET ip_address = ${allocatedIpAddress}
        WHERE id = ${serviceId}
      `
    }

    const invoiceNumber = `INV-${customerId}-${Date.now()}-${serviceId}`
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    const invoice = await sql`
      INSERT INTO invoices (
        customer_id,
        invoice_number,
        amount,
        total_amount,
        due_date,
        status,
        description,
        created_at
      ) VALUES (
        ${customerId},
        ${invoiceNumber},
        ${servicePlan[0].price},
        ${servicePlan[0].price},
        ${dueDate.toISOString().split("T")[0]},
        ${adminOverride ? "paid" : "pending"},
        ${`Initial invoice for ${servicePlan[0].name}`},
        NOW()
      ) RETURNING id
    `

    if (adminOverride) {
      await sql`
        UPDATE invoices 
        SET paid_amount = ${servicePlan[0].price}
        WHERE id = ${invoice[0].id}
      `

      await sql`
        INSERT INTO admin_logs (admin_id, action, resource_type, resource_id, new_values, created_at)
        VALUES (
          1,
          'service_activation',
          'customer_service',
          ${serviceId},
          ${JSON.stringify({
            customer_id: customerId,
            service_id: serviceId,
            invoice_id: invoice[0].id,
            reason: "admin_override",
          })}::jsonb,
          NOW()
        )
      `

      const radiusUsername = pppoeUsername || `customer_${customerId}`
      const radiusPassword = pppoePassword || Math.random().toString(36).substring(2, 15)

      console.log("[v0] Provisioning to RADIUS...")
      const radiusResult = await provisionRadiusUser({
        customerId,
        serviceId,
        username: radiusUsername,
        password: radiusPassword,
        ipAddress: allocatedIpAddress || undefined,
        downloadSpeed: servicePlan[0].speed_download,
        uploadSpeed: servicePlan[0].speed_upload,
        nasId: routerId ? Number.parseInt(routerId) : undefined,
      })

      if (!radiusResult.success) {
        console.log("[v0] Warning: RADIUS provisioning failed:", radiusResult.error)
      } else {
        console.log("[v0] RADIUS user provisioned successfully")
      }

      if (routerId) {
        console.log("[v0] Auto-provisioning service to physical router...")

        const provisionResult = await provisionServiceToRouter({
          serviceId,
          customerId,
          routerId: Number.parseInt(routerId),
          ipAddress: allocatedIpAddress || undefined,
          connectionType: connectionType as "pppoe" | "static_ip" | "dhcp",
          pppoeUsername: radiusUsername,
          pppoePassword: radiusPassword,
          downloadSpeed: servicePlan[0].speed_download,
          uploadSpeed: servicePlan[0].speed_upload,
        })

        if (!provisionResult.success) {
          console.log("[v0] Warning: Router provisioning failed:", provisionResult.error)
          // Don't fail the entire operation, just log the warning
        } else {
          console.log("[v0] Service auto-provisioned to router successfully")
        }
      } else {
        console.log("[v0] No router ID provided, skipping physical router provisioning")
      }
    }

    if (inventoryItems) {
      try {
        const itemIds = JSON.parse(inventoryItems)
        if (itemIds.length > 0) {
          for (const itemId of itemIds) {
            await sql`
              INSERT INTO service_inventory (service_id, inventory_id, assigned_at, status)
              VALUES (${serviceId}, ${Number.parseInt(itemId)}, NOW(), 'assigned')
              ON CONFLICT DO NOTHING
            `
          }

          await sql`
            UPDATE inventory 
            SET stock_quantity = stock_quantity - 1
            WHERE id = ANY(${itemIds.map((id: string) => Number.parseInt(id))})
            AND stock_quantity > 0
          `
        }
      } catch (inventoryError) {
        console.error("Inventory assignment error:", inventoryError)
      }
    }

    revalidatePath(`/customers/${customerId}`, "page")

    console.log("[v0] Service created successfully:", result[0].id)
    console.log("[v0] === addCustomerService END ===")

    return {
      success: true,
      service: result[0],
      invoice: { id: invoice[0].id },
      ip_address: allocatedIpAddress,
      message: adminOverride
        ? "Service activated immediately with admin override."
        : "Service created with pending payment status. IP will be assigned upon activation.",
    }
  } catch (error) {
    console.error("Error adding customer service:", error)
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
        connection_type = ${connectionType},
        monthly_fee = ${servicePlan[0].price},
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

    // Update IP address if changed
    if (ipAddress && ipAddress !== "auto") {
      await sql`
        UPDATE customer_services
        SET ip_address = ${ipAddress}
        WHERE id = ${serviceId}
      `
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

    const monthlyFee = Number.parseFloat(formData.get("monthly_fee") as string)
    const status = formData.get("status") as string
    const oldStatus = formData.get("old_status") as string
    const connectionType = formData.get("connection_type") as string
    const ipAddress = formData.get("ip_address") as string

    const macAddress = formData.get("mac_address") as string
    const lockToMac = formData.get("lock_to_mac") === "on"
    const autoRenew = formData.get("auto_renew") === "on"
    const pppoeEnabled = formData.get("pppoe_enabled") === "on"
    const pppoeUsername = formData.get("pppoe_username") as string
    const pppoePassword = formData.get("pppoe_password") as string

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

    const result = await sql`
      UPDATE customer_services 
      SET 
        monthly_fee = ${monthlyFee},
        status = ${status},
        connection_type = ${connectionType || service.connection_type},
        ip_address = ${ipAddress && ipAddress !== "auto" ? ipAddress : service.ip_address},
        mac_address = ${macAddress || service.mac_address},
        lock_to_mac = ${lockToMac},
        auto_renew = ${autoRenew},
        pppoe_username = ${pppoeEnabled ? pppoeUsername : service.pppoe_username},
        pppoe_password = ${pppoeEnabled ? pppoePassword : service.pppoe_password},
        activation_date = CASE WHEN ${status} = 'active' AND activation_date IS NULL THEN NOW() ELSE activation_date END,
        suspension_date = CASE WHEN ${status} = 'suspended' THEN NOW() ELSE suspension_date END,
        updated_at = NOW()
      WHERE id = ${serviceId}
      RETURNING *
    `

    if (result.length === 0) {
      return { success: false, error: "Service not found" }
    }

    if (pppoeEnabled && (pppoeUsername || pppoePassword)) {
      const radiusUsername = pppoeUsername || service.portal_username || `customer_${service.customer_id}`
      const radiusPassword = pppoePassword || radiusUsername

      if (status === "active") {
        await provisionRadiusUser({
          customerId: service.customer_id,
          serviceId: service.id,
          username: radiusUsername,
          password: radiusPassword,
          ipAddress: ipAddress || service.ip_address,
          downloadSpeed: service.download_speed || 10,
          uploadSpeed: service.upload_speed || 10,
          nasId: service.router_id,
        })
      }
    }

    if (service.router_id && service.router_ip && (service.portal_username || service.ip_address)) {
      // Fire and forget - don't await
      Promise.resolve().then(async () => {
        try {
          // Status changed from pending to active - ADD to router AND RADIUS
          if (oldStatus === "pending" && status === "active") {
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
                serviceId: service.id,
                username: service.portal_username || `customer_${service.customer_id}`,
                password: service.portal_username || `customer_${service.customer_id}`,
                ipAddress: service.ip_address,
                downloadSpeed: service.download_speed || 10,
                uploadSpeed: service.upload_speed || 10,
                nasId: service.router_id,
              }),
            ])

            console.log("[v0] Router result:", routerResult.success ? "OK" : routerResult.error)
            console.log("[v0] RADIUS result:", radiusResult.success ? "OK" : radiusResult.error)
          }

          // Status changed to suspended - REMOVE from router AND RADIUS
          if (status === "suspended" && oldStatus !== "suspended") {
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
                serviceId: service.id,
                username: service.portal_username || `customer_${service.customer_id}`,
                reason: "Service suspended",
              }),
            ])
          }

          // Status changed from suspended to active - RE-ADD to router AND RADIUS
          if (status === "active" && oldStatus === "suspended") {
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
                serviceId: service.id,
                username: service.portal_username || `customer_${service.customer_id}`,
                password: service.portal_username || `customer_${service.customer_id}`,
                ipAddress: service.ip_address,
                downloadSpeed: service.download_speed || 10,
                uploadSpeed: service.upload_speed || 10,
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
    console.error("Error deleting customer service:", error)
    return { success: false, error: "Failed to delete service" }
  }
}

export async function updateServiceStatus(serviceId: number, status: string) {
  try {
    const sql = await getSql()

    const serviceDetails = await sql`
      SELECT 
        cs.*,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        sp.name as plan_name,
        sp.download_speed,
        sp.upload_speed,
        nd.id as router_id,
        nd.ip_address as router_ip,
        nd.username as router_username,
        nd.password as router_password,
        nd.api_port as router_api_port
      FROM customer_services cs
      INNER JOIN customers c ON cs.customer_id = c.id
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      LEFT JOIN network_devices nd ON cs.router_id = nd.id
      WHERE cs.id = ${serviceId}
      LIMIT 1
    `

    if (serviceDetails.length === 0) {
      return { success: false, error: "Service not found" }
    }

    const service = serviceDetails[0]

    console.log("[v0] Service details:", {
      serviceId: service.id,
      customerId: service.customer_id,
      routerId: service.router_id,
      ipAddress: service.ip_address,
      pppoeUsername: service.pppoe_username,
      status: service.status,
      targetStatus: status,
    })

    // Update the service status
    const result = await sql`
      UPDATE customer_services 
      SET 
        status = ${status},
        activation_date = CASE WHEN ${status} = 'active' AND activation_date IS NULL THEN NOW() ELSE activation_date END,
        updated_at = NOW()
      WHERE id = ${serviceId}
      RETURNING *
    `

    if (result.length === 0) {
      return { success: false, error: "Failed to update service status" }
    }

    // If activating the service, provision to RADIUS and router
    if (status === "active") {
      console.log("[v0] Service activation detected, provisioning to RADIUS and router...")

      if (!service.pppoe_username || !service.pppoe_password) {
        console.error("[v0] Missing PPPoE credentials. Username:", service.pppoe_username)
        return {
          success: false,
          error:
            "Cannot activate service: Missing PPPoE username or password. Please add the service through /services/add with complete details.",
        }
      }

      if (!service.ip_address) {
        console.error("[v0] Missing IP address for service")
        return {
          success: false,
          error: "Cannot activate service: No IP address assigned. Please assign an IP address first.",
        }
      }

      // Provision to RADIUS
      try {
        await provisionRadiusUser({
          username: service.pppoe_username,
          password: service.pppoe_password,
          ipAddress: service.ip_address,
          bandwidth: service.download_speed || 10,
          customerId: service.customer_id,
          serviceId: service.id,
        })
        console.log("[v0] Successfully provisioned to RADIUS")
      } catch (radiusError) {
        console.error("[v0] RADIUS provisioning failed:", radiusError)
        // Continue with router provisioning even if RADIUS fails
      }

      // Provision to physical router
      if (service.router_id && service.router_ip) {
        try {
          console.log("[v0] Provisioning to router:", {
            routerId: service.router_id,
            routerIp: service.router_ip,
            customerIp: service.ip_address,
          })

          await provisionServiceToRouter(service.router_id, service.customer_id, service.id, {
            ip: service.router_ip,
            username: service.router_username,
            password: service.router_password,
            port: service.router_api_port || 443,
          })

          console.log("[v0] Successfully provisioned to physical router")

          await sql`
            UPDATE customer_services
            SET 
              router_provisioned = true,
              router_provisioned_at = NOW()
            WHERE id = ${serviceId}
          `
        } catch (routerError) {
          console.error("[v0] Router provisioning failed:", routerError)

          await sql`
            UPDATE customer_services
            SET provisioning_error = ${routerError instanceof Error ? routerError.message : String(routerError)}
            WHERE id = ${serviceId}
          `
        }
      } else {
        console.log("[v0] No router assigned to service, skipping router provisioning")
      }

      // Log the activation
      await sql`
        INSERT INTO system_logs (
          entity_type, entity_id, action, description, user_id, created_at
        ) VALUES (
          'service', ${serviceId}, 'activate',
          ${`Service activated for customer ${service.first_name} ${service.last_name}. PPPoE: ${service.pppoe_username}, IP: ${service.ip_address}`},
          1, NOW()
        )
      `
    }

    // If suspending the service, deprovision from RADIUS and router
    if (status === "suspended") {
      console.log("[v0] Service suspension detected, deprovisioning...")

      if (service.pppoe_username) {
        try {
          await deprovisionRadiusUser(service.pppoe_username)
          console.log("[v0] Successfully deprovisioned from RADIUS")
        } catch (error) {
          console.error("[v0] RADIUS deprovisioning failed:", error)
        }
      }

      if (service.router_id && service.pppoe_username && service.router_ip) {
        try {
          await deprovisionServiceFromRouter(service.router_id, service.pppoe_username, {
            ip: service.router_ip,
            username: service.router_username,
            password: service.router_password,
            port: service.router_api_port || 443,
          })
          console.log("[v0] Successfully deprovisioned from router")

          await sql`
            UPDATE customer_services
            SET 
              router_provisioned = false,
              router_deprovisioned_at = NOW()
            WHERE id = ${serviceId}
          `
        } catch (error) {
          console.error("[v0] Router deprovisioning failed:", error)
        }
      }

      await sql`
        INSERT INTO system_logs (
          entity_type, entity_id, action, description, user_id, created_at
        ) VALUES (
          'service', ${serviceId}, 'suspend',
          ${`Service suspended for customer ${service.first_name} ${service.last_name}.`},
          1, NOW()
        )
      `
    }

    revalidatePath("/customers")
    return { success: true, message: "Service status updated and provisioned", service: result[0] }
  } catch (error) {
    console.error("[v0] Error updating service status:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function activateServiceOnPayment(paymentId: number, customerId: number) {
  try {
    const sql = await getSql()

    const pendingServices = await sql`
      SELECT cs.*, sp.name as service_name, sp.speed_download, sp.upload_speed,
             c.portal_username, c.email,
             ia.ip_address, ia.router_id,
             nd.ip_address as router_ip, nd.api_port, nd.api_username, nd.api_password, nd.use_ssl
      FROM customer_services cs
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      JOIN customers c ON c.id = cs.customer_id
      LEFT JOIN ip_addresses ia ON ia.customer_id = cs.customer_id AND ia.service_id = cs.id
      LEFT JOIN network_devices nd ON nd.id = ia.router_id
      WHERE cs.customer_id = ${customerId}
      AND cs.status = 'pending'
      ORDER BY cs.created_at ASC
    `

    console.log(`[v0] Activating ${pendingServices.length} pending services after payment`)

    for (const service of pendingServices) {
      await sql`
        UPDATE customer_services 
        SET status = 'active', activation_date = NOW()
        WHERE id = ${service.id}
      `

      const radiusUsername = service.portal_username || `customer_${customerId}`
      const radiusPassword = service.portal_username || `customer_${customerId}`

      console.log(`[v0] Provisioning service ${service.id} to RADIUS...`)
      const radiusResult = await provisionRadiusUser({
        customerId,
        serviceId: service.id,
        username: radiusUsername,
        password: radiusPassword,
        ipAddress: service.ip_address || undefined,
        downloadSpeed: service.speed_download,
        uploadSpeed: service.upload_speed,
        nasId: service.router_id || undefined,
      })

      if (!radiusResult.success) {
        console.error(`[v0] RADIUS provisioning failed:`, radiusResult.error)
      } else {
        console.log(`[v0] RADIUS provisioning successful`)
      }

      if (service.router_id && service.router_ip) {
        console.log(`[v0] Provisioning service ${service.id} to physical router ${service.router_id}...`)

        const routerResult = await provisionServiceToRouter({
          serviceId: service.id,
          customerId,
          routerId: service.router_id,
          ipAddress: service.ip_address || undefined,
          connectionType: service.ip_address ? "static_ip" : "pppoe",
          pppoeUsername: radiusUsername,
          pppoePassword: radiusPassword,
          downloadSpeed: service.speed_download,
          uploadSpeed: service.upload_speed,
        })

        if (!routerResult.success) {
          console.error(`[v0] Router provisioning failed:`, routerResult.error)
        } else {
          console.log(
            `[v0] Router provisioning successful - PPPoE secret created with IP ${service.ip_address || "auto"}`,
          )
        }
      } else {
        console.log(`[v0] No router assigned to service ${service.id}, skipping router provisioning`)
      }

      await sql`
        INSERT INTO system_logs (level, category, source, message, details, created_at)
        VALUES (
          'INFO', 'customer', 'service_activation',
          ${`Service ${service.service_name} activated for customer ${customerId} after payment ${paymentId}`},
          ${JSON.stringify({
            customer_id: customerId,
            service_id: service.id,
            service_name: service.service_name,
            payment_id: paymentId,
            radius_provisioned: radiusResult.success,
            router_provisioned: service.router_id ? true : false,
            pppoe_username: radiusUsername,
          })},
          NOW()
        )
      `
    }

    return {
      success: true,
      activated_services: pendingServices.length,
      message: `${pendingServices.length} service(s) activated and provisioned successfully`,
    }
  } catch (error) {
    console.error("[v0] Error activating services on payment:", error)
    return { success: false, error: "Failed to activate services" }
  }
}

export async function processPayment(formData: FormData) {
  try {
    const sql = await getSql()

    const customerId = Number.parseInt(formData.get("customer_id") as string)
    const amount = Number.parseFloat(formData.get("amount") as string)
    const method = formData.get("method") as string
    const reference = formData.get("reference") as string

    await ActivityLogger.logCustomerActivity(`initiated ${method} payment of KES ${amount}`, customerId.toString(), {
      amount,
      payment_method: method,
      reference,
      action: "payment_initiated",
    })

    const paymentResult = await sql`
      INSERT INTO payments (
        customer_id,
        amount,
        payment_method,
        transaction_id,
        status,
        payment_date,
        created_at
      ) VALUES (
        ${customerId},
        ${amount},
        ${method},
        ${reference || `PAY-${Date.now()}`},
        'completed',
        NOW(),
        NOW()
      ) RETURNING *
    `

    const unpaidInvoices = await sql`
      SELECT * FROM invoices 
      WHERE customer_id = ${customerId} 
      AND status IN ('pending', 'overdue')
      ORDER BY created_at ASC
    `

    let remainingAmount = amount
    for (const invoice of unpaidInvoices) {
      if (remainingAmount <= 0) break

      const paymentAmount = Math.min(remainingAmount, invoice.amount)

      await sql`
        UPDATE invoices 
        SET 
          status = CASE 
            WHEN ${paymentAmount} >= amount THEN 'paid'
            ELSE 'partial'
          END,
          paid_amount = COALESCE(paid_amount, 0) + ${paymentAmount}
        WHERE id = ${invoice.id}
      `

      remainingAmount -= paymentAmount
    }

    const activationResult = await activateServiceOnPayment(paymentResult[0].id, customerId)

    if (method.toLowerCase().includes("mpesa") || method.toLowerCase().includes("m-pesa")) {
      await ActivityLogger.logMpesaActivity(
        `Customer payment completed: KES ${amount}`,
        reference || paymentResult[0].transaction_id,
        {
          customer_id: customerId,
          payment_id: paymentResult[0].id,
          amount,
          payment_method: method,
          transaction_id: paymentResult[0].transaction_id,
          status: "completed",
          services_activated: activationResult.activated_services || 0,
        },
        "SUCCESS",
      )
    } else {
      await ActivityLogger.logCustomerActivity(`completed ${method} payment of KES ${amount}`, customerId.toString(), {
        payment_id: paymentResult[0].id,
        amount,
        payment_method: method,
        transaction_id: paymentResult[0].transaction_id,
        status: "completed",
        services_activated: activationResult.activated_services || 0,
      })
    }

    revalidatePath(`/customers/${customerId}`)
    return {
      success: true,
      message: `Payment of KSh ${amount} processed successfully. ${activationResult.activated_services || 0} service(s) activated.`,
      payment: paymentResult[0],
      services_activated: activationResult.activated_services || 0,
    }
  } catch (error) {
    const customerId = Number.parseInt(formData.get("customer_id") as string)
    const amount = Number.parseFloat(formData.get("amount") as string)
    const method = formData.get("method") as string

    await ActivityLogger.logCustomerActivity(
      `payment processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      customerId.toString(),
      {
        amount,
        payment_method: method,
        error: error instanceof Error ? error.message : "Unknown error",
        action: "payment_failed",
      },
    )

    console.error("Error processing payment:", error)
    return { success: false, error: "Failed to process payment" }
  }
}

export async function removeCustomerService(serviceId: number, customerId: number) {
  try {
    const sql = await getSql()

    const [service] = await sql`
      SELECT * FROM customer_services WHERE id = ${serviceId} AND customer_id = ${customerId}
    `

    if (!service) {
      return { success: false, error: "Service not found" }
    }

    if (service.ip_address) {
      const releaseResult = await releaseIPAddress(serviceId, "Service terminated by user")

      if (releaseResult.success) {
        console.log("[v0] Released IP address:", service.ip_address)
      } else {
        console.error("[v0] Failed to release IP address:", releaseResult.message)
      }
    }

    const result = await sql`
      UPDATE customer_services 
      SET status = 'terminated', end_date = CURRENT_DATE
      WHERE id = ${serviceId} AND customer_id = ${customerId}
      RETURNING *
    `

    if (result.length === 0) {
      return { success: false, error: "Service not found" }
    }

    revalidatePath(`/customers/${customerId}`)
    return { success: true, message: "Service terminated successfully and IP address released", service: result[0] }
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

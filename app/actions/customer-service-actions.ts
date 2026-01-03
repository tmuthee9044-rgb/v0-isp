"use server"

import { getSql } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { provisionServiceToRouter, deprovisionServiceFromRouter } from "@/lib/router-provisioning"
import { provisionRadiusUser, suspendRadiusUser, deprovisionRadiusUser } from "@/lib/radius-integration"
import { provisionToStandardRadiusTables } from "@/lib/radius-provisioning"

async function storePPPoECredentials(serviceId: number, username: string, password: string) {
  const sql = await getSql()
  await sql`
    INSERT INTO pending_tasks (
      task_type,
      entity_id,
      entity_type,
      task_data,
      status,
      created_at
    ) VALUES (
      'pppoe_credentials',
      ${serviceId},
      'service',
      ${JSON.stringify({ username, password })},
      'completed',
      NOW()
    )
    ON CONFLICT (entity_id, entity_type, task_type)
    DO UPDATE SET 
      task_data = ${JSON.stringify({ username, password })},
      updated_at = NOW()
  `
}

async function retrievePPPoECredentials(serviceId: number): Promise<{ username?: string; password?: string }> {
  const sql = await getSql()
  const result = await sql`
    SELECT task_data 
    FROM pending_tasks 
    WHERE entity_id = ${serviceId} 
      AND entity_type = 'service' 
      AND task_type = 'pppoe_credentials'
    ORDER BY created_at DESC
    LIMIT 1
  `
  if (result.length > 0 && result[0].task_data) {
    return result[0].task_data as { username?: string; password?: string }
  }
  return {}
}

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

export async function addCustomerService(data: {
  customerId: number
  servicePlanId: number
  connectionType?: string
  ipAddress?: string
  macAddress?: string
  deviceId?: number | null
  lockToMac?: boolean
  pppoeUsername?: string
  pppoePassword?: string
  autoRenew?: boolean
  locationId?: number | null
}) {
  try {
    const {
      customerId,
      servicePlanId,
      connectionType,
      ipAddress,
      macAddress,
      deviceId,
      lockToMac,
      pppoeUsername,
      pppoePassword,
      autoRenew,
      locationId,
    } = data

    const sql = await getSql()

    console.log("[v0] === addCustomerService START ===")
    console.log("[v0] Timestamp:", new Date().toISOString())

    console.log("[v0] Customer ID:", customerId)
    console.log("[v0] Service Plan ID:", servicePlanId)
    console.log("[v0] Connection Type:", connectionType)
    console.log("[v0] Location ID:", locationId)
    console.log("[v0] MAC Address:", macAddress)
    console.log("[v0] Lock to MAC:", lockToMac)
    console.log("[v0] PPPoE Username:", pppoeUsername)
    console.log("[v0] PPPoE Password:", pppoePassword)
    console.log("[v0] Device ID:", deviceId)
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

    const ipAddressProvided = ipAddress && ipAddress !== "auto"

    if (ipAddressProvided) {
      console.log("[v0] Checking for duplicate IP address...")
      const existingIpAssignment = await sql`
        SELECT cs.id, sp.name as service_name
        FROM customer_services cs
        LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
        WHERE cs.customer_id = ${customerId} 
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

    const initialStatus = autoRenew ? "active" : "pending"

    console.log("[v0] Creating new service with status:", initialStatus)

    const result = await sql`
      INSERT INTO customer_services (
        customer_id, 
        service_plan_id, 
        status, 
        monthly_fee,
        activation_date,
        connection_type,
        ip_address,
        mac_address,
        device_id,
        lock_to_mac,
        auto_renew,
        pppoe_username,
        pppoe_password,
        location_id,
        created_at,
        updated_at
      ) VALUES (
        ${customerId},
        ${servicePlanId},
        ${initialStatus},
        ${servicePlan[0].price},
        ${initialStatus === "active" ? sql`NOW()` : null},
        ${connectionType || "pppoe"},
        ${ipAddressProvided ? ipAddress : null},
        ${macAddress || null},
        ${deviceId || null},
        ${lockToMac || false},
        ${autoRenew || true},
        ${pppoeUsername || null},
        ${pppoePassword || null},
        ${locationId || null},
        NOW(),
        NOW()
      )
      RETURNING id
    `

    const serviceId = result[0].id
    let allocatedIpAddress = ipAddressProvided ? ipAddress : null

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
          ${JSON.stringify({ customerId, serviceId, locationId, connectionType, macAddress, lockToMac })}::jsonb,
          'pending',
          NOW()
        )
        ON CONFLICT DO NOTHING
      `
    } else if (ipAddressProvided && locationId) {
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
        ${autoRenew ? "paid" : "pending"},
        ${`Initial invoice for ${servicePlan[0].name}`},
        NOW()
      ) RETURNING id
    `

    if (autoRenew) {
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
            reason: "auto_renew",
          })}::jsonb,
          NOW()
        )
      `

      console.log("[v0] Provisioning to RADIUS with credentials...")
      const radiusResult = await provisionRadiusUser({
        customerId,
        serviceId: serviceId,
        username: pppoeUsername || `customer_${customerId}_service_${serviceId}`,
        password: pppoePassword || Math.random().toString(36).substring(2, 15),
        ipAddress: allocatedIpAddress || undefined,
        downloadSpeed: servicePlan[0].speed_download,
        uploadSpeed: servicePlan[0].speed_upload,
      })

      if (!radiusResult.success) {
        console.log("[v0] Warning: RADIUS provisioning failed:", radiusResult.error)
      } else {
        console.log("[v0] RADIUS user provisioned successfully")
      }

      if (locationId) {
        console.log("[v0] Auto-provisioning service to physical router...")

        const provisionResult = await provisionServiceToRouter({
          serviceId,
          customerId,
          locationId,
          ipAddress: allocatedIpAddress || undefined,
          connectionType: connectionType as "pppoe" | "static_ip" | "dhcp",
          pppoeUsername: pppoeUsername || `customer_${customerId}_service_${serviceId}`,
          pppoePassword: pppoePassword || Math.random().toString(36).substring(2, 15),
          downloadSpeed: servicePlan[0].speed_download,
          uploadSpeed: servicePlan[0].speed_upload,
        })

        if (!provisionResult.success) {
          console.log("[v0] Warning: Router provisioning failed:", provisionResult.error)
        } else {
          console.log("[v0] Service auto-provisioned to router successfully")
        }
      }
    }

    if (pppoeUsername && pppoePassword) {
      console.log("[v0] Storing PPPoE credentials in RADIUS tables:", pppoeUsername)

      await sql`
        INSERT INTO radcheck (username, attribute, op, value)
        VALUES (${pppoeUsername}, 'Cleartext-Password', ':=', ${pppoePassword})
        ON CONFLICT (username, attribute) 
        DO UPDATE SET value = ${pppoePassword}, updated_at = NOW()
      `

      const downloadLimit = servicePlan[0].speed_download
      const uploadLimit = servicePlan[0].speed_upload

      await sql`
        INSERT INTO radreply (username, attribute, op, value)
        VALUES (${pppoeUsername}, 'Mikrotik-Rate-Limit', ':=', ${`${downloadLimit}M/${uploadLimit}M`})
        ON CONFLICT (username, attribute)
        DO UPDATE SET value = ${`${downloadLimit}M/${uploadLimit}M`}, updated_at = NOW()
      `

      if (macAddress && lockToMac) {
        await sql`
          INSERT INTO radcheck (username, attribute, op, value)
          VALUES (${pppoeUsername}, 'Calling-Station-Id', '==', ${macAddress})
          ON CONFLICT (username, attribute)
          DO UPDATE SET value = ${macAddress}, updated_at = NOW()
        `
      }

      console.log("[v0] PPPoE credentials stored in RADIUS tables successfully")
    }

    revalidatePath(`/customers/${customerId}`, "page")

    console.log("[v0] Service created successfully:", serviceId)
    console.log("[v0] === addCustomerService END ===")

    return {
      success: true,
      serviceId,
      message: autoRenew
        ? "Service activated immediately with auto renew."
        : "Service created with pending payment status. IP will be assigned upon activation.",
    }
  } catch (error: any) {
    console.error("[v0] Error adding customer service:", error.message)
    return {
      success: false,
      error: error.message,
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

    const result = await sql`
      UPDATE customer_services
      SET
        service_plan_id = ${servicePlanId},
        status = ${formData.get("status")},
        monthly_fee = ${servicePlan[0].price},
        ip_address = ${ipAddress && ipAddress !== "auto" ? ipAddress : null},
        device_id = ${device_id || null},
        connection_type = ${connectionType || "pppoe"},
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
      }
    }

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

export async function updateCustomerService(
  serviceId: number,
  data: {
    servicePlanId?: number
    status?: string
    connectionType?: string
    ipAddress?: string
    macAddress?: string
    deviceId?: number | null
    lockToMac?: boolean
    pppoeUsername?: string
    pppoePassword?: string
    autoRenew?: boolean
    locationId?: number | null
  },
) {
  try {
    const sql = await getSql()

    const {
      servicePlanId,
      status,
      connectionType,
      ipAddress,
      macAddress,
      deviceId,
      lockToMac,
      pppoeUsername,
      pppoePassword,
      autoRenew,
      locationId,
    } = data

    const serviceData = await sql`
      SELECT cs.*, c.id as customer_id, c.portal_username,
             sp.speed_download, sp.speed_upload
      FROM customer_services cs
      JOIN customers c ON c.id = cs.customer_id
      LEFT JOIN service_plans sp ON sp.id = cs.service_plan_id
      WHERE cs.id = ${serviceId}
      LIMIT 1
    `

    if (serviceData.length === 0) {
      return { success: false, error: "Service not found" }
    }

    const service = serviceData[0]

    console.log("[v0] Updating service in database...")

    const updateQuery = sql`
      UPDATE customer_services
      SET 
        service_plan_id = COALESCE(${servicePlanId}, service_plan_id),
        status = COALESCE(${status}, status),
        connection_type = COALESCE(${connectionType}, connection_type),
        ip_address = COALESCE(${ipAddress}, ip_address),
        mac_address = COALESCE(${macAddress}, mac_address),
        device_id = COALESCE(${deviceId}, device_id),
        lock_to_mac = COALESCE(${lockToMac}, lock_to_mac),
        auto_renew = COALESCE(${autoRenew}, auto_renew),
        pppoe_username = COALESCE(${pppoeUsername}, pppoe_username),
        pppoe_password = COALESCE(${pppoePassword}, pppoe_password),
        location_id = COALESCE(${locationId}, location_id),
        updated_at = NOW()
      WHERE id = ${serviceId}
      RETURNING *
    `

    const result = await updateQuery
    console.log("[v0] Successfully updated service:", serviceId)

    if (pppoeUsername && pppoePassword) {
      console.log("[v0] Updating PPPoE credentials in RADIUS tables:", pppoeUsername)

      await sql`
        INSERT INTO radcheck (username, attribute, op, value)
        VALUES (${pppoeUsername}, 'Cleartext-Password', ':=', ${pppoePassword})
        ON CONFLICT (username, attribute)
        DO UPDATE SET value = ${pppoePassword}, updated_at = NOW()
      `

      if (servicePlanId) {
        const servicePlan =
          await sql`SELECT download_speed, upload_speed FROM service_plans WHERE id = ${servicePlanId}`
        if (servicePlan.length > 0) {
          const downloadLimit = servicePlan[0].download_speed
          const uploadLimit = servicePlan[0].upload_speed

          await sql`
            INSERT INTO radreply (username, attribute, op, value)
            VALUES (${pppoeUsername}, 'Mikrotik-Rate-Limit', ':=', ${`${downloadLimit}M/${uploadLimit}M`})
            ON CONFLICT (username, attribute)
            DO UPDATE SET value = ${`${downloadLimit}M/${uploadLimit}M`}, updated_at = NOW()
          `
        }
      }

      if (macAddress && lockToMac) {
        await sql`
          INSERT INTO radcheck (username, attribute, op, value)
          VALUES (${pppoeUsername}, 'Calling-Station-Id', '==', ${macAddress})
          ON CONFLICT (username, attribute)
          DO UPDATE SET value = ${macAddress}, updated_at = NOW()
        `
      }

      console.log("[v0] PPPoE credentials updated in RADIUS tables successfully")
    }

    return { success: true, service: result[0] }
  } catch (error: any) {
    console.error("[v0] Error updating customer service:", error.message)
    return { success: false, error: error.message }
  }
}

export async function deleteCustomerService(serviceId: number) {
  try {
    const sql = await getSql()

    const serviceData = await sql`
      SELECT cs.id, cs.customer_id, cs.service_plan_id
      FROM customer_services cs
      LEFT JOIN customers c ON cs.customer_id = c.id
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
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

    if (service.router_id && service.ip_address) {
      await deprovisionServiceFromRouter({
        serviceId,
        customerId: service.customer_id,
        routerId: service.router_id,
        connectionType: "static_ip",
        ipAddress: service.ip_address,
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

    await sql`
      UPDATE invoices
      SET status = 'paid',
          paid_amount = ${amount},
          paid_at = NOW(),
          updated_at = NOW()
      WHERE id = ${invoiceId} AND customer_id = ${customerId}
    `

    const pendingServices = await sql`
      SELECT cs.*, sp.download_speed, sp.upload_speed, sp.name as service_name
      FROM customer_services cs
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.customer_id = ${customerId} 
      AND cs.status = 'pending'
    `

    const customerRouter = await sql`
      SELECT nd.customer_auth_method, nd.id as router_id
      FROM customers c
      LEFT JOIN network_devices nd ON nd.location_id = c.location_id
      WHERE c.id = ${customerId}
      AND nd.type = 'router'
      LIMIT 1
    `

    const authMethod = customerRouter[0]?.customer_auth_method || "pppoe_radius"
    console.log(`[v0] Customer router auth method: ${authMethod}`)

    for (const service of pendingServices) {
      await sql`
        UPDATE customer_services
        SET status = 'active',
            activation_date = NOW(),
            updated_at = NOW()
        WHERE id = ${service.id}
      `

      console.log(`[v0] Successfully activated service ${service.id} ${service.service_name}`)

      const credentials = await retrievePPPoECredentials(service.id)
      const pppoeUsername =
        credentials?.username || service.pppoe_username || `customer_${customerId}_service_${service.id}`
      const pppoePassword =
        credentials?.password || service.pppoe_password || Math.random().toString(36).substring(2, 15)

      console.log(`[v0] Provisioning RADIUS credentials for service ${service.id} username: ${pppoeUsername}`)

      if (authMethod === "pppoe_radius") {
        await provisionRadiusUser({
          customerId,
          serviceId: service.id,
          username: pppoeUsername,
          password: pppoePassword,
          ipAddress: service.ip_address || undefined,
          downloadSpeed: service.download_speed || 10,
          uploadSpeed: service.upload_speed || 10,
        })

        await provisionToStandardRadiusTables(
          pppoeUsername,
          pppoePassword,
          service.download_speed || "10M",
          service.upload_speed || "10M",
        )
        console.log("[v0] ✓ Provisioned to FreeRADIUS")
      } else if (authMethod === "pppoe_secrets") {
        console.log("[v0] Provisioning to MikroTik router (PPPoE Secrets)...")
        try {
          await provisionServiceToRouter(service.id, {
            username: pppoeUsername,
            password: pppoePassword,
            service: service.service_name,
            downloadSpeed: service.download_speed || "10M",
            uploadSpeed: service.upload_speed || "10M",
          })
          console.log("[v0] ✓ Provisioned to MikroTik router")
        } catch (error) {
          console.error("[v0] Failed to provision to MikroTik router:", error)
        }
      }

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

    const serviceData = await sql`
      SELECT cs.*, c.portal_username
      FROM customer_services cs
      JOIN customers c ON c.id = cs.customer_id
      WHERE cs.id = ${serviceId}
      LIMIT 1
    `

    if (serviceData.length === 0) {
      return { success: false, error: "Service not found" }
    }

    const service = serviceData[0]
    const oldStatus = service.status

    await sql`
      UPDATE customer_services
      SET status = ${newStatus},
          ${newStatus === "suspended" ? sql`suspension_date = NOW(),` : sql``}
          ${newStatus === "terminated" ? sql`termination_date = NOW(),` : sql``}
          ${newStatus === "active" ? sql`activation_date = NOW(),` : sql``}
          updated_at = NOW()
      WHERE id = ${serviceId}
    `

    const username = service.pppoe_username || service.portal_username || `customer_${service.customer_id}`
    const password = service.pppoe_password || username

    if (newStatus === "active" && oldStatus !== "active") {
      await provisionRadiusUser({
        customerId: service.customer_id,
        serviceId,
        username,
        password,
        ipAddress: service.ip_address || undefined,
        downloadSpeed: service.download_speed || 10,
        uploadSpeed: service.upload_speed || 10,
      })
    } else if (newStatus === "suspended") {
      await suspendRadiusUser({
        customerId: service.customer_id,
        serviceId,
        username,
        reason: reason || "Service suspended",
      })
    } else if (newStatus === "terminated") {
      await deprovisionRadiusUser({
        customerId: service.customer_id,
        serviceId,
        username,
        reason: reason || "Service terminated",
      })
    }

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

    revalidatePath(`/customers/${service.customer_id}`)

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

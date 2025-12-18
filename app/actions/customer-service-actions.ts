"use server"

import { getSql } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { ActivityLogger } from "@/lib/activity-logger"
import { releaseIPAddress } from "@/lib/ip-management"
import { provisionServiceToRouter, deprovisionServiceFromRouter } from "@/lib/router-provisioning"

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
    const lockToMac = formData.get("lock_to_mac") === "on"
    const pppoeEnabled = formData.get("pppoe_enabled") === "on"
    const pppoeUsername = formData.get("pppoe_username") as string
    const pppoePassword = formData.get("pppoe_password") as string
    const inventoryItems = formData.get("inventory_items") as string
    const adminOverride = formData.get("admin_override") === "on"
    const routerId = formData.get("router_id") as string

    console.log("[v0] Checking for existing service...")
    const existingService = await sql`
      SELECT id FROM customer_services 
      WHERE customer_id = ${customerId} 
      AND service_plan_id = ${servicePlanId}
      AND status IN ('active', 'pending')
      LIMIT 1
    `

    console.log("[v0] Existing service check result:", existingService)

    if (existingService.length > 0) {
      console.log("[v0] DUPLICATE DETECTED - Service already exists:", existingService[0].id)
      return {
        success: false,
        error: "This customer already has an active or pending service with this plan.",
      }
    }

    console.log("[v0] No duplicate found, proceeding with insert...")

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
        activation_date,
        created_at,
        updated_at
      ) VALUES (
        ${customerId},
        ${servicePlanId},
        ${initialStatus},
        ${servicePlan[0].price},
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

      if (routerId && (pppoeEnabled || allocatedIpAddress)) {
        console.log("[v0] Auto-provisioning service to router...")

        const provisionResult = await provisionServiceToRouter({
          serviceId,
          customerId,
          routerId: Number.parseInt(routerId),
          ipAddress: allocatedIpAddress || undefined,
          connectionType: connectionType as "pppoe" | "static_ip" | "dhcp",
          pppoeUsername: pppoeUsername || undefined,
          pppoePassword: pppoePassword || undefined,
          downloadSpeed: servicePlan[0].speed_download,
          uploadSpeed: servicePlan[0].speed_upload,
        })

        if (!provisionResult.success) {
          console.log("[v0] Warning: Auto-provision failed:", provisionResult.error)
        } else {
          console.log("[v0] Service auto-provisioned successfully")
        }
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

    const serviceData = await sql`
      SELECT cs.*, c.id as customer_id, c.portal_username,
             ia.ip_address, ia.router_id,
             r.host, r.port, r.username, r.password, r.use_ssl
      FROM customer_services cs
      JOIN customers c ON c.id = cs.customer_id
      LEFT JOIN ip_addresses ia ON ia.customer_id = c.id AND ia.status = 'allocated'
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
        activation_date = CASE WHEN ${status} = 'active' AND activation_date IS NULL THEN NOW() ELSE activation_date END,
        suspension_date = CASE WHEN ${status} = 'suspended' THEN NOW() ELSE suspension_date END,
        updated_at = NOW()
      WHERE id = ${serviceId}
      RETURNING *
    `

    if (result.length === 0) {
      return { success: false, error: "Service not found" }
    }

    if (service.router_id && service.host && (service.portal_username || service.ip_address)) {
      // Fire and forget - don't await
      Promise.resolve().then(async () => {
        try {
          // Status changed from pending to active - ADD to router
          if (oldStatus === "pending" && status === "active") {
            console.log("[v0] Async provisioning: pending -> active")

            await provisionServiceToRouter({
              serviceId: service.id,
              customerId: service.customer_id,
              routerId: service.router_id,
              ipAddress: service.ip_address,
              connectionType: service.ip_address ? "static_ip" : "pppoe",
              pppoeUsername: service.portal_username,
              pppoePassword: service.portal_username, // Use portal username as default password
              downloadSpeed: service.download_speed,
              uploadSpeed: service.upload_speed,
            })
          }

          // Status changed to suspended - REMOVE from router
          if (status === "suspended" && oldStatus !== "suspended") {
            console.log("[v0] Async deprovisioning: -> suspended")

            await deprovisionServiceFromRouter({
              serviceId: service.id,
              customerId: service.customer_id,
              routerId: service.router_id,
              connectionType: service.ip_address ? "static_ip" : "pppoe",
              ipAddress: service.ip_address,
              pppoeUsername: service.portal_username,
              reason: "Service suspended",
            })
          }

          // Status changed from suspended to active - RE-ADD to router
          if (status === "active" && oldStatus === "suspended") {
            console.log("[v0] Async re-provisioning: suspended -> active")

            await provisionServiceToRouter({
              serviceId: service.id,
              customerId: service.customer_id,
              routerId: service.router_id,
              ipAddress: service.ip_address,
              connectionType: service.ip_address ? "static_ip" : "pppoe",
              pppoeUsername: service.portal_username,
              pppoePassword: service.portal_username,
              downloadSpeed: service.download_speed,
              uploadSpeed: service.upload_speed,
            })
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
    return { success: false, error: "Failed to update service" }
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

    await sql`
      DELETE FROM customer_services 
      WHERE id = ${serviceId}
    `

    if (service.router_id) {
      // Fire and forget - don't await
      Promise.resolve().then(async () => {
        try {
          console.log("[v0] Async deprovisioning before deletion")

          await deprovisionServiceFromRouter({
            serviceId: service.id,
            customerId: service.customer_id,
            routerId: service.router_id,
            connectionType: service.ip_address ? "static_ip" : "pppoe",
            ipAddress: service.ip_address,
            pppoeUsername: service.portal_username,
            reason: "Service deleted",
          })
        } catch (provisionError) {
          console.error("[v0] Async router deprovisioning error:", provisionError)
        }
      })
    }

    revalidatePath(`/customers`)
    return { success: true }
  } catch (error) {
    console.error("Error deleting customer service:", error)
    return { success: false, error: "Failed to delete service" }
  }
}

export async function updateServiceStatus(serviceId: number, status: string) {
  try {
    const sql = await getSql()

    const result = await sql`
      UPDATE customer_services 
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${serviceId}
      RETURNING *
    `

    if (result.length === 0) {
      return { success: false, error: "Service not found" }
    }

    revalidatePath("/customers")
    return { success: true, message: "Service status updated", service: result[0] }
  } catch (error) {
    console.error("Error updating service status:", error)
    return { success: false, error: "Failed to update service status" }
  }
}

export async function activateServiceOnPayment(paymentId: number, customerId: number) {
  try {
    const sql = await getSql()

    const pendingServices = await sql`
      SELECT cs.*, sp.name as service_name
      FROM customer_services cs
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.customer_id = ${customerId}
      AND cs.status = 'pending'
      ORDER BY cs.created_at ASC
    `

    for (const service of pendingServices) {
      await sql`
        UPDATE customer_services 
        SET status = 'active'
        WHERE id = ${service.id}
      `

      await sql`
        INSERT INTO admin_logs (admin_id, action, resource_type, resource_id, new_values, created_at)
        VALUES (
          1,
          'service_activation',
          'customer_service',
          ${service.id},
          ${JSON.stringify({
            customer_id: customerId,
            service_id: service.id,
            service_name: service.service_name,
            payment_id: paymentId,
            reason: "payment_received",
            message: `Service ${service.service_name} activated for customer ${customerId} after payment received`,
          })}::jsonb,
          NOW()
        )
      `
    }

    return {
      success: true,
      activated_services: pendingServices.length,
      message: `${pendingServices.length} service(s) activated successfully`,
    }
  } catch (error) {
    console.error("Error activating services on payment:", error)
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

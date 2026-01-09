"use server"

import { neon } from "@neondatabase/serverless"
import { revalidatePath } from "next/cache"
import { ActivityLogger } from "@/lib/activity-logger"
import { allocateIPAddress, releaseIPAddress } from "@/lib/ip-management"

function createDatabaseConnection() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL

  console.log("[v0] Environment check:", {
    DATABASE_URL: !!process.env.DATABASE_URL,
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    DATABASE_URL_UNPOOLED: !!process.env.DATABASE_URL_UNPOOLED,
    POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
    POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
  })

  if (!connectionString) {
    console.error("[v0] No database connection string found")
    throw new Error("Database connection not available. Please check environment variables.")
  }

  console.log("[v0] Using database connection string:", connectionString.substring(0, 20) + "...")
  return neon(connectionString)
}

export async function getCustomerServices(customerId: number) {
  try {
    const sql = createDatabaseConnection()

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
    const sql = createDatabaseConnection()

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
    const sql = createDatabaseConnection()

    const servicePlanIdStr = formData.get("service_plan_id") as string
    const servicePlanId = Number.parseInt(servicePlanIdStr)

    console.log("[v0] Service plan ID from form:", servicePlanIdStr, "parsed:", servicePlanId)

    if (!servicePlanIdStr || isNaN(servicePlanId)) {
      console.error("[v0] Invalid service plan ID:", servicePlanIdStr)
      return {
        success: false,
        error: "Invalid service plan selected. Please select a valid service plan.",
      }
    }

    const connectionType = formData.get("connection_type") as string

    if (!connectionType) {
      console.error("[v0] Missing connection type")
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

    console.log("[v0] Adding service with data:", {
      customerId,
      servicePlanId,
      connectionType,
      ipAddress,
      subnetId,
      locationId,
      pppoeEnabled,
      inventoryItems,
      adminOverride,
    })

    if (ipAddress && ipAddress !== "auto") {
      const existingIP = await sql`
        SELECT id, customer_id 
        FROM ip_addresses 
        WHERE ip_address = ${ipAddress}::inet 
        AND status = 'assigned'
      `

      if (existingIP.length > 0) {
        console.error("[v0] IP address already assigned:", ipAddress)
        return {
          success: false,
          error: `IP address ${ipAddress} is already assigned to customer ${existingIP[0].customer_id}`,
        }
      }
    }

    console.log("[v0] Fetching service plan with ID:", servicePlanId)
    const servicePlan = await sql`
      SELECT * FROM service_plans WHERE id = ${servicePlanId}
    `

    console.log("[v0] Service plan query result:", servicePlan.length > 0 ? servicePlan[0] : "Not found")

    if (servicePlan.length === 0) {
      console.error("[v0] Service plan not found for ID:", servicePlanId)
      return {
        success: false,
        error: `Service plan not found (ID: ${servicePlanId}). Please select a valid service plan.`,
      }
    }

    const initialStatus = adminOverride ? "active" : "pending"

    console.log("[v0] Inserting customer service with:", {
      customerId,
      servicePlanId,
      initialStatus,
      monthlyFee: servicePlan[0].price,
      connectionType,
    })

    const result = await sql`
      INSERT INTO customer_services (
        customer_id, 
        service_plan_id, 
        status, 
        monthly_fee, 
        start_date,
        connection_type,
        created_at
      ) VALUES (
        ${customerId},
        ${servicePlanId},
        ${initialStatus},
        ${servicePlan[0].price},
        NOW(),
        ${connectionType},
        NOW()
      ) RETURNING *
    `

    console.log("[v0] Service inserted successfully:", result[0])

    const serviceId = result[0].id
    let allocatedIpAddress = null

    if (ipAddress === "auto" || !ipAddress) {
      console.log("[v0] Starting automatic IP allocation...")

      const allocationResult = await allocateIPAddress(
        customerId,
        serviceId,
        undefined, // Let the system select the router
        locationId ? Number.parseInt(locationId) : undefined,
        connectionType,
      )

      if (allocationResult.success) {
        allocatedIpAddress = allocationResult.ipAddress
        console.log("[v0] Automatically allocated IP:", allocatedIpAddress)
      } else {
        console.error("[v0] Automatic IP allocation failed:", allocationResult.error)
        // Don't fail service creation if IP allocation fails
      }
    } else if (ipAddress && subnetId) {
      // Manual IP assignment
      try {
        const assignResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/network/ip-addresses/assign`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              service_id: serviceId,
              ip_address: ipAddress,
              subnet_id: Number.parseInt(subnetId),
            }),
          },
        )

        if (assignResponse.ok) {
          const assignData = await assignResponse.json()
          allocatedIpAddress = assignData.address.ip_address
          console.log("[v0] Manually assigned IP address:", allocatedIpAddress)
        } else {
          console.error("[v0] Failed to assign manual IP address")
        }
      } catch (error) {
        console.error("[v0] Error assigning manual IP:", error)
      }
    }

    if (allocatedIpAddress) {
      await sql`
        UPDATE customer_services
        SET ip_address = ${allocatedIpAddress}::text
        WHERE id = ${serviceId}
      `
    }

    const invoiceNumber = `INV-${customerId}-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${serviceId}`
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    console.log("[v0] Creating invoice with:", {
      customerId,
      amount: servicePlan[0].price,
      invoiceNumber,
      dueDate: dueDate.toISOString().split("T")[0],
    })

    const invoiceResult = await sql`
      INSERT INTO invoices (
        customer_id,
        amount,
        due_date,
        status,
        invoice_number,
        created_at
      ) VALUES (
        ${customerId},
        ${servicePlan[0].price},
        ${dueDate.toISOString().split("T")[0]},
        'pending',
        ${invoiceNumber},
        NOW()
      ) RETURNING *
    `

    console.log("[v0] Invoice created successfully:", invoiceResult[0])

    if (adminOverride) {
      await sql`
        UPDATE invoices 
        SET status = 'paid', paid_amount = ${servicePlan[0].price}
        WHERE id = ${invoiceResult[0].id}
      `

      await sql`
        INSERT INTO system_logs (category, message, details, created_at)
        VALUES (
          'admin_override',
          'Service manually activated without payment by admin for customer ' || ${customerId},
          '{"customer_id": ' || ${customerId} || ', "service_id": ' || ${serviceId} || ', "invoice_id": ' || ${invoiceResult[0].id} || ', "reason": "admin_override"}',
          NOW()
        )
      `

      // The scheduled tasks functionality can be added later when the table is created

      console.log("[v0] Scheduled tasks table may not exist, skipping")
    }

    if (inventoryItems) {
      try {
        const itemIds = JSON.parse(inventoryItems)
        for (const itemId of itemIds) {
          await sql`
            INSERT INTO service_inventory (service_id, inventory_id, assigned_at, status)
            VALUES (${serviceId}, ${Number.parseInt(itemId)}, NOW(), 'assigned')
          `

          await sql`
            UPDATE inventory SET stock_quantity = stock_quantity - 1
            WHERE id = ${Number.parseInt(itemId)} AND stock_quantity > 0
          `
        }
        console.log("[v0] Inventory items assigned successfully")
      } catch (inventoryError) {
        console.log(
          "[v0] Service inventory table may not exist, skipping:",
          inventoryError instanceof Error ? inventoryError.message : "Unknown error",
        )
      }
    }

    console.log("[v0] Service created successfully with automatic invoice generation:", {
      serviceId,
      ipAddress: allocatedIpAddress,
      invoiceId: invoiceResult[0].id,
      adminOverride,
      status: initialStatus,
    })

    revalidatePath(`/customers/${customerId}`)
    return {
      success: true,
      service: result[0],
      invoice: invoiceResult[0],
      ip_address: allocatedIpAddress,
      message: adminOverride
        ? "Service activated immediately with admin override. IP address assigned automatically."
        : "Service created with pending payment status. IP address will be assigned upon activation.",
    }
  } catch (error) {
    console.error("[v0] Error adding customer service:", error)
    console.error("[v0] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    })

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to add service. Please check the server logs for details.",
    }
  }
}

export async function updateCustomerService(serviceId: number, formData: FormData) {
  try {
    const sql = createDatabaseConnection()

    const monthlyFee = Number.parseFloat(formData.get("monthly_fee") as string)
    const startDateInput = formData.get("start_date") as string
    const startDate =
      startDateInput && startDateInput.trim() !== "" ? startDateInput : new Date().toISOString().split("T")[0]
    const endDate = (formData.get("end_date") as string) || null
    const ipAddress = (formData.get("ip_address") as string) || null
    const deviceId = (formData.get("device_id") as string) || null
    const connectionType = (formData.get("connection_type") as string) || null
    const status = formData.get("status") as string

    const result = await sql`
      UPDATE customer_services 
      SET 
        monthly_fee = ${monthlyFee},
        start_date = ${startDate},
        end_date = ${endDate},
        ip_address = ${ipAddress},
        device_id = ${deviceId},
        connection_type = ${connectionType},
        status = ${status}
      WHERE id = ${serviceId}
      RETURNING *
    `

    if (result.length === 0) {
      return { success: false, error: "Service not found" }
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
    console.log("[v0] ========== STARTING SERVICE DELETION ==========")
    console.log("[v0] Service ID to delete:", serviceId)

    const sql = createDatabaseConnection()

    console.log("[v0] Fetching service details...")
    const [service] = await sql`
      SELECT cs.*, sp.name as service_name, sp.price as service_price, cs.customer_id, cs.monthly_fee
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE cs.id = ${serviceId}
    `

    if (!service) {
      console.error("[v0] Service not found:", serviceId)
      return { success: false, error: "Service not found" }
    }

    const customerId = service.customer_id
    console.log("[v0] Service found:", {
      serviceId,
      customerId,
      serviceName: service.service_name,
      monthlyFee: service.monthly_fee,
    })

    console.log("[v0] Searching for unpaid invoices for customer:", customerId)
    const unpaidInvoices = await sql`
      SELECT *
      FROM invoices
      WHERE customer_id = ${customerId}
      AND status IN ('pending', 'partial', 'overdue')
      ORDER BY created_at DESC
      LIMIT 5
    `

    console.log("[v0] Found unpaid invoices:", unpaidInvoices.length)
    if (unpaidInvoices.length > 0) {
      console.log(
        "[v0] Unpaid invoice details:",
        unpaidInvoices.map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          amount: inv.amount,
          paid_amount: inv.paid_amount,
          status: inv.status,
        })),
      )
    }

    for (const invoice of unpaidInvoices) {
      const remainingAmount = invoice.amount - (invoice.paid_amount || 0)

      console.log("[v0] Processing invoice:", {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        totalAmount: invoice.amount,
        paidAmount: invoice.paid_amount || 0,
        remainingAmount,
      })

      if (remainingAmount <= 0) {
        console.log("[v0] Skipping invoice (already fully paid):", invoice.invoice_number)
        continue
      }

      const creditNoteNumber = `CN-${customerId}-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${serviceId}-${invoice.id}`

      console.log("[v0] Creating credit note:", {
        creditNoteNumber,
        amount: remainingAmount,
        reason: "Service Deleted",
      })

      const creditNoteResult = await sql`
        INSERT INTO credit_notes (
          customer_id,
          invoice_id,
          amount,
          reason,
          notes,
          credit_note_number,
          status,
          created_by,
          approved_by,
          approved_at,
          created_at
        ) VALUES (
          ${customerId},
          ${invoice.id},
          ${remainingAmount},
          'Service Deleted',
          ${"Credit note issued for deleted service: " + (service.service_name || "Unknown Service") + ". Invoice " + invoice.invoice_number + " cleared."},
          ${creditNoteNumber},
          'approved',
          1,
          1,
          NOW(),
          NOW()
        ) RETURNING *
      `

      console.log("[v0] Credit note created successfully:", {
        id: creditNoteResult[0].id,
        creditNoteNumber,
        amount: remainingAmount,
      })

      console.log("[v0] Marking invoice as paid:", invoice.invoice_number)
      await sql`
        UPDATE invoices
        SET status = 'paid', paid_amount = amount
        WHERE id = ${invoice.id}
      `

      console.log("[v0] Logging credit note creation to admin_logs")
      await sql`
        INSERT INTO admin_logs (
          admin_id,
          action,
          resource_type,
          resource_id,
          new_values,
          created_at
        ) VALUES (
          1,
          'credit_note_created',
          'credit_note',
          ${creditNoteResult[0].id},
          ${JSON.stringify({
            customer_id: customerId,
            service_id: serviceId,
            invoice_id: invoice.id,
            credit_note_number: creditNoteNumber,
            amount: remainingAmount,
            reason: "Service Deleted",
            service_name: service.service_name,
            invoice_number: invoice.invoice_number,
          })}::jsonb,
          NOW()
        )
      `

      console.log("[v0] Admin log entry created for credit note")
    }

    console.log("[v0] Deleting service from database...")
    const result = await sql`
      DELETE FROM customer_services 
      WHERE id = ${serviceId}
      RETURNING *
    `

    if (result.length === 0) {
      console.error("[v0] Service deletion failed - service not found")
      return { success: false, error: "Service not found" }
    }

    console.log("[v0] Service deleted successfully from database")

    console.log("[v0] Creating final admin log entry for service deletion")
    await sql`
      INSERT INTO admin_logs (
        admin_id,
        action,
        resource_type,
        resource_id,
        old_values,
        created_at
      ) VALUES (
        1,
        'service_deleted',
        'customer_service',
        ${serviceId},
        ${JSON.stringify({
          customer_id: customerId,
          service_id: serviceId,
          service_name: service.service_name,
          monthly_fee: service.monthly_fee,
          credit_notes_issued: unpaidInvoices.length,
        })}::jsonb,
        NOW()
      )
    `

    console.log("[v0] ========== SERVICE DELETION COMPLETED ==========")
    console.log("[v0] Summary:", {
      serviceId,
      customerId,
      creditNotesIssued: unpaidInvoices.length,
      success: true,
    })

    revalidatePath("/customers")
    return {
      success: true,
      message: `Service deleted successfully. ${unpaidInvoices.length} credit note(s) issued for unpaid invoices.`,
      creditNotesIssued: unpaidInvoices.length,
    }
  } catch (error) {
    console.error("[v0] ========== SERVICE DELETION FAILED ==========")
    console.error("[v0] Error deleting customer service:", error)
    console.error("[v0] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
    })
    return { success: false, error: "Failed to delete service" }
  }
}

export async function updateServiceStatus(serviceId: number, status: string) {
  try {
    const sql = createDatabaseConnection()

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
    const sql = createDatabaseConnection()

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
    const sql = createDatabaseConnection()

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
    const sql = createDatabaseConnection()

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
    const sql = createDatabaseConnection()

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
    const sql = createDatabaseConnection()

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

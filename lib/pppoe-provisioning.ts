import { getSql } from "@/lib/db"
import { MikroTikAPI } from "./mikrotik-api"

export interface PPPoEProvisioningResult {
  success: boolean
  username?: string
  activatedDays?: number
  expiryDate?: string
  error?: string
  message?: string
}

/**
 * Calculate activation days based on payment amount vs invoice total
 */
function calculateActivationDays(amountPaid: number, totalInvoiceAmount: number, servicePeriodDays = 30): number {
  if (amountPaid >= totalInvoiceAmount) {
    return servicePeriodDays
  }

  const paymentRatio = amountPaid / totalInvoiceAmount
  const activatedDays = Math.floor(paymentRatio * servicePeriodDays)

  return Math.max(1, activatedDays)
}

/**
 * Calculate expiry date based on activated days
 */
function calculateExpiryDate(days: number): string {
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + days)
  return expiryDate.toISOString().split("T")[0] // YYYY-MM-DD format
}

/**
 * Provision PPPoE secret to MikroTik router for a customer service
 */
export async function provisionPPPoESecret(
  customerId: number,
  serviceId: number,
  paymentAmount: number,
  invoiceTotal: number,
): Promise<PPPoEProvisioningResult> {
  try {
    console.log("[v0] Starting PPPoE provisioning for customer", customerId, "service", serviceId)

    const sql = await getSql()

    const serviceResult = await sql`
      SELECT 
        cs.*,
        sp.name as service_name,
        sp.price as service_monthly_fee,
        sp.billing_cycle,
        nd.id as router_id,
        nd.name as router_name,
        nd.ip_address as router_ip,
        nd.username as router_username,
        nd.password as router_password,
        nd.api_port as router_api_port,
        nd.customer_auth_method,
        c.email,
        c.first_name,
        c.last_name
      FROM customer_services cs
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      LEFT JOIN network_devices nd ON cs.router_id = nd.id
      JOIN customers c ON cs.customer_id = c.id
      WHERE cs.id = ${serviceId}
      AND cs.customer_id = ${customerId}
    `

    if (serviceResult.length === 0) {
      throw new Error("Customer service not found")
    }

    const service = serviceResult[0]

    if (service.customer_auth_method !== "pppoe_secrets" && service.customer_auth_method !== "PPPoE Secrets") {
      console.log("[v0] Router authorization method is", service.customer_auth_method, "- skipping PPPoE provisioning")
      return {
        success: true,
        message: `Router uses ${service.customer_auth_method} - PPPoE provisioning not required`,
      }
    }

    if (!service.router_id || !service.router_ip) {
      throw new Error("No router assigned to this service")
    }

    if (!service.router_username || !service.router_password) {
      throw new Error("Router credentials not configured")
    }

    const servicePeriodDays =
      service.billing_cycle === "monthly"
        ? 30
        : service.billing_cycle === "quarterly"
          ? 90
          : service.billing_cycle === "yearly"
            ? 365
            : 30

    const activatedDays = calculateActivationDays(paymentAmount, invoiceTotal, servicePeriodDays)
    const expiryDate = calculateExpiryDate(activatedDays)

    console.log("[v0] Payment:", paymentAmount, "/ Invoice:", invoiceTotal)
    console.log("[v0] Activating service for", activatedDays, "days until", expiryDate)

    let pppoeUsername = service.pppoe_username
    let pppoePassword = service.pppoe_password

    if (!pppoeUsername) {
      const baseUsername = service.email?.split("@")[0] || `customer${customerId}`
      pppoeUsername = `${baseUsername}_${serviceId}`.toLowerCase().replace(/[^a-z0-9_]/g, "")
    }

    if (!pppoePassword) {
      pppoePassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10)
    }

    await sql`
      UPDATE customer_services 
      SET 
        pppoe_username = ${pppoeUsername},
        pppoe_password = ${pppoePassword},
        activation_date = CASE WHEN activation_date IS NULL THEN NOW() ELSE activation_date END,
        updated_at = NOW()
      WHERE id = ${serviceId}
    `

    const mikrotik = new MikroTikAPI({
      host: service.router_ip,
      port: service.router_api_port || 8728,
      username: service.router_username,
      password: service.router_password,
    })

    await mikrotik.connect()

    const pppoeResult = await mikrotik.createPPPoESecret(
      pppoeUsername,
      pppoePassword,
      service.ip_address || "auto",
      "default", // profile - can be customized based on speed
      undefined, // local-address - router will use default
    )

    await mikrotik.disconnect()

    if (!pppoeResult.success) {
      throw new Error(`Failed to create PPPoE secret on router: ${pppoeResult.error}`)
    }

    await sql`
      INSERT INTO system_logs (
        level, source, category, message, details, customer_id, created_at, updated_at
      ) VALUES (
        'INFO',
        'pppoe_provisioning',
        'service_activation',
        ${`PPPoE secret provisioned for ${activatedDays} days (payment-based)`},
        ${JSON.stringify({
          service_id: serviceId,
          router_id: service.router_id,
          router_name: service.router_name,
          username: pppoeUsername,
          activated_days: activatedDays,
          expiry_date: expiryDate,
          payment_amount: paymentAmount,
          invoice_total: invoiceTotal,
          full_payment: paymentAmount >= invoiceTotal,
        })}::jsonb,
        ${customerId},
        NOW(),
        NOW()
      )
    `

    console.log("[v0] PPPoE secret successfully provisioned:", pppoeUsername, "for", activatedDays, "days")

    return {
      success: true,
      username: pppoeUsername,
      activatedDays,
      expiryDate,
      message: `PPPoE credentials created. Service active for ${activatedDays} days until ${expiryDate}`,
    }
  } catch (error) {
    console.error("[v0] PPPoE provisioning error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during PPPoE provisioning",
    }
  }
}

/**
 * Update PPPoE secret expiry when additional payment is made
 */
export async function extendPPPoEService(
  customerId: number,
  serviceId: number,
  additionalPayment: number,
  remainingInvoiceAmount: number,
): Promise<PPPoEProvisioningResult> {
  try {
    console.log("[v0] Extending PPPoE service for customer", customerId, "service", serviceId)

    const sql = await getSql()

    const serviceResult = await sql`
      SELECT 
        cs.*,
        sp.billing_cycle,
        nd.customer_auth_method
      FROM customer_services cs
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      LEFT JOIN network_devices nd ON cs.router_id = nd.id
      WHERE cs.id = ${serviceId}
    `

    if (serviceResult.length === 0) {
      throw new Error("Service not found")
    }

    const service = serviceResult[0]

    if (service.customer_auth_method !== "pppoe_secrets" && service.customer_auth_method !== "PPPoE Secrets") {
      return {
        success: true,
        message: "Service does not use PPPoE Secrets - no extension needed",
      }
    }

    const servicePeriodDays =
      service.billing_cycle === "monthly"
        ? 30
        : service.billing_cycle === "quarterly"
          ? 90
          : service.billing_cycle === "yearly"
            ? 365
            : 30

    const additionalDays = calculateActivationDays(additionalPayment, remainingInvoiceAmount, servicePeriodDays)
    const newExpiryDate = calculateExpiryDate(additionalDays)

    console.log("[v0] Extending service by", additionalDays, "days until", newExpiryDate)

    await sql`
      INSERT INTO system_logs (
        level, source, category, message, details, customer_id, created_at, updated_at
      ) VALUES (
        'INFO',
        'pppoe_provisioning',
        'service_extension',
        ${`PPPoE service extended by ${additionalDays} days`},
        ${JSON.stringify({
          service_id: serviceId,
          additional_payment: additionalPayment,
          remaining_amount: remainingInvoiceAmount,
          additional_days: additionalDays,
          new_expiry: newExpiryDate,
        })}::jsonb,
        ${customerId},
        NOW(),
        NOW()
      )
    `

    return {
      success: true,
      activatedDays: additionalDays,
      expiryDate: newExpiryDate,
      message: `Service extended by ${additionalDays} days until ${newExpiryDate}`,
    }
  } catch (error) {
    console.error("[v0] Service extension error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during service extension",
    }
  }
}

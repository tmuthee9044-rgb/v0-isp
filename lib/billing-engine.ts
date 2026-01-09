import { getSql } from "@/lib/db"

export interface BillingCalculation {
  dailyRate: number
  paidDays: number
  serviceStart: Date
  serviceEnd: Date
}

/**
 * Core billing calculation - immutable formula
 * paid_days = floor(payment.amount / daily_rate)
 */
export async function calculatePaidDays(planId: number, paymentAmount: number): Promise<BillingCalculation> {
  const sql = await getSql()

  const [plan] = await sql`
    SELECT price, billing_cycle_days
    FROM service_plans
    WHERE id = ${planId}
  `

  if (!plan) {
    throw new Error("Service plan not found")
  }

  const dailyRate = plan.price / plan.billing_cycle_days
  const paidDays = Math.floor(paymentAmount / dailyRate)

  if (paidDays <= 0) {
    throw new Error(`Payment amount ${paymentAmount} is insufficient. Minimum: ${dailyRate}`)
  }

  return {
    dailyRate,
    paidDays,
    serviceStart: new Date(),
    serviceEnd: new Date(Date.now() + paidDays * 24 * 60 * 60 * 1000),
  }
}

/**
 * Activate or extend a service based on payment
 * Formula: Extend from max(now, service_end)
 */
export async function activateService(serviceId: number, paymentId: number): Promise<void> {
  const sql = await getSql()

  // Get service and payment details
  const [service] = await sql`
    SELECT cs.*, sp.price, sp.billing_cycle_days, p.amount
    FROM customer_services cs
    JOIN service_plans sp ON cs.service_plan_id = sp.id
    JOIN payments p ON p.id = ${paymentId}
    WHERE cs.id = ${serviceId}
  `

  if (!service) {
    throw new Error("Service not found")
  }

  // Calculate paid days
  const dailyRate = service.price / service.billing_cycle_days
  const paidDays = Math.floor(service.amount / dailyRate)

  if (paidDays <= 0) {
    throw new Error("Insufficient payment amount")
  }

  // Determine start date: max(now, current service_end)
  const now = new Date()
  const currentEnd = service.service_end ? new Date(service.service_end) : now
  const startDate = currentEnd > now ? currentEnd : now

  // Calculate new end date
  const endDate = new Date(startDate.getTime() + paidDays * 24 * 60 * 60 * 1000)

  // Update service
  await sql`
    UPDATE customer_services
    SET
      service_start = ${startDate},
      service_end = ${endDate},
      is_active = true,
      is_suspended = false,
      is_deleted = false,
      last_billed_at = CURRENT_TIMESTAMP
    WHERE id = ${serviceId}
  `

  // Log event
  await sql`
    INSERT INTO service_events (service_id, event_type, description, metadata)
    VALUES (
      ${serviceId},
      ${service.is_active ? "extended" : "activated"},
      ${`Service ${service.is_active ? "extended" : "activated"} for ${paidDays} days until ${endDate.toISOString()}`},
      ${JSON.stringify({ payment_id: paymentId, paid_days: paidDays, daily_rate: dailyRate })}
    )
  `

  // Schedule expiry notifications
  await scheduleExpiryNotifications(serviceId, endDate)
}

/**
 * Schedule notifications before service expiry
 */
async function scheduleExpiryNotifications(serviceId: number, expiryDate: Date): Promise<void> {
  const sql = await getSql()

  const notifications = [
    {
      type: "expiry_warning_5days",
      days: 5,
      message: "Your service will expire in 5 days. Please renew to avoid interruption.",
    },
    {
      type: "expiry_warning_2days",
      days: 2,
      message: "Your service will expire in 2 days. Please renew immediately.",
    },
  ]

  for (const notif of notifications) {
    const scheduledFor = new Date(expiryDate.getTime() - notif.days * 24 * 60 * 60 * 1000)

    if (scheduledFor > new Date()) {
      await sql`
        INSERT INTO service_notifications (service_id, notification_type, scheduled_for, message)
        VALUES (${serviceId}, ${notif.type}, ${scheduledFor}, ${notif.message})
        ON CONFLICT DO NOTHING
      `
    }
  }
}

/**
 * Suspend expired services - runs every 5 minutes
 */
export async function suspendExpiredServices(): Promise<{ suspended: number }> {
  const sql = await getSql()

  const result = await sql`
    UPDATE customer_services
    SET is_suspended = true
    WHERE service_end < NOW()
    AND is_active = true
    AND is_suspended = false
    AND is_deleted = false
    RETURNING id
  `

  // Log suspension events
  for (const service of result) {
    await sql`
      INSERT INTO service_events (service_id, event_type, description)
      VALUES (${service.id}, 'suspended', 'Service automatically suspended due to expiry')
    `
  }

  return { suspended: result.length }
}

/**
 * Soft delete a service
 */
export async function deleteService(serviceId: number): Promise<void> {
  const sql = await getSql()

  await sql`
    UPDATE customer_services
    SET is_deleted = true,
        is_active = false,
        is_suspended = true
    WHERE id = ${serviceId}
  `

  await sql`
    INSERT INTO service_events (service_id, event_type, description)
    VALUES (${serviceId}, 'deleted', 'Service marked as deleted')
  `
}

/**
 * Get service status for RADIUS authentication
 */
export async function checkServiceAccess(username: string): Promise<boolean> {
  const sql = await getSql()

  const [result] = await sql`
    SELECT 1
    FROM customer_services
    WHERE pppoe_username = ${username}
    AND is_active = true
    AND is_suspended = false
    AND is_deleted = false
    AND NOW() BETWEEN service_start AND service_end
  `

  return !!result
}

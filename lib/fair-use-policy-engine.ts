import { getSql } from "@/lib/db"

export interface FairUseStatus {
  limitReached: boolean
  throttled: boolean
  usedGB: number
  limitGB: number
  remainingGB: number
  percentUsed: number
  throttledSpeed?: {
    downloadMbps: number
    uploadMbps: number
  }
  burstAvailable: boolean
  overageGB?: number
  overageCharges?: number
}

export class FairUsePolicyEngine {
  /**
   * Check fair-use status for a customer service
   */
  static async checkFairUseStatus(
    customerId: number,
    serviceId: number
  ): Promise<FairUseStatus> {
    const sql = await getSql()
    const currentMonth = new Date().toISOString().substring(0, 7) // YYYY-MM

    // Get service plan and policy
    const service = await sql`
      SELECT 
        cs.*,
        sp.fair_use_policy_id,
        fup.monthly_limit_gb,
        fup.soft_cap_gb,
        fup.post_limit_action,
        fup.throttled_download_mbps,
        fup.throttled_upload_mbps,
        fup.burst_enabled,
        fup.burst_cooldown_minutes
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      LEFT JOIN fair_use_policies fup ON sp.fair_use_policy_id = fup.id
      WHERE cs.id = ${serviceId} AND cs.customer_id = ${customerId}
    `

    if (service.length === 0) {
      throw new Error("Service not found")
    }

    const svc = service[0]
    const limitGB = svc.monthly_limit_gb || 999999

    // Get or create tracking record
    let tracking = await sql`
      SELECT * FROM customer_fair_use_tracking
      WHERE customer_id = ${customerId} 
        AND service_id = ${serviceId}
        AND month = ${currentMonth}
    `

    if (tracking.length === 0) {
      tracking = await sql`
        INSERT INTO customer_fair_use_tracking (
          customer_id, service_id, policy_id, month
        ) VALUES (
          ${customerId}, ${serviceId}, ${svc.fair_use_policy_id || null}, ${currentMonth}
        )
        RETURNING *
      `
    }

    const track = tracking[0]
    const usedGB = (track.billable_mb || 0) / 1024
    const remainingGB = Math.max(0, limitGB - usedGB)
    const percentUsed = (usedGB / limitGB) * 100

    // Check if burst is available
    const burstAvailable = this.canActivateBurst(
      track,
      svc.burst_enabled,
      svc.burst_cooldown_minutes
    )

    return {
      limitReached: track.limit_reached || false,
      throttled: track.throttled || false,
      usedGB,
      limitGB,
      remainingGB,
      percentUsed: Math.min(100, percentUsed),
      throttledSpeed: track.throttled
        ? {
            downloadMbps: svc.throttled_download_mbps || 5,
            uploadMbps: svc.throttled_upload_mbps || 2,
          }
        : undefined,
      burstAvailable,
      overageGB: track.overage_gb || 0,
      overageCharges: track.overage_charges || 0,
    }
  }

  /**
   * Update usage and check if throttling should be applied
   */
  static async updateUsage(
    customerId: number,
    serviceId: number,
    uploadMB: number,
    downloadMB: number,
    isFreeHours: boolean = false
  ): Promise<void> {
    const sql = await getSql()
    const currentMonth = new Date().toISOString().substring(0, 7)
    const totalMB = uploadMB + downloadMB

    // Get service policy
    const service = await sql`
      SELECT 
        sp.fair_use_policy_id,
        fup.monthly_limit_gb,
        fup.soft_cap_gb,
        fup.post_limit_action,
        fup.throttled_download_mbps,
        fup.throttled_upload_mbps
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      LEFT JOIN fair_use_policies fup ON sp.fair_use_policy_id = fup.id
      WHERE cs.id = ${serviceId}
    `

    if (service.length === 0) return

    const policy = service[0]
    const limitGB = policy.monthly_limit_gb || 999999
    const softCapGB = policy.soft_cap_gb || limitGB * 0.8

    // Update tracking
    await sql`
      INSERT INTO customer_fair_use_tracking (
        customer_id, service_id, policy_id, month, total_mb, 
        free_hours_mb, billable_mb
      ) VALUES (
        ${customerId}, ${serviceId}, ${policy.fair_use_policy_id}, ${currentMonth},
        ${totalMB}, 
        ${isFreeHours ? totalMB : 0},
        ${isFreeHours ? 0 : totalMB}
      )
      ON CONFLICT (customer_id, service_id, month)
      DO UPDATE SET
        total_mb = customer_fair_use_tracking.total_mb + ${totalMB},
        free_hours_mb = customer_fair_use_tracking.free_hours_mb + ${isFreeHours ? totalMB : 0},
        billable_mb = customer_fair_use_tracking.billable_mb + ${isFreeHours ? 0 : totalMB},
        updated_at = CURRENT_TIMESTAMP
    `

    // Check limits
    const tracking = await sql`
      SELECT * FROM customer_fair_use_tracking
      WHERE customer_id = ${customerId} 
        AND service_id = ${serviceId}
        AND month = ${currentMonth}
    `

    const track = tracking[0]
    const usedGB = track.billable_mb / 1024

    // Apply throttling if limit reached
    if (!track.limit_reached && usedGB >= limitGB) {
      await this.applyThrottle(customerId, serviceId, policy)
    } else if (!track.limit_reached && usedGB >= softCapGB) {
      // Log soft cap warning
      await sql`
        INSERT INTO fair_use_events (tracking_id, event_type, event_data)
        VALUES (
          ${track.id}, 'soft_cap_reached', 
          ${{ usedGB, softCapGB, limitGB }}::jsonb
        )
      `
    }
  }

  /**
   * Apply throttling to a service
   */
  static async applyThrottle(
    customerId: number,
    serviceId: number,
    policy: any
  ): Promise<void> {
    const sql = await getSql()
    const currentMonth = new Date().toISOString().substring(0, 7)

    await sql`
      UPDATE customer_fair_use_tracking
      SET 
        limit_reached = true,
        limit_reached_at = CURRENT_TIMESTAMP,
        throttled = ${policy.post_limit_action === "throttle"},
        throttle_applied_at = CURRENT_TIMESTAMP
      WHERE customer_id = ${customerId}
        AND service_id = ${serviceId}
        AND month = ${currentMonth}
    `

    // Log event
    const tracking = await sql`
      SELECT id FROM customer_fair_use_tracking
      WHERE customer_id = ${customerId} 
        AND service_id = ${serviceId}
        AND month = ${currentMonth}
    `

    await sql`
      INSERT INTO fair_use_events (tracking_id, event_type, event_data)
      VALUES (
        ${tracking[0].id}, 'limit_reached', 
        ${{ action: policy.post_limit_action }}::jsonb
      )
    `

    // TODO: Send notification to customer
    // TODO: Apply speed throttling via RADIUS CoA
  }

  /**
   * Check if burst mode can be activated
   */
  static canActivateBurst(
    tracking: any,
    burstEnabled: boolean,
    cooldownMinutes: number
  ): boolean {
    if (!burstEnabled) return false
    if (!tracking.last_burst_at) return true

    const cooldownMs = cooldownMinutes * 60 * 1000
    const timeSinceLastBurst = Date.now() - new Date(tracking.last_burst_at).getTime()

    return timeSinceLastBurst >= cooldownMs
  }

  /**
   * Activate burst mode (temporary speed boost)
   */
  static async activateBurst(customerId: number, serviceId: number): Promise<boolean> {
    const sql = await getSql()
    const currentMonth = new Date().toISOString().substring(0, 7)

    const status = await this.checkFairUseStatus(customerId, serviceId)
    if (!status.burstAvailable) {
      return false
    }

    await sql`
      UPDATE customer_fair_use_tracking
      SET 
        burst_used_count = burst_used_count + 1,
        last_burst_at = CURRENT_TIMESTAMP
      WHERE customer_id = ${customerId}
        AND service_id = ${serviceId}
        AND month = ${currentMonth}
    `

    // TODO: Apply burst speed via RADIUS CoA
    return true
  }
}

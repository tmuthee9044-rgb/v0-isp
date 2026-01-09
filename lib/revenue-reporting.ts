import { getSql } from "@/lib/db"

export interface RevenueMetrics {
  revenue: number
  arpu: number
  churnRate: number
  activeUsers: number
  ltv: number
}

/**
 * Revenue, ARPU & Churn Reporting
 * Per design: Pre-aggregated for zero DB strain
 */
export class RevenueReporting {
  /**
   * Get today's metrics
   */
  static async getTodayMetrics(): Promise<RevenueMetrics> {
    const sql = await getSql()

    const [revenue] = await sql`
      SELECT 
        COALESCE(total_revenue, 0) as revenue,
        COALESCE(payment_count, 0) as payments,
        COALESCE(active_services, 0) as active
      FROM revenue_daily
      WHERE date = CURRENT_DATE
    `

    const [counts] = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true AND is_suspended = false) as active_users,
        COUNT(*) FILTER (WHERE is_suspended = true) as suspended_users,
        COUNT(*) as total_users
      FROM customer_services
      WHERE is_deleted = false
    `

    const activeUsers = counts?.active_users || 0
    const suspendedUsers = counts?.suspended_users || 0
    const totalUsers = counts?.total_users || 1

    const arpu = activeUsers > 0 ? (revenue?.revenue || 0) / activeUsers : 0
    const churnRate = totalUsers > 0 ? (suspendedUsers / totalUsers) * 100 : 0
    const ltv = arpu * 12 // Simplified: ARPU × 12 months

    return {
      revenue: revenue?.revenue || 0,
      arpu,
      churnRate,
      activeUsers,
      ltv,
    }
  }

  /**
   * Get monthly revenue trend
   */
  static async getMonthlyTrend(months = 6): Promise<any[]> {
    const sql = await getSql()

    const trend = await sql`
      SELECT 
        DATE_TRUNC('month', date) as month,
        SUM(total_revenue) as revenue,
        SUM(payment_count) as payments
      FROM revenue_daily
      WHERE date >= CURRENT_DATE - INTERVAL '${months} months'
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY month DESC
    `

    return trend
  }

  /**
   * Update revenue aggregation (run daily)
   */
  static async updateDailyAggregation(): Promise<void> {
    const sql = await getSql()

    const [counts] = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true AND is_suspended = false) as active,
        COUNT(*) FILTER (WHERE is_suspended = true) as suspended
      FROM customer_services
      WHERE is_deleted = false
    `

    await sql`
      UPDATE revenue_daily
      SET active_services = ${counts.active},
          suspended_services = ${counts.suspended}
      WHERE date = CURRENT_DATE
    `
  }
}

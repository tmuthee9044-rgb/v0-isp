import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()

    const [
      customerCount,
      customerCountLastMonth,
      monthlyRevenue,
      lastMonthRevenue,
      networkDevices,
      overdueInvoices,
      bandwidthUsage,
      recentActivity,
    ] = await Promise.all([
      // Total active customers
      sql`SELECT COUNT(*) as count FROM customers WHERE status = 'active'`,

      // Last month's customer count for growth calculation
      sql`SELECT COUNT(*) as count FROM customers 
          WHERE status = 'active' 
          AND created_at < DATE_TRUNC('month', CURRENT_DATE)`,

      // Monthly revenue from payments
      sql`SELECT 
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(*) as payment_count
        FROM payments 
        WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE)
        AND status = 'completed'`,

      // Last month's revenue for trend calculation
      sql`SELECT 
        COALESCE(SUM(amount), 0) as total_revenue
        FROM payments 
        WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
        AND payment_date < DATE_TRUNC('month', CURRENT_DATE)
        AND status = 'completed'`,

      // Network device status
      sql`SELECT 
        status,
        COUNT(*) as count
        FROM network_devices 
        GROUP BY status`,

      // Overdue invoices
      sql`SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
        FROM invoices 
        WHERE due_date < CURRENT_DATE 
        AND status = 'unpaid'`,

      sql`SELECT 
        COALESCE(AVG((bandwidth_usage::numeric / NULLIF(peak_usage, 0)) * 100), 0) as avg_utilization
        FROM router_performance_history
        WHERE timestamp >= NOW() - INTERVAL '1 hour'
        AND peak_usage > 0`,

      sql`SELECT 
        CONCAT('Support ticket: ', title) as message,
        description as details,
        created_at,
        CASE 
          WHEN priority = 'high' THEN 'error'
          WHEN priority = 'medium' THEN 'warning'
          ELSE 'info'
        END as status,
        'Support' as category
        FROM support_tickets 
        ORDER BY created_at DESC 
        LIMIT 10`,
    ])

    const currentCustomers = Number(customerCount[0]?.count || 0)
    const lastMonthCustomers = Number(customerCountLastMonth[0]?.count || 0)
    const customerGrowth =
      lastMonthCustomers > 0 ? ((currentCustomers - lastMonthCustomers) / lastMonthCustomers) * 100 : 0

    const currentRevenue = Number(monthlyRevenue[0]?.total_revenue || 0)
    const previousRevenue = Number(lastMonthRevenue[0]?.total_revenue || 0)
    const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0

    const bandwidthUtil = Math.round(Number(bandwidthUsage[0]?.avg_utilization || 0))

    const metrics = {
      users: {
        value: currentCustomers,
        change: `${customerGrowth >= 0 ? "+" : ""}${customerGrowth.toFixed(1)}%`,
        trend: customerGrowth >= 0 ? "up" : "down",
      },
      revenue: {
        value: currentRevenue,
        change: `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth.toFixed(1)}%`,
        trend: revenueGrowth >= 0 ? "up" : "down",
      },
      bandwidth: {
        value: bandwidthUtil,
        change: `${bandwidthUtil}% utilized`,
        trend: bandwidthUtil > 80 ? "down" : "up",
      },
      alerts: {
        value: recentActivity.filter((a) => a.status === "error" || a.status === "warning").length,
        change: "Real-time",
        trend: "none",
      },
    }

    const networkStatus = {
      online: networkDevices.find((d) => d.status === "online")?.count || 0,
      offline: networkDevices.find((d) => d.status === "offline")?.count || 0,
      total: networkDevices.reduce((sum, d) => sum + Number.parseInt(d.count), 0),
    }

    const invoiceStats = {
      count: overdueInvoices[0]?.count || 0,
      amount: overdueInvoices[0]?.total_amount || 0,
    }

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        networkStatus,
        invoiceStats,
        recentActivity: recentActivity.map((activity) => ({
          id: Math.random(),
          status: activity.status === "error" ? "error" : activity.status === "warning" ? "warning" : "info",
          message: activity.message,
          details: activity.details || "No additional details",
          time: new Date(activity.created_at).toLocaleTimeString(),
          category: activity.category || "System",
        })),
      },
    })
  } catch (error) {
    console.error("Dashboard metrics error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard metrics", details: error.message },
      { status: 500 },
    )
  }
}

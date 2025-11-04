import { NextResponse } from "next/server"
import { neon } from "@/lib/neon-wrapper"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const [customerCount, monthlyRevenue, networkDevices, overdueInvoices, bandwidthUsage, recentActivity] =
      await Promise.all([
        // Total active customers
        sql`SELECT COUNT(*) as count FROM customers`, // Fix customer count to use customers table instead of active services

        // Monthly revenue from payments
        sql`SELECT 
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(*) as payment_count
        FROM payments 
        WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE)
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

        // Bandwidth utilization (mock calculation for now)
        sql`SELECT 
        AVG(CASE WHEN status = 'online' THEN 75 ELSE 0 END) as avg_utilization
        FROM network_devices`,

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

    const metrics = {
      users: {
        value: customerCount[0]?.count || 0,
        change: "+5%", // This would be calculated from historical data
        trend: "up",
      },
      revenue: {
        value: monthlyRevenue[0]?.total_revenue || 0,
        change: "+10%",
        trend: "up",
      },
      bandwidth: {
        value: Math.round(bandwidthUsage[0]?.avg_utilization || 0),
        change: "-2%",
        trend: "down",
      },
      alerts: {
        value: recentActivity.filter((a) => a.status === "error" || a.status === "warning").length,
        change: "0%",
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
    console.error("[v0] Dashboard metrics error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch dashboard metrics" }, { status: 500 })
  }
}

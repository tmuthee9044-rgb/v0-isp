import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const sql = await getSql()

    const { dateFrom, dateTo, granularity = "monthly" } = await request.json()

    console.log("[v0] Finance revenue - Date range:", { dateFrom, dateTo })

    // Get total revenue for the period
    const totalRevenueResult = await sql`
      SELECT 
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(*) as transaction_count,
        AVG(amount) as avg_transaction_value
      FROM payments 
      WHERE status = 'completed' 
        AND created_at >= ${dateFrom}
        AND created_at <= ${dateTo}
    `

    console.log("[v0] Total revenue result:", totalRevenueResult[0])

    const revenueByPlanResult = await sql`
      SELECT 
        COALESCE(sp.name, 'No Plan') as plan_name,
        COALESCE(sp.price, 0) as plan_price,
        COALESCE(SUM(p.amount), 0) as revenue,
        COUNT(DISTINCT p.customer_id) as customer_count,
        COUNT(p.id) as payment_count
      FROM payments p
      INNER JOIN customers c ON p.customer_id = c.id
      LEFT JOIN customer_services cs ON c.id = cs.customer_id AND cs.status = 'active'
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE p.status = 'completed'
        AND p.created_at >= ${dateFrom} 
        AND p.created_at <= ${dateTo}
      GROUP BY sp.id, sp.name, sp.price
      ORDER BY revenue DESC
    `

    console.log("[v0] Revenue by plan:", revenueByPlanResult.length, "plans")

    // Get revenue trends based on granularity
    let trendQuery
    if (granularity === "daily") {
      trendQuery = sql`
        SELECT 
          DATE(created_at) as period,
          COALESCE(SUM(amount), 0) as revenue,
          COUNT(*) as transactions
        FROM payments 
        WHERE status = 'completed' 
          AND created_at >= ${dateFrom}
          AND created_at <= ${dateTo}
        GROUP BY DATE(created_at)
        ORDER BY period ASC
      `
    } else if (granularity === "weekly") {
      trendQuery = sql`
        SELECT 
          DATE_TRUNC('week', created_at) as period,
          COALESCE(SUM(amount), 0) as revenue,
          COUNT(*) as transactions
        FROM payments 
        WHERE status = 'completed' 
          AND created_at >= ${dateFrom}
          AND created_at <= ${dateTo}
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY period ASC
      `
    } else {
      trendQuery = sql`
        SELECT 
          DATE_TRUNC('month', created_at) as period,
          COALESCE(SUM(amount), 0) as revenue,
          COUNT(*) as transactions
        FROM payments 
        WHERE status = 'completed' 
          AND created_at >= ${dateFrom} 
          AND created_at <= ${dateTo}
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY period ASC
      `
    }

    const trendData = await trendQuery

    const topCustomersResult = await sql`
      SELECT 
        c.name as customer_name,
        c.email,
        COALESCE(sp.name, 'No Plan') as plan_name,
        COALESCE(SUM(p.amount), 0) as total_revenue,
        COUNT(p.id) as payment_count,
        MAX(p.created_at) as last_payment_date
      FROM payments p
      INNER JOIN customers c ON p.customer_id = c.id
      LEFT JOIN customer_services cs ON c.id = cs.customer_id AND cs.status = 'active'
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE p.status = 'completed'
        AND p.created_at >= ${dateFrom} 
        AND p.created_at <= ${dateTo}
      GROUP BY c.id, c.name, c.email, sp.name
      HAVING SUM(p.amount) > 0
      ORDER BY total_revenue DESC
      LIMIT 10
    `

    console.log("[v0] Top customers:", topCustomersResult.length, "customers")

    // Get revenue by payment method
    const paymentMethodResult = await sql`
      SELECT 
        COALESCE(payment_method, 'cash') as payment_method,
        COALESCE(SUM(amount), 0) as revenue,
        COUNT(*) as transaction_count,
        AVG(amount) as avg_amount
      FROM payments 
      WHERE status = 'completed' 
        AND created_at >= ${dateFrom}
        AND created_at <= ${dateTo}
      GROUP BY payment_method
      ORDER BY revenue DESC
    `

    console.log("[v0] Payment methods:", paymentMethodResult.length, "methods")

    // Get recurring vs one-time revenue - simplified to just count payment types
    const recurringRevenueResult = await sql`
      SELECT 
        'One-time' as revenue_type,
        COALESCE(SUM(amount), 0) as revenue,
        COUNT(id) as transaction_count
      FROM payments 
      WHERE status = 'completed' 
        AND created_at >= ${dateFrom}
        AND created_at <= ${dateTo}
    `

    // Calculate growth metrics
    const previousPeriodStart = new Date(dateFrom)
    const previousPeriodEnd = new Date(dateTo)
    const daysDiff = Math.ceil((previousPeriodEnd.getTime() - previousPeriodStart.getTime()) / (1000 * 60 * 60 * 24))

    previousPeriodStart.setDate(previousPeriodStart.getDate() - daysDiff)
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - daysDiff)

    const previousPeriodRevenueResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as previous_revenue
      FROM payments 
      WHERE status = 'completed' 
        AND created_at >= ${previousPeriodStart.toISOString().split("T")[0]}
        AND created_at <= ${previousPeriodEnd.toISOString().split("T")[0]}
    `

    // Calculate metrics
    const totalRevenue = Number(totalRevenueResult[0].total_revenue)
    const previousRevenue = Number(previousPeriodRevenueResult[0].previous_revenue)
    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

    // Format trend data with growth calculations
    const formattedTrendData = trendData.map((item, index) => {
      const prevItem = trendData[index - 1]
      const growth = prevItem ? ((Number(item.revenue) - Number(prevItem.revenue)) / Number(prevItem.revenue)) * 100 : 0

      return {
        period: item.period,
        revenue: Number(item.revenue),
        transactions: Number(item.transactions),
        growth: growth,
      }
    })

    // Format service plan data
    const servicePlans = revenueByPlanResult.map((plan) => ({
      name: plan.plan_name,
      price: Number(plan.plan_price),
      revenue: Number(plan.revenue),
      customerCount: Number(plan.customer_count),
      paymentCount: Number(plan.payment_count),
      avgRevenuePerCustomer: Number(plan.customer_count) > 0 ? Number(plan.revenue) / Number(plan.customer_count) : 0,
    }))

    // Format top customers
    const topCustomers = topCustomersResult.map((customer) => ({
      name: customer.customer_name,
      email: customer.email,
      plan: customer.plan_name || "No Plan",
      totalRevenue: Number(customer.total_revenue),
      paymentCount: Number(customer.payment_count),
      lastPaymentDate: customer.last_payment_date,
      avgPaymentValue:
        Number(customer.payment_count) > 0 ? Number(customer.total_revenue) / Number(customer.payment_count) : 0,
    }))

    // Format payment methods
    const paymentMethods = paymentMethodResult.map((method) => ({
      method: method.payment_method || "cash",
      revenue: Number(method.revenue),
      transactionCount: Number(method.transaction_count),
      avgAmount: Number(method.avg_amount),
      percentage: totalRevenue > 0 ? (Number(method.revenue) / totalRevenue) * 100 : 0,
    }))

    // Format recurring revenue data
    const recurringRevenue = recurringRevenueResult.reduce((acc, item) => {
      acc[item.revenue_type.toLowerCase()] = {
        revenue: Number(item.revenue),
        transactionCount: Number(item.transaction_count),
        percentage: totalRevenue > 0 ? (Number(item.revenue) / totalRevenue) * 100 : 0,
      }
      return acc
    }, {} as any)

    const responseData = {
      summary: {
        totalRevenue,
        transactionCount: Number(totalRevenueResult[0].transaction_count),
        avgTransactionValue: Number(totalRevenueResult[0].avg_transaction_value),
        revenueGrowth,
        previousPeriodRevenue: previousRevenue,
      },
      trends: formattedTrendData,
      servicePlans,
      topCustomers,
      paymentMethods,
      recurringRevenue: {
        recurring: recurringRevenue.recurring || { revenue: 0, transactionCount: 0, percentage: 0 },
        oneTime: recurringRevenue["one-time"] || { revenue: 0, transactionCount: 0, percentage: 0 },
      },
      metrics: {
        monthlyRecurringRevenue: recurringRevenue.recurring?.revenue || 0,
        customerLifetimeValue:
          topCustomers.length > 0 ? topCustomers.reduce((sum, c) => sum + c.totalRevenue, 0) / topCustomers.length : 0,
        averageRevenuePerUser:
          servicePlans.reduce((sum, p) => sum + p.avgRevenuePerCustomer, 0) / (servicePlans.length || 1),
      },
    }

    console.log("[v0] Formatted data - topCustomers:", topCustomers.length, "paymentMethods:", paymentMethods.length)

    console.log("[v0] Final response summary:", {
      totalRevenue: responseData.summary.totalRevenue,
      topCustomersCount: responseData.topCustomers.length,
      paymentMethodsCount: responseData.paymentMethods.length,
    })

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("[v0] Revenue tracking error:", error)
    return NextResponse.json({ error: "Failed to fetch revenue data" }, { status: 500 })
  }
}

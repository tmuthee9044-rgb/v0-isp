import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { dateFrom, dateTo, granularity = "monthly" } = await request.json()

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

    // Get revenue by service plan
    const revenueByPlanResult = await sql`
      SELECT 
        sp.name as plan_name,
        sp.price as plan_price,
        COALESCE(SUM(p.amount), 0) as revenue,
        COUNT(DISTINCT c.id) as customer_count,
        COUNT(p.id) as payment_count
      FROM service_plans sp
      LEFT JOIN customer_services cs ON sp.id = cs.service_plan_id
      LEFT JOIN customers c ON cs.customer_id = c.id
      LEFT JOIN payments p ON c.id = p.customer_id 
        AND p.status = 'completed'
        AND p.created_at >= ${dateFrom} 
        AND p.created_at <= ${dateTo}
      GROUP BY sp.id, sp.name, sp.price
      ORDER BY revenue DESC
    `

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

    // Get top revenue customers
    const topCustomersResult = await sql`
      SELECT 
        c.first_name || ' ' || c.last_name as customer_name,
        c.email,
        sp.name as plan_name,
        COALESCE(SUM(p.amount), 0) as total_revenue,
        COUNT(p.id) as payment_count,
        MAX(p.created_at) as last_payment_date
      FROM customers c
      LEFT JOIN customer_services cs ON c.id = cs.customer_id
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      LEFT JOIN payments p ON c.id = p.customer_id 
        AND p.status = 'completed'
        AND p.created_at >= ${dateFrom} 
        AND p.created_at <= ${dateTo}
      GROUP BY c.id, c.first_name, c.last_name, c.email, sp.name
      HAVING SUM(p.amount) > 0
      ORDER BY total_revenue DESC
      LIMIT 10
    `

    // Get revenue by payment method
    const paymentMethodResult = await sql`
      SELECT 
        payment_method,
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

    // Get recurring vs one-time revenue
    const recurringRevenueResult = await sql`
      SELECT 
        CASE 
          WHEN sp.billing_cycle IS NOT NULL THEN 'Recurring'
          ELSE 'One-time'
        END as revenue_type,
        COALESCE(SUM(p.amount), 0) as revenue,
        COUNT(p.id) as transaction_count
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN customer_services cs ON c.id = cs.customer_id
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE p.status = 'completed' 
        AND p.created_at >= ${dateFrom}
        AND p.created_at <= ${dateTo}
      GROUP BY 
        CASE 
          WHEN sp.billing_cycle IS NOT NULL THEN 'Recurring'
          ELSE 'One-time'
        END
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
      method: method.payment_method || "Unknown",
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

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Revenue tracking error:", error)
    return NextResponse.json({ error: "Failed to fetch revenue data" }, { status: 500 })
  }
}

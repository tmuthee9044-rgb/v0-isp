import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  const startTime = Date.now()

  try {
    const sql = await getSql()
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    console.log("[v0] Billing dashboard query started", { dateFrom, dateTo })

    const [invoices, payments, stats] = await Promise.all([
      // Optimized invoice query - removed service_plans JOIN as it's rarely needed
      dateFrom && dateTo
        ? sql`
          SELECT 
            i.id,
            i.invoice_number,
            COALESCE(CONCAT(c.first_name, ' ', c.last_name), c.business_name, c.name, 'Unknown Customer') as customer,
            c.email,
            i.amount,
            i.status,
            i.created_at as date,
            i.due_date as "dueDate",
            CASE 
              WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') 
              THEN EXTRACT(days FROM CURRENT_DATE - i.due_date)::integer
              ELSE 0
            END as "daysOverdue"
          FROM invoices i
          JOIN customers c ON i.customer_id = c.id
          WHERE i.created_at >= ${dateFrom}::date AND i.created_at < (${dateTo}::date + INTERVAL '1 day')
          ORDER BY i.created_at DESC
          LIMIT 100
        `
        : dateFrom
          ? sql`
          SELECT 
            i.id,
            i.invoice_number,
            COALESCE(CONCAT(c.first_name, ' ', c.last_name), c.business_name, c.name, 'Unknown Customer') as customer,
            c.email,
            i.amount,
            i.status,
            i.created_at as date,
            i.due_date as "dueDate",
            CASE 
              WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') 
              THEN EXTRACT(days FROM CURRENT_DATE - i.due_date)::integer
              ELSE 0
            END as "daysOverdue"
          FROM invoices i
          JOIN customers c ON i.customer_id = c.id
          WHERE i.created_at >= ${dateFrom}::date
          ORDER BY i.created_at DESC
          LIMIT 100
        `
          : dateTo
            ? sql`
          SELECT 
            i.id,
            i.invoice_number,
            COALESCE(CONCAT(c.first_name, ' ', c.last_name), c.business_name, c.name, 'Unknown Customer') as customer,
            c.email,
            i.amount,
            i.status,
            i.created_at as date,
            i.due_date as "dueDate",
            CASE 
              WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') 
              THEN EXTRACT(days FROM CURRENT_DATE - i.due_date)::integer
              ELSE 0
            END as "daysOverdue"
          FROM invoices i
          JOIN customers c ON i.customer_id = c.id
          WHERE i.created_at < (${dateTo}::date + INTERVAL '1 day')
          ORDER BY i.created_at DESC
          LIMIT 100
        `
            : sql`
          SELECT 
            i.id,
            i.invoice_number,
            COALESCE(CONCAT(c.first_name, ' ', c.last_name), c.business_name, c.name, 'Unknown Customer') as customer,
            c.email,
            i.amount,
            i.status,
            i.created_at as date,
            i.due_date as "dueDate",
            CASE 
              WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') 
              THEN EXTRACT(days FROM CURRENT_DATE - i.due_date)::integer
              ELSE 0
            END as "daysOverdue"
          FROM invoices i
          JOIN customers c ON i.customer_id = c.id
          ORDER BY i.created_at DESC
          LIMIT 100
        `,

      dateFrom && dateTo
        ? sql`
          SELECT 
            p.id,
            COALESCE(CONCAT(c.first_name, ' ', c.last_name), c.business_name, c.name, 'Unknown Customer') as customer,
            p.amount,
            p.payment_method as method,
            p.payment_date as date,
            p.status,
            p.transaction_id as reference,
            0 as "processingFee"
          FROM payments p
          JOIN customers c ON p.customer_id = c.id
          WHERE p.payment_date >= ${dateFrom}::date AND p.payment_date < (${dateTo}::date + INTERVAL '1 day')
          ORDER BY p.payment_date DESC
          LIMIT 100
        `
        : dateFrom
          ? sql`
          SELECT 
            p.id,
            COALESCE(CONCAT(c.first_name, ' ', c.last_name), c.business_name, c.name, 'Unknown Customer') as customer,
            p.amount,
            p.payment_method as method,
            p.payment_date as date,
            p.status,
            p.transaction_id as reference,
            0 as "processingFee"
          FROM payments p
          JOIN customers c ON p.customer_id = c.id
          WHERE p.payment_date >= ${dateFrom}::date
          ORDER BY p.payment_date DESC
          LIMIT 100
        `
          : dateTo
            ? sql`
          SELECT 
            p.id,
            COALESCE(CONCAT(c.first_name, ' ', c.last_name), c.business_name, c.name, 'Unknown Customer') as customer,
            p.amount,
            p.payment_method as method,
            p.payment_date as date,
            p.status,
            p.transaction_id as reference,
            0 as "processingFee"
          FROM payments p
          JOIN customers c ON p.customer_id = c.id
          WHERE p.payment_date < (${dateTo}::date + INTERVAL '1 day')
          ORDER BY p.payment_date DESC
          LIMIT 100
        `
            : sql`
          SELECT 
            p.id,
            COALESCE(CONCAT(c.first_name, ' ', c.last_name), c.business_name, c.name, 'Unknown Customer') as customer,
            p.amount,
            p.payment_method as method,
            p.payment_date as date,
            p.status,
            p.transaction_id as reference,
            0 as "processingFee"
          FROM payments p
          JOIN customers c ON p.customer_id = c.id
          ORDER BY p.payment_date DESC
          LIMIT 100
        `,

      dateFrom && dateTo
        ? sql`
          WITH payment_stats AS (
            SELECT SUM(amount)::numeric as total_revenue
            FROM payments 
            WHERE status = 'completed'
            AND payment_date >= ${dateFrom}::date 
            AND payment_date < (${dateTo}::date + INTERVAL '1 day')
          )
          SELECT 
            COUNT(CASE WHEN i.status = 'paid' THEN 1 END)::integer as paid_invoices,
            COUNT(CASE WHEN i.status IN ('pending', 'sent', 'draft') THEN 1 END)::integer as pending_invoices,
            COUNT(CASE WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') THEN 1 END)::integer as overdue_invoices,
            COALESCE((SELECT total_revenue FROM payment_stats), 0)::numeric as total_revenue,
            COALESCE(SUM(CASE WHEN i.status IN ('pending', 'sent', 'draft') THEN i.amount END), 0)::numeric as pending_amount,
            COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') THEN i.amount END), 0)::numeric as overdue_amount
          FROM invoices i
          WHERE i.created_at >= ${dateFrom}::date AND i.created_at < (${dateTo}::date + INTERVAL '1 day')
        `
        : dateFrom
          ? sql`
          WITH payment_stats AS (
            SELECT SUM(amount)::numeric as total_revenue
            FROM payments 
            WHERE status = 'completed'
            AND payment_date >= ${dateFrom}::date
          )
          SELECT 
            COUNT(CASE WHEN i.status = 'paid' THEN 1 END)::integer as paid_invoices,
            COUNT(CASE WHEN i.status IN ('pending', 'sent', 'draft') THEN 1 END)::integer as pending_invoices,
            COUNT(CASE WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') THEN 1 END)::integer as overdue_invoices,
            COALESCE((SELECT total_revenue FROM payment_stats), 0)::numeric as total_revenue,
            COALESCE(SUM(CASE WHEN i.status IN ('pending', 'sent', 'draft') THEN i.amount END), 0)::numeric as pending_amount,
            COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') THEN i.amount END), 0)::numeric as overdue_amount
          FROM invoices i
          WHERE i.created_at >= ${dateFrom}::date
        `
          : dateTo
            ? sql`
          WITH payment_stats AS (
            SELECT SUM(amount)::numeric as total_revenue
            FROM payments 
            WHERE status = 'completed'
            AND payment_date < (${dateTo}::date + INTERVAL '1 day')
          )
          SELECT 
            COUNT(CASE WHEN i.status = 'paid' THEN 1 END)::integer as paid_invoices,
            COUNT(CASE WHEN i.status IN ('pending', 'sent', 'draft') THEN 1 END)::integer as pending_invoices,
            COUNT(CASE WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') THEN 1 END)::integer as overdue_invoices,
            COALESCE((SELECT total_revenue FROM payment_stats), 0)::numeric as total_revenue,
            COALESCE(SUM(CASE WHEN i.status IN ('pending', 'sent', 'draft') THEN i.amount END), 0)::numeric as pending_amount,
            COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') THEN i.amount END), 0)::numeric as overdue_amount
          FROM invoices i
          WHERE i.created_at < (${dateTo}::date + INTERVAL '1 day')
        `
            : sql`
          WITH payment_stats AS (
            SELECT SUM(amount)::numeric as total_revenue
            FROM payments 
            WHERE status = 'completed'
          )
          SELECT 
            COUNT(CASE WHEN i.status = 'paid' THEN 1 END)::integer as paid_invoices,
            COUNT(CASE WHEN i.status IN ('pending', 'sent', 'draft') THEN 1 END)::integer as pending_invoices,
            COUNT(CASE WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') THEN 1 END)::integer as overdue_invoices,
            COALESCE((SELECT total_revenue FROM payment_stats), 0)::numeric as total_revenue,
            COALESCE(SUM(CASE WHEN i.status IN ('pending', 'sent', 'draft') THEN i.amount END), 0)::numeric as pending_amount,
            COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') THEN i.amount END), 0)::numeric as overdue_amount
          FROM invoices i
        `,
    ])

    const duration = Date.now() - startTime
    console.log(`[v0] Billing dashboard query completed in ${duration}ms`)

    return NextResponse.json(
      {
        success: true,
        data: {
          invoices: invoices || [],
          payments: payments || [],
          stats: stats[0] || {
            paid_invoices: 0,
            pending_invoices: 0,
            overdue_invoices: 0,
            total_revenue: 0,
            pending_amount: 0,
            overdue_amount: 0,
          },
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  } catch (error) {
    console.error("Error fetching billing data:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch billing data",
        data: {
          invoices: [],
          payments: [],
          stats: {
            paid_invoices: 0,
            pending_invoices: 0,
            overdue_invoices: 0,
            total_revenue: 0,
            pending_amount: 0,
            overdue_amount: 0,
          },
        },
      },
      { status: 500 },
    )
  }
}

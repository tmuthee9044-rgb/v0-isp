import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const [invoices, payments, stats] = await Promise.all([
      // Invoice query with date filtering
      dateFrom && dateTo
        ? sql`
          SELECT 
            i.id,
            i.invoice_number as id,
            COALESCE(CONCAT(c.first_name, ' ', c.last_name), c.business_name, 'Unknown Customer') as customer,
            c.email,
            i.amount,
            i.status,
            i.created_at as date,
            i.due_date as "dueDate",
            sp.name as plan,
            CASE 
              WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') 
              THEN EXTRACT(days FROM NOW() - i.due_date)::integer
              ELSE 0
            END as "daysOverdue"
          FROM invoices i
          JOIN customers c ON i.customer_id = c.id
          LEFT JOIN customer_services cs ON c.id = cs.customer_id AND cs.status = 'active'
          LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
          WHERE DATE(i.created_at) BETWEEN ${dateFrom} AND ${dateTo}
          ORDER BY i.created_at DESC
          LIMIT 100
        `
        : dateFrom
          ? sql`
          SELECT 
            i.id,
            i.invoice_number as id,
            COALESCE(CONCAT(c.first_name, ' ', c.last_name), c.business_name, 'Unknown Customer') as customer,
            c.email,
            i.amount,
            i.status,
            i.created_at as date,
            i.due_date as "dueDate",
            sp.name as plan,
            CASE 
              WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') 
              THEN EXTRACT(days FROM NOW() - i.due_date)::integer
              ELSE 0
            END as "daysOverdue"
          FROM invoices i
          JOIN customers c ON i.customer_id = c.id
          LEFT JOIN customer_services cs ON c.id = cs.customer_id AND cs.status = 'active'
          LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
          WHERE DATE(i.created_at) >= ${dateFrom}
          ORDER BY i.created_at DESC
          LIMIT 100
        `
          : dateTo
            ? sql`
          SELECT 
            i.id,
            i.invoice_number as id,
            COALESCE(CONCAT(c.first_name, ' ', c.last_name), c.business_name, 'Unknown Customer') as customer,
            c.email,
            i.amount,
            i.status,
            i.created_at as date,
            i.due_date as "dueDate",
            sp.name as plan,
            CASE 
              WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') 
              THEN EXTRACT(days FROM NOW() - i.due_date)::integer
              ELSE 0
            END as "daysOverdue"
          FROM invoices i
          JOIN customers c ON i.customer_id = c.id
          LEFT JOIN customer_services cs ON c.id = cs.customer_id AND cs.status = 'active'
          LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
          WHERE DATE(i.created_at) <= ${dateTo}
          ORDER BY i.created_at DESC
          LIMIT 100
        `
            : sql`
          SELECT 
            i.id,
            i.invoice_number as id,
            COALESCE(CONCAT(c.first_name, ' ', c.last_name), c.business_name, 'Unknown Customer') as customer,
            c.email,
            i.amount,
            i.status,
            i.created_at as date,
            i.due_date as "dueDate",
            sp.name as plan,
            CASE 
              WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') 
              THEN EXTRACT(days FROM NOW() - i.due_date)::integer
              ELSE 0
            END as "daysOverdue"
          FROM invoices i
          JOIN customers c ON i.customer_id = c.id
          LEFT JOIN customer_services cs ON c.id = cs.customer_id AND cs.status = 'active'
          LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
          ORDER BY i.created_at DESC
          LIMIT 100
        `,

      // Payment query with date filtering
      dateFrom && dateTo
        ? sql`
          SELECT 
            p.id,
            COALESCE(CONCAT(c.first_name, ' ', c.last_name), c.business_name, 'Unknown Customer') as customer,
            p.amount,
            p.payment_method as method,
            p.payment_date as date,
            p.status,
            p.transaction_id as reference,
            0 as "processingFee"
          FROM payments p
          JOIN customers c ON p.customer_id = c.id
          WHERE DATE(p.payment_date) BETWEEN ${dateFrom} AND ${dateTo}
          ORDER BY p.payment_date DESC
          LIMIT 100
        `
        : dateFrom
          ? sql`
          SELECT 
            p.id,
            COALESCE(CONCAT(c.first_name, ' ', c.last_name), c.business_name, 'Unknown Customer') as customer,
            p.amount,
            p.payment_method as method,
            p.payment_date as date,
            p.status,
            p.transaction_id as reference,
            0 as "processingFee"
          FROM payments p
          JOIN customers c ON p.customer_id = c.id
          WHERE DATE(p.payment_date) >= ${dateFrom}
          ORDER BY p.payment_date DESC
          LIMIT 100
        `
          : dateTo
            ? sql`
          SELECT 
            p.id,
            COALESCE(CONCAT(c.first_name, ' ', c.last_name), c.business_name, 'Unknown Customer') as customer,
            p.amount,
            p.payment_method as method,
            p.payment_date as date,
            p.status,
            p.transaction_id as reference,
            0 as "processingFee"
          FROM payments p
          JOIN customers c ON p.customer_id = c.id
          WHERE DATE(p.payment_date) <= ${dateTo}
          ORDER BY p.payment_date DESC
          LIMIT 100
        `
            : sql`
          SELECT 
            p.id,
            COALESCE(CONCAT(c.first_name, ' ', c.last_name), c.business_name, 'Unknown Customer') as customer,
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

      // Stats query with date filtering
      dateFrom && dateTo
        ? sql`
          SELECT 
            COUNT(CASE WHEN i.status = 'paid' THEN 1 END)::integer as paid_invoices,
            COUNT(CASE WHEN i.status IN ('pending', 'sent', 'draft') THEN 1 END)::integer as pending_invoices,
            COUNT(CASE WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') THEN 1 END)::integer as overdue_invoices,
            COALESCE((
              SELECT SUM(amount) 
              FROM payments 
              WHERE status = 'completed'
              AND DATE(payment_date) BETWEEN ${dateFrom} AND ${dateTo}
            ), 0)::numeric as total_revenue,
            COALESCE(SUM(CASE WHEN i.status IN ('pending', 'sent', 'draft') THEN i.amount END), 0)::numeric as pending_amount,
            COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') THEN i.amount END), 0)::numeric as overdue_amount
          FROM invoices i
          WHERE DATE(i.created_at) BETWEEN ${dateFrom} AND ${dateTo}
        `
        : dateFrom
          ? sql`
          SELECT 
            COUNT(CASE WHEN i.status = 'paid' THEN 1 END)::integer as paid_invoices,
            COUNT(CASE WHEN i.status IN ('pending', 'sent', 'draft') THEN 1 END)::integer as pending_invoices,
            COUNT(CASE WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') THEN 1 END)::integer as overdue_invoices,
            COALESCE((
              SELECT SUM(amount) 
              FROM payments 
              WHERE status = 'completed'
              AND DATE(payment_date) >= ${dateFrom}
            ), 0)::numeric as total_revenue,
            COALESCE(SUM(CASE WHEN i.status IN ('pending', 'sent', 'draft') THEN i.amount END), 0)::numeric as pending_amount,
            COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') THEN i.amount END), 0)::numeric as overdue_amount
          FROM invoices i
          WHERE DATE(i.created_at) >= ${dateFrom}
        `
          : dateTo
            ? sql`
          SELECT 
            COUNT(CASE WHEN i.status = 'paid' THEN 1 END)::integer as paid_invoices,
            COUNT(CASE WHEN i.status IN ('pending', 'sent', 'draft') THEN 1 END)::integer as pending_invoices,
            COUNT(CASE WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') THEN 1 END)::integer as overdue_invoices,
            COALESCE((
              SELECT SUM(amount) 
              FROM payments 
              WHERE status = 'completed'
              AND DATE(payment_date) <= ${dateTo}
            ), 0)::numeric as total_revenue,
            COALESCE(SUM(CASE WHEN i.status IN ('pending', 'sent', 'draft') THEN i.amount END), 0)::numeric as pending_amount,
            COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') THEN i.amount END), 0)::numeric as overdue_amount
          FROM invoices i
          WHERE DATE(i.created_at) <= ${dateTo}
        `
            : sql`
          SELECT 
            COUNT(CASE WHEN i.status = 'paid' THEN 1 END)::integer as paid_invoices,
            COUNT(CASE WHEN i.status IN ('pending', 'sent', 'draft') THEN 1 END)::integer as pending_invoices,
            COUNT(CASE WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') THEN 1 END)::integer as overdue_invoices,
            COALESCE((
              SELECT SUM(amount) 
              FROM payments 
              WHERE status = 'completed'
            ), 0)::numeric as total_revenue,
            COALESCE(SUM(CASE WHEN i.status IN ('pending', 'sent', 'draft') THEN i.amount END), 0)::numeric as pending_amount,
            COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled') THEN i.amount END), 0)::numeric as overdue_amount
          FROM invoices i
        `,
    ])

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

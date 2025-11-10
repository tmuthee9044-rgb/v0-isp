import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    console.log("[v0] Fetching balance for customer:", customerId)

    const balanceQuery = sql`
      WITH service_costs AS (
        SELECT 
          cs.customer_id,
          COALESCE(SUM(cs.monthly_fee), 0) as total_monthly_cost,
          COUNT(cs.id) as active_services_count
        FROM customer_services cs
        WHERE cs.customer_id = ${customerId} 
          AND cs.status = 'active'
        GROUP BY cs.customer_id
      ),
      payment_totals AS (
        SELECT 
          customer_id,
          COALESCE(SUM(amount), 0) as total_paid
        FROM payments 
        WHERE customer_id = ${customerId} 
          AND status = 'completed'
        GROUP BY customer_id
      ),
      invoice_totals AS (
        SELECT 
          customer_id,
          COALESCE(SUM(amount), 0) as total_invoiced
        FROM invoices 
        WHERE customer_id = ${customerId}
          AND status != 'cancelled'
        GROUP BY customer_id
      ),
      adjustment_totals AS (
        SELECT 
          customer_id,
          COALESCE(SUM(CASE WHEN adjustment_type = 'credit' THEN amount ELSE -amount END), 0) as total_adjustments
        FROM financial_adjustments 
        WHERE customer_id = ${customerId}
          AND status = 'approved'
        GROUP BY customer_id
      ),
      outstanding_invoices AS (
        SELECT 
          customer_id,
          COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0) as outstanding_amount
        FROM invoices 
        WHERE customer_id = ${customerId}
          AND status IN ('pending', 'overdue', 'partial')
        GROUP BY customer_id
      )
      SELECT 
        ab.id,
        ab.customer_id,
        -- Calculate actual balance: payments + adjustments - invoices
        COALESCE(pt.total_paid, 0) + COALESCE(at.total_adjustments, 0) - COALESCE(it.total_invoiced, 0) as balance,
        COALESCE(oi.outstanding_amount, 0) as outstanding_balance,
        ab.credit_limit,
        CASE 
          WHEN COALESCE(pt.total_paid, 0) + COALESCE(at.total_adjustments, 0) - COALESCE(it.total_invoiced, 0) >= 0 THEN 'active'
          WHEN COALESCE(pt.total_paid, 0) + COALESCE(at.total_adjustments, 0) - COALESCE(it.total_invoiced, 0) < -100 THEN 'suspended'
          ELSE 'overdue'
        END as status,
        ab.last_payment_date,
        ab.last_invoice_date,
        ab.updated_at,
        CASE 
          WHEN ab.last_invoice_date IS NOT NULL 
          THEN EXTRACT(DAY FROM (ab.last_invoice_date + INTERVAL '30 days' - CURRENT_DATE))
          ELSE NULL 
        END as days_until_due,
        c.status as customer_status,
        COALESCE(sc.total_monthly_cost, 0) as monthly_service_cost,
        COALESCE(sc.active_services_count, 0) as active_services_count,
        COALESCE(pt.total_paid, 0) as total_payments,
        COALESCE(it.total_invoiced, 0) as total_invoices,
        COALESCE(at.total_adjustments, 0) as total_adjustments
      FROM customers c
      LEFT JOIN account_balances ab ON ab.customer_id = c.id
      LEFT JOIN service_costs sc ON sc.customer_id = c.id
      LEFT JOIN payment_totals pt ON pt.customer_id = c.id
      LEFT JOIN invoice_totals it ON it.customer_id = c.id
      LEFT JOIN adjustment_totals at ON at.customer_id = c.id
      LEFT JOIN outstanding_invoices oi ON oi.customer_id = c.id
      WHERE c.id = ${customerId}
    `

    console.log("[v0] Executing enhanced balance query for customer:", customerId)
    const balanceResult = await balanceQuery
    console.log("[v0] Balance query result:", balanceResult)

    if (balanceResult.length === 0) {
      console.log("[v0] No customer found")
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 })
    }

    const customerBalance = balanceResult[0]

    if (!customerBalance.id) {
      console.log("[v0] Creating initial account balance record")
      await sql`
        INSERT INTO account_balances (customer_id, balance, updated_at)
        VALUES (${customerId}, ${customerBalance.balance}, CURRENT_TIMESTAMP)
        ON CONFLICT (customer_id) DO UPDATE SET
          balance = ${customerBalance.balance},
          updated_at = CURRENT_TIMESTAMP
      `
    } else {
      await sql`
        UPDATE account_balances 
        SET balance = ${customerBalance.balance}, updated_at = CURRENT_TIMESTAMP
        WHERE customer_id = ${customerId}
      `
    }

    console.log("[v0] Returning calculated balance data:", customerBalance)
    return NextResponse.json({
      success: true,
      balance: {
        current_balance: customerBalance.balance,
        outstanding_balance: customerBalance.outstanding_balance,
        credit_limit: customerBalance.credit_limit || 0,
        status: customerBalance.status,
        last_payment_date: customerBalance.last_payment_date,
        next_due_date: customerBalance.last_invoice_date
          ? new Date(new Date(customerBalance.last_invoice_date).getTime() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0]
          : null,
        days_until_due: customerBalance.days_until_due,
        monthly_service_cost: customerBalance.monthly_service_cost,
        active_services_count: customerBalance.active_services_count,
        total_payments: customerBalance.total_payments,
        total_invoices: customerBalance.total_invoices,
        total_adjustments: customerBalance.total_adjustments,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching customer balance:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch balance" }, { status: 500 })
  }
}

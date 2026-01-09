import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { customer_ids, statement_type = "monthly", send_email = false } = await request.json()

    const results = []

    for (const customerId of customer_ids || []) {
      try {
        // Generate customer statement
        const endDate = new Date()
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 1)

        const statement = await generateCustomerStatement(customerId, startDate, endDate)

        if (send_email) {
          await sendStatementEmail(customerId, statement)
        }

        results.push({
          customer_id: customerId,
          success: true,
          statement_id: statement.id,
        })
      } catch (error) {
        console.error(`Error generating statement for customer ${customerId}:`, error)
        results.push({
          customer_id: customerId,
          success: false,
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      generated_count: results.filter((r) => r.success).length,
      failed_count: results.filter((r) => !r.success).length,
    })
  } catch (error) {
    console.error("Error in automated statement generation:", error)
    return NextResponse.json({ success: false, error: "Failed to generate statements" }, { status: 500 })
  }
}

async function generateCustomerStatement(customerId: number, startDate: Date, endDate: Date) {
  // Get customer information
  const [customer] = await sql`
    SELECT * FROM customers WHERE id = ${customerId}
  `

  if (!customer) {
    throw new Error(`Customer ${customerId} not found`)
  }

  // Get transactions for the period
  const transactions = await sql`
    SELECT 
      'invoice' as type,
      i.id,
      i.invoice_number as reference,
      i.invoice_date as date,
      i.amount,
      i.status,
      'Invoice for services' as description
    FROM invoices i
    WHERE i.customer_id = ${customerId}
      AND i.invoice_date >= ${startDate.toISOString()}
      AND i.invoice_date <= ${endDate.toISOString()}
    
    UNION ALL
    
    SELECT 
      'payment' as type,
      p.id,
      p.transaction_reference as reference,
      p.payment_date as date,
      -p.amount as amount,
      p.status,
      CONCAT('Payment via ', p.payment_method) as description
    FROM payments p
    WHERE p.customer_id = ${customerId}
      AND p.payment_date >= ${startDate.toISOString()}
      AND p.payment_date <= ${endDate.toISOString()}
    
    UNION ALL
    
    SELECT 
      'adjustment' as type,
      fa.id,
      fa.reference_number as reference,
      fa.created_at as date,
      CASE WHEN fa.adjustment_type = 'credit' THEN -fa.amount ELSE fa.amount END as amount,
      fa.status,
      fa.reason as description
    FROM financial_adjustments fa
    WHERE fa.customer_id = ${customerId}
      AND fa.created_at >= ${startDate.toISOString()}
      AND fa.created_at <= ${endDate.toISOString()}
    
    ORDER BY date DESC
  `

  // Calculate balances
  const openingBalance = await getCustomerBalance(customerId, startDate)
  const closingBalance = await getCustomerBalance(customerId, endDate)

  // Create statement record
  const [statement] = await sql`
    INSERT INTO customer_statements (
      customer_id, statement_date, period_start, period_end,
      opening_balance, closing_balance, transaction_count, created_at
    )
    VALUES (
      ${customerId}, ${endDate.toISOString()}, ${startDate.toISOString()}, ${endDate.toISOString()},
      ${openingBalance}, ${closingBalance}, ${transactions.length}, NOW()
    )
    RETURNING *
  `

  return {
    id: statement.id,
    customer,
    transactions,
    opening_balance: openingBalance,
    closing_balance: closingBalance,
    period: {
      start: startDate,
      end: endDate,
    },
  }
}

async function getCustomerBalance(customerId: number, asOfDate: Date) {
  const [result] = await sql`
    SELECT 
      COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_payments,
      COALESCE(SUM(CASE WHEN i.status != 'cancelled' THEN i.amount ELSE 0 END), 0) as total_invoices,
      COALESCE(SUM(CASE WHEN fa.adjustment_type = 'credit' THEN fa.amount ELSE -fa.amount END), 0) as total_adjustments
    FROM customers c
    LEFT JOIN payments p ON c.id = p.customer_id AND p.payment_date <= ${asOfDate.toISOString()}
    LEFT JOIN invoices i ON c.id = i.customer_id AND i.invoice_date <= ${asOfDate.toISOString()}
    LEFT JOIN financial_adjustments fa ON c.id = fa.customer_id AND fa.created_at <= ${asOfDate.toISOString()}
    WHERE c.id = ${customerId}
    GROUP BY c.id
  `

  if (!result) return 0

  return result.total_payments + result.total_adjustments - result.total_invoices
}

async function sendStatementEmail(customerId: number, statement: any) {
  // Log email activity
  await sql`
    INSERT INTO activity_logs (
      user_id, action, entity_type, entity_id, details, created_at
    )
    VALUES (
      1, 'statement_email_sent', 'customer', ${customerId},
      ${JSON.stringify({ statement_id: statement.id, period: statement.period })},
      NOW()
    )
  `
}

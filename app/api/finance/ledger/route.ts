import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const transactions = await sql`
      SELECT 
        'PAY-' || p.id as transaction_id,
        p.created_at as transaction_date,
        'Accounts Receivable' as account,
        'Payment received - ' || COALESCE(c.first_name || ' ' || c.last_name, c.business_name, 'Unknown Customer') as description,
        p.amount as debit,
        0 as credit,
        p.amount as balance,
        COALESCE(c.first_name || ' ' || c.last_name, c.business_name, 'Unknown Customer') as customer_name
      FROM payments p
      LEFT JOIN customers c ON c.id = p.customer_id
      WHERE p.status = 'completed'
      
      UNION ALL
      
      SELECT 
        'INV-' || i.id as transaction_id,
        i.created_at as transaction_date,
        'Revenue' as account,
        'Invoice - ' || COALESCE(c.first_name || ' ' || c.last_name, c.business_name, 'Unknown Customer') as description,
        0 as debit,
        i.amount as credit,
        0 as balance,
        COALESCE(c.first_name || ' ' || c.last_name, c.business_name, 'Unknown Customer') as customer_name
      FROM invoices i
      LEFT JOIN customers c ON c.id = i.customer_id
      
      UNION ALL
      
      SELECT 
        'EXP-' || e.id as transaction_id,
        e.created_at as transaction_date,
        COALESCE(ec.name, 'Uncategorized') as account,
        COALESCE(e.description, 'Expense') as description,
        e.amount as debit,
        0 as credit,
        e.amount as balance,
        null as customer_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON ec.id = e.category_id
      
      ORDER BY transaction_date DESC
      LIMIT 100
    `

    const balanceData = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_payments,
        COALESCE(SUM(i.amount), 0) as total_invoices,
        COALESCE(SUM(e.amount), 0) as total_expenses
      FROM payments p
      FULL OUTER JOIN invoices i ON true
      FULL OUTER JOIN expenses e ON true
    `

    const totalPayments = Number(balanceData[0]?.total_payments || 0)
    const totalInvoices = Number(balanceData[0]?.total_invoices || 0)
    const totalExpenses = Number(balanceData[0]?.total_expenses || 0)

    const accountBalances = {
      cash_and_bank: totalPayments - totalExpenses,
      accounts_receivable: totalInvoices - totalPayments,
      equipment_net: 850000, // Fixed asset value
      accounts_payable: totalExpenses * 0.1, // Estimated 10% unpaid
      accrued_expenses: totalExpenses * 0.05, // Estimated 5% accrued
      deferred_revenue: totalPayments * 0.1, // Estimated 10% deferred
      owners_equity: 1000000, // Fixed equity
      retained_earnings: totalPayments - totalExpenses - 100000, // Calculated retained earnings
    }

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        accountBalances,
      },
    })
  } catch (error) {
    console.error("Error fetching ledger data:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch ledger data" }, { status: 500 })
  }
}

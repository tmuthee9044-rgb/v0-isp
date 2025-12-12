import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sqlClient = await getSql()

    const searchParams = request.nextUrl.searchParams
    const asOfDateParam = searchParams.get("asOfDate")

    let asOfDate: string
    try {
      asOfDate = asOfDateParam
        ? new Date(asOfDateParam).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    } catch (dateError) {
      asOfDate = new Date().toISOString().split("T")[0]
    }

    const [
      accountsPayableResult,
      accountsReceivableResult,
      inventoryResult,
      cashResult,
      revenueResult,
      expensesResult,
    ] = await Promise.all([
      sqlClient`
        SELECT COALESCE(SUM(amount), 0) as accounts_payable
        FROM supplier_invoices
        WHERE status IN ('UNPAID', 'PARTIALLY_PAID', 'OVERDUE')
          AND invoice_date <= ${asOfDate}
      `,
      sqlClient`
        SELECT COALESCE(SUM(amount), 0) as accounts_receivable
        FROM invoices
        WHERE status IN ('pending', 'overdue', 'partially_paid')
          AND created_at <= ${asOfDate}
      `,
      sqlClient`
        SELECT COALESCE(SUM(stock_quantity * unit_cost), 0) as inventory_value
        FROM inventory_items
        WHERE status = 'active'
      `,
      sqlClient`
        SELECT COALESCE(SUM(amount), 0) as cash_balance
        FROM payments
        WHERE status = 'completed'
          AND payment_date <= ${asOfDate}
      `,
      sqlClient`
        SELECT COALESCE(SUM(amount), 0) as total_revenue
        FROM invoices
        WHERE status = 'paid' AND created_at <= ${asOfDate}
      `,
      sqlClient`
        SELECT COALESCE(SUM(amount), 0) as total_expenses
        FROM expenses
        WHERE status = 'approved' AND expense_date <= ${asOfDate}
      `,
    ])

    const operationalAccountsPayable = Number.parseFloat(accountsPayableResult[0]?.accounts_payable || 0)
    const operationalAccountsReceivable = Number.parseFloat(accountsReceivableResult[0]?.accounts_receivable || 0)
    const inventoryValue = Number.parseFloat(inventoryResult[0]?.inventory_value || 0)
    const operationalCashBalance = Number.parseFloat(cashResult[0]?.cash_balance || 0)
    const totalRevenue = Number.parseFloat(revenueResult[0]?.total_revenue || 0)
    const totalExpenses = Number.parseFloat(expensesResult[0]?.total_expenses || 0)
    const netIncome = totalRevenue - totalExpenses

    const totalCurrentAssets = operationalCashBalance + operationalAccountsReceivable + inventoryValue
    const totalFixedAssets = 0
    const totalAssets = totalCurrentAssets + totalFixedAssets

    const totalCurrentLiabilities = operationalAccountsPayable
    const totalLongTermLiabilities = 0
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities

    const totalEquity = totalAssets - totalLiabilities
    const capital = totalEquity - netIncome
    const retainedEarnings = netIncome

    const balanceSheetData = {
      success: true,
      data: {
        asOfDate,
        assets: {
          current: {
            cash_and_equivalents: operationalCashBalance,
            accounts_receivable: operationalAccountsReceivable,
            inventory: inventoryValue,
            total: totalCurrentAssets,
          },
          fixed: {
            equipment: 0,
            property: 0,
            vehicles: 0,
            total: totalFixedAssets,
          },
          total: totalAssets,
        },
        liabilities: {
          current: {
            accounts_payable: operationalAccountsPayable,
            short_term_debt: 0,
            total: totalCurrentLiabilities,
          },
          long_term: {
            long_term_debt: 0,
          },
          total: totalLiabilities,
        },
        equity: {
          capital: capital,
          retained_earnings: retainedEarnings,
          net_income: netIncome,
          total: totalEquity,
        },
        total_liabilities_and_equity: totalLiabilities + totalEquity,
      },
    }

    return NextResponse.json(balanceSheetData)
  } catch (error) {
    console.error("Balance sheet error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch balance sheet",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

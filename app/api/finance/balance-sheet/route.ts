import { type NextRequest, NextResponse } from "next/server"
import { sql, executeWithRetry } from "@/lib/db-client"

export async function GET(request: NextRequest) {
  try {
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

    const chartAccountsData = await executeWithRetry(
      () => sql`
      SELECT 
        account_type,
        account_name,
        COALESCE(SUM(
          CASE 
            WHEN account_type IN ('Asset', 'Expense') THEN jel.debit_amount - jel.credit_amount
            WHEN account_type IN ('Liability', 'Equity', 'Revenue') THEN jel.credit_amount - jel.debit_amount
            ELSE 0
          END
        ), 0) as balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
      WHERE je.entry_date <= ${asOfDate} OR je.entry_date IS NULL
      GROUP BY coa.account_type, coa.account_name
    `,
    )

    // Calculate totals from Chart of Accounts
    const chartAssets = chartAccountsData
      .filter((row: any) => row.account_type === "Asset")
      .reduce((sum: number, row: any) => sum + Number.parseFloat(row.balance || 0), 0)

    const chartLiabilities = chartAccountsData
      .filter((row: any) => row.account_type === "Liability")
      .reduce((sum: number, row: any) => sum + Number.parseFloat(row.balance || 0), 0)

    const chartEquity = chartAccountsData
      .filter((row: any) => row.account_type === "Equity")
      .reduce((sum: number, row: any) => sum + Number.parseFloat(row.balance || 0), 0)

    const [accountsPayableResult] = await executeWithRetry(
      () => sql`
      SELECT COALESCE(SUM(total_amount - paid_amount), 0) as accounts_payable
      FROM supplier_invoices
      WHERE status IN ('UNPAID', 'PARTIALLY_PAID', 'OVERDUE')
        AND invoice_date <= ${asOfDate}
    `,
    )

    const operationalAccountsPayable = Number.parseFloat(accountsPayableResult?.accounts_payable || 0)

    const [accountsReceivableResult] = await executeWithRetry(
      () => sql`
      SELECT COALESCE(SUM(amount - paid_amount), 0) as accounts_receivable
      FROM invoices
      WHERE status IN ('pending', 'overdue', 'partially_paid')
        AND created_at <= ${asOfDate}
    `,
    )

    const operationalAccountsReceivable = Number.parseFloat(accountsReceivableResult?.accounts_receivable || 0)

    const [inventoryResult] = await executeWithRetry(
      () => sql`
      SELECT COALESCE(SUM(stock_quantity * unit_cost), 0) as inventory_value
      FROM inventory_items
      WHERE status = 'active'
    `,
    )

    const inventoryValue = Number.parseFloat(inventoryResult?.inventory_value || 0)

    const [cashResult] = await executeWithRetry(
      () => sql`
      SELECT COALESCE(SUM(amount), 0) as cash_balance
      FROM payments
      WHERE status = 'completed'
        AND payment_date <= ${asOfDate}
    `,
    )

    const operationalCashBalance = Number.parseFloat(cashResult?.cash_balance || 0)

    const [profitResult] = await executeWithRetry(
      () => sql`
      SELECT 
        COALESCE(SUM(i.amount), 0) as total_revenue,
        COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.status = 'approved' AND e.expense_date <= ${asOfDate}), 0) as total_expenses
      FROM invoices i
      WHERE i.status = 'paid'
        AND i.created_at <= ${asOfDate}
    `,
    )

    const totalRevenue = Number.parseFloat(profitResult?.total_revenue || 0)
    const totalExpenses = Number.parseFloat(profitResult?.total_expenses || 0)
    const netIncome = totalRevenue - totalExpenses

    const totalCurrentAssets = Math.max(
      chartAssets,
      operationalCashBalance + operationalAccountsReceivable + inventoryValue,
    )
    const totalFixedAssets = 0 // Can be updated when fixed assets are tracked
    const totalAssets = totalCurrentAssets + totalFixedAssets

    const totalCurrentLiabilities = Math.max(chartLiabilities, operationalAccountsPayable)
    const totalLongTermLiabilities = 0 // Can be updated when long-term debt is tracked
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities

    const totalEquity = Math.max(chartEquity, totalAssets - totalLiabilities)
    const capital = totalEquity - netIncome
    const retainedEarnings = netIncome

    const balanceSheetData = {
      success: true,
      data: {
        asOfDate,
        assets: {
          current: {
            cash_and_equivalents: Math.max(
              chartAccountsData.find((r: any) => r.account_name?.toLowerCase().includes("cash"))?.balance || 0,
              operationalCashBalance,
            ),
            accounts_receivable: Math.max(
              chartAccountsData.find((r: any) => r.account_name?.toLowerCase().includes("receivable"))?.balance || 0,
              operationalAccountsReceivable,
            ),
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
            accounts_payable: Math.max(
              chartAccountsData.find((r: any) => r.account_name?.toLowerCase().includes("payable"))?.balance || 0,
              operationalAccountsPayable,
            ),
            short_term_debt:
              chartAccountsData.find(
                (r: any) => r.account_name?.toLowerCase().includes("short") && r.account_type === "Liability",
              )?.balance || 0,
            total: totalCurrentLiabilities,
          },
          long_term: {
            long_term_debt:
              chartAccountsData.find(
                (r: any) => r.account_name?.toLowerCase().includes("long") && r.account_type === "Liability",
              )?.balance || 0,
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

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { accountId: string } }) {
  try {
    const accountId = Number.parseInt(params.accountId)
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    console.log("[v0] Fetching ledger for account:", accountId, { startDate, endDate })

    // Get account details
    const accountResult = await sql`
      SELECT account_code, account_name, account_type
      FROM chart_of_accounts
      WHERE id = ${accountId}
    `

    if (accountResult.length === 0) {
      return NextResponse.json({ message: "Account not found" }, { status: 404 })
    }

    const account = accountResult[0]

    let ledgerEntries

    if (startDate && endDate) {
      ledgerEntries = await sql`
        SELECT 
          je.entry_date as transaction_date,
          je.entry_number,
          jel.description,
          jel.debit_amount,
          jel.credit_amount,
          je.status
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE jel.account_id = ${accountId}
          AND je.entry_date >= ${startDate}
          AND je.entry_date <= ${endDate}
        ORDER BY je.entry_date, je.id, jel.line_number
      `
    } else if (startDate) {
      ledgerEntries = await sql`
        SELECT 
          je.entry_date as transaction_date,
          je.entry_number,
          jel.description,
          jel.debit_amount,
          jel.credit_amount,
          je.status
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE jel.account_id = ${accountId}
          AND je.entry_date >= ${startDate}
        ORDER BY je.entry_date, je.id, jel.line_number
      `
    } else if (endDate) {
      ledgerEntries = await sql`
        SELECT 
          je.entry_date as transaction_date,
          je.entry_number,
          jel.description,
          jel.debit_amount,
          jel.credit_amount,
          je.status
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE jel.account_id = ${accountId}
          AND je.entry_date <= ${endDate}
        ORDER BY je.entry_date, je.id, jel.line_number
      `
    } else {
      ledgerEntries = await sql`
        SELECT 
          je.entry_date as transaction_date,
          je.entry_number,
          jel.description,
          jel.debit_amount,
          jel.credit_amount,
          je.status
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE jel.account_id = ${accountId}
        ORDER BY je.entry_date, je.id, jel.line_number
      `
    }

    // Calculate running balance
    let runningBalance = 0
    const entriesWithBalance = ledgerEntries.map((entry: any) => {
      const debit = Number.parseFloat(entry.debit_amount || 0)
      const credit = Number.parseFloat(entry.credit_amount || 0)
      runningBalance += debit - credit
      return {
        ...entry,
        running_balance: runningBalance,
      }
    })

    console.log("[v0] Fetched ledger entries:", entriesWithBalance.length)

    return NextResponse.json({
      account,
      entries: entriesWithBalance,
      total_debits: ledgerEntries.reduce((sum: number, e: any) => sum + Number.parseFloat(e.debit_amount || 0), 0),
      total_credits: ledgerEntries.reduce((sum: number, e: any) => sum + Number.parseFloat(e.credit_amount || 0), 0),
      current_balance: runningBalance,
    })
  } catch (error) {
    console.error("[v0] Error fetching ledger:", error)
    return NextResponse.json({ message: "Failed to fetch ledger", error: String(error) }, { status: 500 })
  }
}

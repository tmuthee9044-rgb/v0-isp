import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const asOfDateParam = searchParams.get("asOfDate")
    const asOfDate = asOfDateParam
      ? new Date(asOfDateParam).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]

    const accounts = await sql`
      SELECT 
        coa.account_code,
        coa.account_name,
        coa.account_type,
        COALESCE(SUM(jel.debit_amount), 0) as debit_total,
        COALESCE(SUM(jel.credit_amount), 0) as credit_total,
        COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE coa.is_active = true
      AND (je.entry_date IS NULL OR je.entry_date <= ${asOfDate}::date)
      AND (je.status IS NULL OR je.status = 'posted')
      GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
      HAVING COALESCE(SUM(jel.debit_amount), 0) != 0 OR COALESCE(SUM(jel.credit_amount), 0) != 0
      ORDER BY coa.account_code, coa.account_name
    `

    let totalDebits = 0
    let totalCredits = 0

    const formattedAccounts = accounts.map((account) => {
      const debit = Number(account.debit_total) || 0
      const credit = Number(account.credit_total) || 0

      totalDebits += debit
      totalCredits += credit

      return {
        account_code: account.account_code,
        account_name: account.account_name,
        account_type: account.account_type,
        debit,
        credit,
        balance: Number(account.balance) || 0,
      }
    })

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01

    return NextResponse.json({
      success: true,
      data: {
        asOfDate,
        accounts: formattedAccounts,
        totals: {
          debits: totalDebits,
          credits: totalCredits,
          difference: totalDebits - totalCredits,
          isBalanced,
        },
      },
    })
  } catch (error) {
    console.error("Error fetching trial balance:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch trial balance" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description, entries, entry_date } = body

    if (!entries || !Array.isArray(entries) || entries.length < 2) {
      return NextResponse.json(
        { success: false, error: "At least two entries required for double-entry bookkeeping" },
        { status: 400 },
      )
    }

    // Validate debits equal credits
    const totalDebits = entries.reduce((sum, e) => sum + (e.debit || 0), 0)
    const totalCredits = entries.reduce((sum, e) => sum + (e.credit || 0), 0)

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return NextResponse.json({ success: false, error: "Debits must equal credits" }, { status: 400 })
    }

    // Create journal entry
    const entryNumber = `MAN-${Date.now()}`
    const [journalEntry] = await sql`
      INSERT INTO journal_entries (
        entry_number,
        entry_date,
        description,
        total_debit,
        total_credit,
        status,
        reference_type,
        created_by
      ) VALUES (
        ${entryNumber},
        ${entry_date || new Date().toISOString()},
        ${description},
        ${totalDebits},
        ${totalCredits},
        'posted',
        'manual',
        1
      )
      RETURNING id
    `

    // Create journal entry lines
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      await sql`
        INSERT INTO journal_entry_lines (
          journal_entry_id,
          account_id,
          line_number,
          debit_amount,
          credit_amount,
          description
        ) VALUES (
          ${journalEntry.id},
          ${entry.account_id},
          ${i + 1},
          ${entry.debit || 0},
          ${entry.credit || 0},
          ${entry.description || description}
        )
      `
    }

    return NextResponse.json({
      success: true,
      data: { entry_id: journalEntry.id, entry_number: entryNumber },
    })
  } catch (error) {
    console.error("Error creating journal entry:", error)
    return NextResponse.json({ success: false, error: "Failed to create journal entry" }, { status: 500 })
  }
}

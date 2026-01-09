import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    console.log("[v0] Fetching accounts, type filter:", type)

    let accounts
    if (type) {
      accounts = await sql`
        SELECT 
          id,
          account_code,
          account_name,
          account_type,
          description,
          is_active,
          parent_account_id,
          created_at,
          COALESCE((
            SELECT SUM(COALESCE(debit_amount, 0) - COALESCE(credit_amount, 0))
            FROM journal_entry_lines jel
            WHERE jel.account_id = coa.id
          ), 0) as current_balance
        FROM chart_of_accounts coa
        WHERE account_type = ${type}
        ORDER BY account_code, account_name
      `
    } else {
      accounts = await sql`
        SELECT 
          id,
          account_code,
          account_name,
          account_type,
          description,
          is_active,
          parent_account_id,
          created_at,
          COALESCE((
            SELECT SUM(COALESCE(debit_amount, 0) - COALESCE(credit_amount, 0))
            FROM journal_entry_lines jel
            WHERE jel.account_id = coa.id
          ), 0) as current_balance
        FROM chart_of_accounts coa
        ORDER BY account_code, account_name
      `
    }

    console.log("[v0] Fetched accounts:", accounts.length)

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error("[v0] Error fetching accounts:", error)
    return NextResponse.json({ message: "Failed to fetch accounts", error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { account_name, account_type, description, opening_balance = 0, account_code } = body

    console.log("[v0] Creating account:", { account_name, account_type, opening_balance })

    // Validate required fields
    if (!account_name || !account_type) {
      return NextResponse.json({ message: "Missing required fields: account_name, account_type" }, { status: 400 })
    }

    // Generate account code if not provided
    const generatedCode = account_code || `ACC-${Date.now()}`

    // Insert account
    const accountResult = await sql`
      INSERT INTO chart_of_accounts (
        account_code, account_name, account_type, description, is_active, created_at
      )
      VALUES (
        ${generatedCode}, ${account_name}, ${account_type}, ${description || null}, true, NOW()
      )
      RETURNING id, account_code, account_name, account_type, description, created_at
    `

    const newAccount = accountResult[0]
    console.log("[v0] Account created:", newAccount.id)

    // Create opening balance journal entry if opening_balance > 0
    if (opening_balance && opening_balance !== 0) {
      const journalEntry = await sql`
        INSERT INTO journal_entries (
          entry_number, entry_date, description, total_debit, total_credit, status, created_at
        )
        VALUES (
          ${"JE-" + Date.now()}, CURRENT_DATE, ${"Opening Balance for " + account_name},
          ${account_type === "Asset" ? Math.abs(opening_balance) : 0},
          ${account_type === "Asset" ? 0 : Math.abs(opening_balance)},
          'posted', NOW()
        )
        RETURNING id
      `

      const journalEntryId = journalEntry[0].id

      // Create journal entry line
      await sql`
        INSERT INTO journal_entry_lines (
          journal_entry_id, account_id, description, debit_amount, credit_amount, line_number, created_at
        )
        VALUES (
          ${journalEntryId}, ${newAccount.id}, ${"Opening Balance"},
          ${account_type === "Asset" ? Math.abs(opening_balance) : 0},
          ${account_type === "Asset" ? 0 : Math.abs(opening_balance)},
          1, NOW()
        )
      `

      console.log("[v0] Opening balance journal entry created")
    }

    return NextResponse.json({ account: newAccount }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating account:", error)
    return NextResponse.json({ message: "Failed to create account", error: String(error) }, { status: 500 })
  }
}

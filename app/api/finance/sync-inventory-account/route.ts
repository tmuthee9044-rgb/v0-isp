import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Syncing inventory account")

    // Get total inventory value
    const inventoryResult = await sql`
      SELECT COALESCE(SUM(stock_quantity * unit_cost), 0) as total_value
      FROM inventory_items
      WHERE status = 'active'
    `

    const totalInventoryValue = Number.parseFloat(inventoryResult[0].total_value || 0)
    console.log("[v0] Current inventory value:", totalInventoryValue)

    // Find or create "Inventory (Auto)" account
    let autoAccount = await sql`
      SELECT id FROM chart_of_accounts
      WHERE account_name = 'Inventory (Auto)' AND account_type = 'Asset'
    `

    if (autoAccount.length === 0) {
      console.log("[v0] Creating Inventory (Auto) account")
      autoAccount = await sql`
        INSERT INTO chart_of_accounts (
          account_code, account_name, account_type, description, is_active, created_at
        )
        VALUES (
          'INV-AUTO', 'Inventory (Auto)', 'Asset',
          'Automatically calculated inventory value from stock', true, NOW()
        )
        RETURNING id
      `
    }

    const accountId = autoAccount[0].id

    // Get current account balance
    const balanceResult = await sql`
      SELECT COALESCE(SUM(COALESCE(debit_amount, 0) - COALESCE(credit_amount, 0)), 0) as balance
      FROM journal_entry_lines
      WHERE account_id = ${accountId}
    `

    const currentBalance = Number.parseFloat(balanceResult[0].balance || 0)
    console.log("[v0] Current account balance:", currentBalance)

    const difference = totalInventoryValue - currentBalance

    if (Math.abs(difference) > 0.01) {
      console.log("[v0] Adjustment needed:", difference)

      // Create adjustment journal entry
      const journalEntry = await sql`
        INSERT INTO journal_entries (
          entry_number, entry_date, description, 
          total_debit, total_credit, status, created_at
        )
        VALUES (
          ${"JE-INV-" + Date.now()}, CURRENT_DATE, 'Inventory Adjustment (Auto-sync)',
          ${difference > 0 ? Math.abs(difference) : 0},
          ${difference < 0 ? Math.abs(difference) : 0},
          'posted', NOW()
        )
        RETURNING id
      `

      const journalEntryId = journalEntry[0].id

      // Create journal entry line
      await sql`
        INSERT INTO journal_entry_lines (
          journal_entry_id, account_id, description,
          debit_amount, credit_amount, line_number, created_at
        )
        VALUES (
          ${journalEntryId}, ${accountId}, 'Inventory value adjustment',
          ${difference > 0 ? Math.abs(difference) : 0},
          ${difference < 0 ? Math.abs(difference) : 0},
          1, NOW()
        )
      `

      console.log("[v0] Inventory account synced successfully")
    } else {
      console.log("[v0] No adjustment needed, balance is accurate")
    }

    return NextResponse.json({
      message: "Inventory account synced successfully",
      inventory_value: totalInventoryValue,
      previous_balance: currentBalance,
      adjustment: difference,
    })
  } catch (error) {
    console.error("[v0] Error syncing inventory account:", error)
    return NextResponse.json({ message: "Failed to sync inventory account", error: String(error) }, { status: 500 })
  }
}

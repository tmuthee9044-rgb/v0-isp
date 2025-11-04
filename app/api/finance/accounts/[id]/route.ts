import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const accountId = Number.parseInt(params.id)
    const body = await request.json()
    const { account_name, description } = body

    console.log("[v0] Updating account:", accountId)

    const result = await sql`
      UPDATE chart_of_accounts
      SET 
        account_name = ${account_name},
        description = ${description || null}
      WHERE id = ${accountId}
      RETURNING id, account_code, account_name, account_type, description
    `

    if (result.length === 0) {
      return NextResponse.json({ message: "Account not found" }, { status: 404 })
    }

    console.log("[v0] Account updated successfully")
    return NextResponse.json({ account: result[0] })
  } catch (error) {
    console.error("[v0] Error updating account:", error)
    return NextResponse.json({ message: "Failed to update account", error: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const accountId = Number.parseInt(params.id)

    console.log("[v0] Deleting account:", accountId)

    // Check if account has transactions
    const transactions = await sql`
      SELECT COUNT(*) as count
      FROM journal_entry_lines
      WHERE account_id = ${accountId}
    `

    if (transactions[0].count > 0) {
      return NextResponse.json(
        { message: "Cannot delete account with existing transactions. Please deactivate instead." },
        { status: 400 },
      )
    }

    await sql`
      DELETE FROM chart_of_accounts
      WHERE id = ${accountId}
    `

    console.log("[v0] Account deleted successfully")
    return NextResponse.json({ message: "Account deleted successfully" })
  } catch (error) {
    console.error("[v0] Error deleting account:", error)
    return NextResponse.json({ message: "Failed to delete account", error: String(error) }, { status: 500 })
  }
}

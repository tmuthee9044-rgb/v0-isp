import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const transactions = await sql`
      SELECT 
        p.id,
        p.transaction_id,
        CASE 
          WHEN p.amount > 0 THEN 'credit'
          ELSE 'debit'
        END as type,
        p.payment_date as date,
        p.amount,
        p.payment_method,
        p.transaction_id as reference,
        p.status
      FROM payments p
      WHERE p.customer_id = ${customerId}
      ORDER BY p.payment_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const [{ count }] = await sql`
      SELECT COUNT(*) as count FROM payments WHERE customer_id = ${customerId}
    `

    // Calculate running balance for the current page
    let runningBalance = 0
    const transactionsWithBalance = transactions
      .map((transaction) => {
        runningBalance += transaction.amount
        return {
          ...transaction,
          running_balance: runningBalance,
        }
      })
      .reverse()

    return NextResponse.json(
      {
        success: true,
        transactions: transactionsWithBalance.reverse(),
        pagination: {
          total: Number(count),
          limit,
          offset,
          hasMore: offset + transactions.length < Number(count),
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      },
    )
  } catch (error) {
    console.error("Error fetching customer transactions:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch transactions" }, { status: 500 })
  }
}

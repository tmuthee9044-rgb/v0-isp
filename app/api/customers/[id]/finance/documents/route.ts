import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    console.log("[v0] Fetching finance documents for customer:", customerId, "limit:", limit, "offset:", offset)

    const documents = await sql`
      SELECT 
        'invoice' as type,
        id,
        invoice_number as reference_number,
        'Invoice' as description,
        amount as total_amount,
        status,
        created_at,
        due_date,
        NULL as notes
      FROM invoices
      WHERE customer_id = ${customerId}
      
      UNION ALL
      
      SELECT 
        'credit_note' as type,
        id,
        credit_note_number as reference_number,
        reason as description,
        amount as total_amount,
        status,
        created_at,
        NULL as due_date,
        notes
      FROM credit_notes
      WHERE customer_id = ${customerId}
      
      UNION ALL
      
      SELECT 
        'payment' as type,
        id,
        transaction_id as reference_number,
        'Payment via ' || COALESCE(payment_method, 'Unknown') as description,
        amount as total_amount,
        status,
        payment_date as created_at,
        NULL as due_date,
        NULL as notes
      FROM payments
      WHERE customer_id = ${customerId}
      
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const [countResult] = await sql`
      SELECT 
        (SELECT COUNT(*) FROM invoices WHERE customer_id = ${customerId}) +
        (SELECT COUNT(*) FROM credit_notes WHERE customer_id = ${customerId}) +
        (SELECT COUNT(*) FROM payments WHERE customer_id = ${customerId}) as total
    `

    console.log("[v0] Successfully fetched", documents.length, "finance documents of", countResult.total, "total")

    return NextResponse.json(
      {
        success: true,
        documents,
        pagination: {
          total: Number(countResult.total),
          limit,
          offset,
          hasMore: offset + documents.length < Number(countResult.total),
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      },
    )
  } catch (error) {
    console.error("[v0] Error fetching finance documents:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch finance documents",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

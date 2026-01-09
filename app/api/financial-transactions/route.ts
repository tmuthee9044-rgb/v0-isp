import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const supplierId = searchParams.get("supplier_id")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    let whereClause = "WHERE 1=1"
    const params: any[] = []
    let paramIndex = 1

    if (type) {
      whereClause += ` AND ft.transaction_type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }

    if (supplierId) {
      whereClause += ` AND ft.supplier_id = $${paramIndex}`
      params.push(Number.parseInt(supplierId))
      paramIndex++
    }

    const query = `
      SELECT 
        ft.*,
        s.name as supplier_name,
        po.id as purchase_order_number
      FROM financial_transactions ft
      LEFT JOIN suppliers s ON ft.supplier_id = s.id
      LEFT JOIN purchase_orders po ON ft.purchase_order_id = po.id
      ${whereClause}
      ORDER BY ft.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    params.push(limit, offset)
    const transactions = await sql(query, params)

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        transaction_type,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM financial_transactions ft
      ${whereClause}
      GROUP BY transaction_type
    `
    const summary = await sql(summaryQuery, params.slice(0, -2))

    return NextResponse.json({
      success: true,
      data: transactions,
      summary,
      pagination: {
        page,
        limit,
        total: transactions.length,
      },
    })
  } catch (error) {
    console.error("Error fetching financial transactions:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch financial transactions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { purchase_order_id, supplier_id, transaction_type, amount, description, reference_number } = body

    if (!transaction_type || !amount) {
      return NextResponse.json({ success: false, error: "Transaction type and amount are required" }, { status: 400 })
    }

    const [transaction] = await sql`
      INSERT INTO financial_transactions (
        purchase_order_id, 
        supplier_id, 
        transaction_type, 
        amount, 
        description,
        reference_number
      )
      VALUES (
        ${purchase_order_id || null}, 
        ${supplier_id || null}, 
        ${transaction_type}, 
        ${amount}, 
        ${description || ""},
        ${reference_number || ""}
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: transaction,
    })
  } catch (error) {
    console.error("Error creating financial transaction:", error)
    return NextResponse.json({ success: false, error: "Failed to create financial transaction" }, { status: 500 })
  }
}

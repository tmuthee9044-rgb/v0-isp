import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taxType, taxPeriod, amount, dueDate, status, penalty, taxAuthority, referenceNumber, notes } = body

    // Validate required fields
    if (!taxType || !taxPeriod || !amount || !dueDate || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    let periodId = null

    // Try to find existing tax period
    const existingPeriod = await sql`
      SELECT id FROM tax_periods WHERE period_name = ${taxPeriod}
    `

    if (existingPeriod.length > 0) {
      periodId = existingPeriod[0].id
    } else {
      // Create new tax period if it doesn't exist
      const newPeriod = await sql`
        INSERT INTO tax_periods (period_name, start_date, end_date, status)
        VALUES (
          ${taxPeriod},
          DATE_TRUNC('year', CURRENT_DATE),
          DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day',
          'open'
        )
        RETURNING id
      `
      periodId = newPeriod[0].id
    }

    // Insert tax record into database using period_id instead of period_name
    const result = await sql`
      INSERT INTO tax_returns (
        return_type,
        period_id,
        tax_due,
        due_date,
        status,
        penalty_amount,
        tax_authority,
        reference_number,
        notes,
        created_at
      ) VALUES (
        ${taxType},
        ${periodId},
        ${Number.parseFloat(amount)},
        ${dueDate},
        ${status},
        ${penalty ? Number.parseFloat(penalty) : 0},
        ${taxAuthority || ""},
        ${referenceNumber || ""},
        ${notes || ""},
        CURRENT_TIMESTAMP
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: result[0],
    })
  } catch (error) {
    console.error("Error creating tax record:", error)
    return NextResponse.json({ error: "Failed to create tax record" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const taxRecords = await sql`
      SELECT 
        tr.id,
        tr.return_type,
        tp.period_name,
        tr.tax_due,
        tr.due_date,
        tr.status,
        tr.penalty_amount,
        tr.tax_authority,
        tr.reference_number,
        tr.notes,
        tr.filed_date,
        tr.created_at
      FROM tax_returns tr
      LEFT JOIN tax_periods tp ON tr.period_id = tp.id
      ORDER BY tr.created_at DESC
    `

    return NextResponse.json({
      success: true,
      data: taxRecords,
    })
  } catch (error) {
    console.error("Error fetching tax records:", error)
    return NextResponse.json({ error: "Failed to fetch tax records" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { status, filed_date } = body

    if (status === "filed") {
      // Get the tax record details
      const [taxRecord] = await sql`
        SELECT * FROM tax_returns WHERE id = ${id}
      `

      if (!taxRecord) {
        return NextResponse.json({ error: "Tax record not found" }, { status: 404 })
      }

      // Create an expense for the tax payment
      const [expense] = await sql`
        INSERT INTO expenses (
          description,
          amount,
          expense_date,
          category_id,
          payment_method,
          status,
          notes,
          created_at
        )
        VALUES (
          ${`${taxRecord.return_type} Tax Payment - ${taxRecord.reference_number}`},
          ${taxRecord.tax_due},
          ${filed_date || new Date().toISOString()},
          (SELECT id FROM expense_categories WHERE name = 'Taxes' LIMIT 1),
          'Bank Transfer',
          'paid',
          ${`Tax payment for period ${taxRecord.period_id}. Filed on ${filed_date || new Date().toISOString()}`},
          NOW()
        )
        RETURNING *
      `

      // Log the tax payment
      await sql`
        INSERT INTO admin_logs (
          action,
          resource_type,
          resource_id,
          new_values,
          ip_address,
          created_at
        )
        VALUES (
          'tax_payment_created',
          'expense',
          ${expense.id},
          ${JSON.stringify({
            tax_record_id: id,
            reference_number: taxRecord.reference_number,
            amount: taxRecord.tax_due,
            return_type: taxRecord.return_type,
          })},
          NULL,
          NOW()
        )
      `
    }

    // Update the tax record
    const [updatedRecord] = await sql`
      UPDATE tax_returns
      SET 
        status = ${status},
        filed_date = ${filed_date || null}
      WHERE id = ${id}
      RETURNING *
    `

    // Log the update
    await sql`
      INSERT INTO admin_logs (
        action,
        resource_type,
        resource_id,
        new_values,
        ip_address,
        created_at
      )
      VALUES (
        'tax_record_updated',
        'tax_return',
        ${id},
        ${JSON.stringify({ status, filed_date })},
        NULL,
        NOW()
      )
    `

    return NextResponse.json({ success: true, record: updatedRecord })
  } catch (error) {
    console.error("Error updating tax record:", error)
    return NextResponse.json({ error: "Failed to update tax record" }, { status: 500 })
  }
}

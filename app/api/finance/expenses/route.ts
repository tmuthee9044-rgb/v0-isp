import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    let dateFilter = sql``
    if (startDate && endDate) {
      dateFilter = sql`WHERE e.expense_date >= ${startDate} AND e.expense_date <= ${endDate}`
    }

    const expenses = await sql`
      SELECT 
        e.*,
        ec.name as category_name,
        ec.color as category_color
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      ${dateFilter}
      ORDER BY e.expense_date DESC
      LIMIT 50
    `

    return NextResponse.json({ expenses })
  } catch (error) {
    console.error("Error fetching expenses:", error)
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json()
    console.log("[v0] Received expense creation request:", requestData)

    const {
      category_id,
      amount,
      description,
      vendor,
      expense_date,
      payment_method,
      status,
      notes,
      receipt_url,
      supplier_invoice_id,
    } = requestData

    console.log("[v0] Validating expense data:", {
      category_id,
      category_id_type: typeof category_id,
      amount,
      amount_type: typeof amount,
      description,
      expense_date,
      expense_date_type: typeof expense_date,
      payment_method,
      status,
      vendor,
      notes,
      supplier_invoice_id,
    })

    if (!category_id || !amount || !description) {
      console.error("[v0] Validation failed - missing required fields:", {
        category_id: !!category_id,
        amount: !!amount,
        description: !!description,
      })
      return NextResponse.json({ error: "Category, amount, and description are required" }, { status: 400 })
    }

    const insertData = {
      category_id,
      amount,
      description,
      vendor: vendor || "",
      expense_date: expense_date || new Date().toISOString().split("T")[0],
      payment_method: payment_method || "bank",
      status: status || "paid",
      notes: notes || "",
      receipt_url: receipt_url || null,
    }
    console.log("[v0] Data being inserted into database:", insertData)

    const [expense] = await sql`
      INSERT INTO expenses (
        category_id, 
        amount, 
        description, 
        vendor, 
        expense_date, 
        payment_method, 
        status, 
        notes,
        receipt_url
      )
      VALUES (
        ${category_id}, 
        ${amount}, 
        ${description}, 
        ${vendor || ""}, 
        ${expense_date || new Date().toISOString().split("T")[0]}, 
        ${payment_method || "bank"}, 
        ${status || "paid"}, 
        ${notes || ""},
        ${receipt_url || null}
      )
      RETURNING *
    `

    console.log("[v0] Expense successfully inserted into database:", expense)

    if (supplier_invoice_id && status === "paid") {
      console.log("[v0] Updating supplier invoice payment status for invoice ID:", supplier_invoice_id)

      try {
        // Get current invoice details
        const [invoice] = await sql`
          SELECT * FROM supplier_invoices WHERE id = ${supplier_invoice_id}
        `

        if (invoice) {
          const newPaidAmount = Number(invoice.paid_amount || 0) + Number(amount)
          const totalAmount = Number(invoice.total_amount)

          // Determine new status
          let newStatus = "UNPAID"
          if (newPaidAmount >= totalAmount) {
            newStatus = "PAID"
          } else if (newPaidAmount > 0) {
            newStatus = "PARTIALLY_PAID"
          }

          console.log("[v0] Updating invoice:", {
            invoice_id: supplier_invoice_id,
            old_paid_amount: invoice.paid_amount,
            payment_amount: amount,
            new_paid_amount: newPaidAmount,
            total_amount: totalAmount,
            new_status: newStatus,
          })

          // Update the invoice
          await sql`
            UPDATE supplier_invoices
            SET 
              paid_amount = ${newPaidAmount},
              status = ${newStatus},
              updated_at = NOW()
            WHERE id = ${supplier_invoice_id}
          `

          console.log("[v0] Supplier invoice updated successfully")

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
              'supplier_invoice_payment',
              'supplier_invoice',
              ${supplier_invoice_id},
              ${JSON.stringify({
                expense_id: expense.id,
                payment_amount: amount,
                new_paid_amount: newPaidAmount,
                new_status: newStatus,
                payment_method,
                vendor,
              })},
              NULL,
              NOW()
            )
          `

          console.log("[v0] Payment activity logged to admin_logs")
        }
      } catch (invoiceError) {
        console.error("[v0] Error updating supplier invoice:", invoiceError)
        // Don't fail the expense creation if invoice update fails
      }
    }

    return NextResponse.json({ expense })
  } catch (error) {
    console.error("[v0] Error creating expense:", error)
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 })
  }
}

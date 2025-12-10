import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const sqlInstance = await getSql()

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    let query
    if (startDate && endDate) {
      query = sqlInstance`
        SELECT 
          e.*,
          ec.name as category_name,
          ec.color as category_color
        FROM expenses e
        LEFT JOIN expense_categories ec ON e.category_id = ec.id
        WHERE e.expense_date >= ${startDate} AND e.expense_date <= ${endDate}
        ORDER BY e.expense_date DESC
        LIMIT 50
      `
    } else {
      query = sqlInstance`
        SELECT 
          e.*,
          ec.name as category_name,
          ec.color as category_color
        FROM expenses e
        LEFT JOIN expense_categories ec ON e.category_id = ec.id
        ORDER BY e.expense_date DESC
        LIMIT 50
      `
    }

    const expenses = await query

    return NextResponse.json({ expenses })
  } catch (error) {
    console.error("Error fetching expenses:", error)
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sqlInstance = await getSql()

    const requestData = await request.json()

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

    if (!category_id || !amount || !description) {
      return NextResponse.json({ error: "Category, amount, and description are required" }, { status: 400 })
    }

    const [expense] = await sqlInstance`
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

    if (supplier_invoice_id && status === "paid") {
      try {
        const [invoice] = await sqlInstance`
          SELECT * FROM supplier_invoices WHERE id = ${supplier_invoice_id}
        `

        if (invoice) {
          const newPaidAmount = Number(invoice.paid_amount || 0) + Number(amount)
          const totalAmount = Number(invoice.total_amount)

          let newStatus = "UNPAID"
          if (newPaidAmount >= totalAmount) {
            newStatus = "PAID"
          } else if (newPaidAmount > 0) {
            newStatus = "PARTIALLY_PAID"
          }

          await sqlInstance`
            UPDATE supplier_invoices
            SET 
              paid_amount = ${newPaidAmount},
              status = ${newStatus},
              updated_at = NOW()
            WHERE id = ${supplier_invoice_id}
          `

          await sqlInstance`
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
        }
      } catch (invoiceError) {
        console.error("Error updating supplier invoice:", invoiceError)
      }
    }

    return NextResponse.json({ expense })
  } catch (error) {
    console.error("Error creating expense:", error)
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 })
  }
}

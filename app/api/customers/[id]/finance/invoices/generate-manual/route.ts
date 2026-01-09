import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { items, notes, due_date } = await request.json()

    console.log("[v0] Generating manual invoice for customer:", customerId)
    console.log("[v0] Invoice items:", items)

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: "At least one item is required" }, { status: 400 })
    }

    const validItems = items.filter((item: any) => item.description?.trim() && item.quantity > 0 && item.unit_price > 0)

    if (validItems.length === 0) {
      return NextResponse.json({ success: false, error: "No valid items found" }, { status: 400 })
    }

    const totalAmount = validItems.reduce(
      (sum: number, item: any) => sum + (item.total || item.quantity * item.unit_price),
      0,
    )
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

    const defaultDueDate = new Date()
    defaultDueDate.setDate(defaultDueDate.getDate() + 30)
    const finalDueDate = due_date || defaultDueDate.toISOString().split("T")[0]

    console.log("[v0] Creating invoice:", { invoiceNumber, customerId, totalAmount, finalDueDate })

    const [invoice] = await sql`
      INSERT INTO invoices (
        invoice_number, 
        customer_id, 
        amount, 
        status, 
        due_date,
        created_at
      )
      VALUES (
        ${invoiceNumber}, 
        ${customerId}, 
        ${totalAmount}, 
        'pending', 
        ${finalDueDate},
        NOW()
      )
      RETURNING *
    `

    console.log("[v0] Invoice created successfully:", invoice.id)

    try {
      const itemInserts = validItems.map(
        (item: any) =>
          sql`
          INSERT INTO invoice_items (
            invoice_id, description, quantity, unit_price, total_amount
          )
          VALUES (
            ${invoice.id}, ${item.description}, ${item.quantity}, ${item.unit_price}, ${item.total || item.quantity * item.unit_price}
          )
        `,
      )

      await Promise.all(itemInserts)
      console.log("[v0] Invoice items created successfully")
    } catch (itemError) {
      console.error("[v0] Error creating invoice items (table may not exist):", itemError)
      // Continue even if invoice items fail - the invoice itself was created
    }

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        status: invoice.status,
        created_at: invoice.created_at,
      },
      message: `Invoice ${invoice.invoice_number} generated successfully`,
    })
  } catch (error) {
    console.error("[v0] Error generating manual invoice:", error)
    console.error("[v0] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate manual invoice. Please try again.",
      },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { inventoryItems } = await request.json()

    // Start transaction by updating customer status
    await sql`
      UPDATE customers 
      SET status = 'active', updated_at = NOW()
      WHERE id = ${customerId}
    `

    // Issue inventory items if any selected
    if (inventoryItems && inventoryItems.length > 0) {
      for (const item of inventoryItems) {
        // Create customer equipment record
        await sql`
          INSERT INTO customer_equipment (
            customer_id,
            inventory_item_id,
            quantity,
            issued_date,
            status
          ) VALUES (
            ${customerId},
            ${item.id},
            ${item.quantity},
            NOW(),
            'issued'
          )
        `

        // Update inventory stock
        await sql`
          UPDATE inventory_items 
          SET stock_quantity = stock_quantity - ${item.quantity}
          WHERE id = ${item.id}
        `
      }
    }

    // Log the approval
    await sql`
      INSERT INTO customer_logs (
        customer_id,
        action,
        description,
        created_at
      ) VALUES (
        ${customerId},
        'approved',
        'Customer approved and activated by admin',
        NOW()
      )
    `

    return NextResponse.json({ success: true, message: "Customer approved successfully" })
  } catch (error) {
    console.error("[v0] Error approving customer:", error)
    return NextResponse.json({ error: "Failed to approve customer" }, { status: 500 })
  }
}

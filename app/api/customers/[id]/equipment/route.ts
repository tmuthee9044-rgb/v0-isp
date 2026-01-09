import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    const equipment = await sql`
      SELECT 
        id,
        equipment_name,
        equipment_type,
        serial_number,
        issued_date,
        status,
        monthly_cost,
        notes
      FROM customer_equipment
      WHERE customer_id = ${customerId}
      ORDER BY issued_date DESC
    `

    return NextResponse.json({
      success: true,
      equipment,
    })
  } catch (error) {
    console.error("[v0] Error fetching customer equipment:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch customer equipment" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const { inventory_item_id, equipment_name, equipment_type, quantity, monthly_cost, notes } = await request.json()

    console.log("[v0] Assigning equipment:", {
      customerId,
      inventory_item_id,
      equipment_name,
      quantity,
    })

    // Check if inventory item has enough stock
    const inventoryCheck = await sql`
      SELECT stock_quantity, name FROM inventory_items WHERE id = ${inventory_item_id}
    `

    console.log("[v0] Inventory check result:", inventoryCheck)

    if (inventoryCheck.length === 0) {
      console.error("[v0] Inventory item not found:", inventory_item_id)
      return NextResponse.json({ success: false, error: "Inventory item not found" }, { status: 404 })
    }

    const currentStock = inventoryCheck[0].stock_quantity
    console.log("[v0] Current stock:", currentStock, "Requested quantity:", quantity)

    if (currentStock < quantity) {
      console.error("[v0] Insufficient stock. Available:", currentStock, "Requested:", quantity)
      return NextResponse.json(
        { success: false, error: `Insufficient stock. Available: ${currentStock}` },
        { status: 400 },
      )
    }

    // Create equipment assignment
    console.log("[v0] Creating equipment assignment...")
    const assignment = await sql`
      INSERT INTO customer_equipment (
        customer_id, equipment_name, equipment_type, issued_date, status, monthly_cost, notes
      ) VALUES (
        ${customerId}, ${equipment_name}, ${equipment_type}, NOW(), 'issued', ${monthly_cost}, ${notes}
      )
      RETURNING *
    `

    console.log("[v0] Equipment assigned:", assignment[0])

    // Deduct from inventory stock
    console.log("[v0] Deducting from inventory stock...")
    await sql`
      UPDATE inventory_items 
      SET stock_quantity = stock_quantity - ${quantity},
          updated_at = NOW()
      WHERE id = ${inventory_item_id}
    `

    console.log("[v0] Stock updated successfully")

    // The stock update above is sufficient for tracking inventory changes

    return NextResponse.json({
      success: true,
      assignment: assignment[0],
      message: "Equipment assigned successfully and stock updated",
    })
  } catch (error) {
    console.error("[v0] Error assigning equipment:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to assign equipment",
      },
      { status: 500 },
    )
  }
}

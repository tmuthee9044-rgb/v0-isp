import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string; equipmentId: string } }) {
  try {
    const customerId = Number.parseInt(params.id)
    const equipmentId = Number.parseInt(params.equipmentId)
    const body = await request.json()

    const { return_condition, return_reason, serial_number_verification, notes } = body

    console.log("[v0] Processing equipment return:", {
      customerId,
      equipmentId,
      return_condition,
      serial_number_verification,
    })

    // Validate required fields
    if (!return_condition || !return_reason) {
      return NextResponse.json({ success: false, error: "Return condition and reason are required" }, { status: 400 })
    }

    // Get equipment details including original serial number and inventory item
    const equipmentResult = await sql`
      SELECT 
        ce.*,
        ii.supplier_id,
        ii.name as item_name
      FROM customer_equipment ce
      LEFT JOIN inventory_items ii ON ce.inventory_item_id = ii.id
      WHERE ce.id = ${equipmentId} AND ce.customer_id = ${customerId}
    `

    if (equipmentResult.length === 0) {
      return NextResponse.json({ success: false, error: "Equipment not found" }, { status: 404 })
    }

    const equipment = equipmentResult[0]

    // Verify serial number if provided
    const serialMatch = serial_number_verification ? equipment.serial_number === serial_number_verification : false

    if (serial_number_verification && !serialMatch) {
      console.log("[v0] Serial number mismatch:", {
        original: equipment.serial_number,
        provided: serial_number_verification,
      })
    }

    // Calculate days in use
    const issuedDate = new Date(equipment.issued_date || equipment.assigned_date)
    const returnDate = new Date()
    const daysInUse = Math.floor((returnDate.getTime() - issuedDate.getTime()) / (1000 * 60 * 60 * 24))

    // Create equipment return record
    const returnRecord = await sql`
      INSERT INTO equipment_returns (
        customer_equipment_id,
        customer_id,
        inventory_item_id,
        supplier_id,
        serial_number,
        return_date,
        return_condition,
        return_reason,
        verified_serial_match,
        issued_date,
        days_in_use,
        notes
      ) VALUES (
        ${equipmentId},
        ${customerId},
        ${equipment.inventory_item_id},
        ${equipment.supplier_id},
        ${serial_number_verification || equipment.serial_number},
        NOW(),
        ${return_condition},
        ${return_reason},
        ${serialMatch},
        ${equipment.issued_date || equipment.assigned_date},
        ${daysInUse},
        ${notes || null}
      )
      RETURNING *
    `

    // Update customer_equipment status and return fields
    await sql`
      UPDATE customer_equipment
      SET 
        status = 'returned',
        returned_date = NOW(),
        return_condition = ${return_condition},
        return_reason = ${return_reason},
        verified_serial_match = ${serialMatch},
        updated_at = NOW()
      WHERE id = ${equipmentId}
    `

    // Removed inventory_movements INSERT since that table doesn't exist
    if (return_condition === "working" || return_condition === "damaged") {
      await sql`
        UPDATE inventory_items
        SET stock_quantity = stock_quantity + 1
        WHERE id = ${equipment.inventory_item_id}
      `
    }

    console.log("[v0] Equipment return processed successfully:", {
      returnId: returnRecord[0].id,
      serialMatch,
      daysInUse,
      returnedToInventory: return_condition === "working" || return_condition === "damaged",
    })

    return NextResponse.json({
      success: true,
      return: returnRecord[0],
      message: serialMatch
        ? "Equipment returned successfully with verified serial number"
        : "Equipment returned (serial number verification failed or not provided)",
    })
  } catch (error) {
    console.error("[v0] Error processing equipment return:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process equipment return",
      },
      { status: 500 },
    )
  }
}

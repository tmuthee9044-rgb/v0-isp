import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

// Get all warehouses with inventory summary
export async function GET() {
  try {
    const warehouses = await sql`
      SELECT 
        w.*
      FROM warehouses w
      ORDER BY w.name
    `

    const warehouseData = warehouses.map((warehouse: any) => ({
      id: warehouse.id,
      warehouse_code: warehouse.code, // Map 'code' to 'warehouse_code' for frontend compatibility
      name: warehouse.name,
      location: warehouse.location,
      contact_person: warehouse.contact_person,
      phone: warehouse.phone,
      email: warehouse.email,
      total_items: 0,
      total_stock: 0,
      total_value: 0,
      low_stock_items: 0,
      created_at: warehouse.created_at,
      updated_at: warehouse.updated_at,
    }))

    return NextResponse.json({
      success: true,
      warehouses: warehouseData,
      summary: {
        total_warehouses: warehouseData.length,
        total_items: 0,
        total_stock: 0,
        total_value: 0,
      },
    })
  } catch (error) {
    console.error("Error fetching warehouses:", error)
    return NextResponse.json({ error: "Failed to fetch warehouses" }, { status: 500 })
  }
}

// Create new warehouse
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const warehouseCode = data.warehouse_code || `WH-${Date.now().toString().slice(-6)}`

    const result = await sql`
      INSERT INTO warehouses (
        code, name, location, contact_person, phone, email
      ) VALUES (
        ${warehouseCode}, ${data.name}, ${data.location || null},
        ${data.contact_person || null}, ${data.phone || null}, ${data.email || null}
      )
      RETURNING *
    `

    try {
      await sql`
        INSERT INTO system_logs (
          user_id, action, entity_type, entity_id, details, ip_address
        ) VALUES (
          ${data.created_by || 1}, 'CREATE', 'warehouse', ${result[0].id},
          ${JSON.stringify({ warehouse_name: data.name, warehouse_code: warehouseCode })},
          ${data.ip_address || "127.0.0.1"}
        )
      `
    } catch (error) {
      console.log("[v0] System logs table not found, skipping audit log")
    }

    return NextResponse.json({
      success: true,
      message: "Warehouse created successfully",
      warehouse: result[0],
    })
  } catch (error) {
    console.error("Error creating warehouse:", error)
    return NextResponse.json({ error: "Failed to create warehouse" }, { status: 500 })
  }
}

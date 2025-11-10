import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    const supplier = await sql`
      SELECT 
        s.*,
        COALESCE(po_stats.total_orders, 0) as total_orders,
        COALESCE(po_stats.total_order_value, 0) as total_order_value,
        COALESCE(po_stats.active_orders, 0) as active_orders
      FROM suppliers s
      LEFT JOIN (
        SELECT 
          supplier_id,
          COUNT(*) as total_orders,
          SUM(total_amount) as total_order_value,
          COUNT(CASE WHEN status IN ('PENDING', 'APPROVED') THEN 1 END) as active_orders
        FROM purchase_orders
        WHERE supplier_id = ${id}
        GROUP BY supplier_id
      ) po_stats ON s.id = po_stats.supplier_id
      WHERE s.id = ${id}
    `

    if (supplier.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Supplier not found",
        },
        { status: 404 },
      )
    }

    const supplierData = {
      id: supplier[0].id,
      supplier_code: supplier[0].id, // Using ID as code since no separate code field
      company_name: supplier[0].company_name || supplier[0].name,
      contact_person: supplier[0].contact_name,
      email: supplier[0].email,
      phone: supplier[0].phone,
      address: supplier[0].address,
      city: "", // Not in schema
      state: "", // Not in schema
      country: "", // Not in schema
      supplier_type: "vendor", // Default since not in schema
      status: supplier[0].is_active ? "active" : "inactive",
      total_orders: Number(supplier[0].total_orders || 0),
      total_order_value: Number(supplier[0].total_order_value || 0),
      active_orders: Number(supplier[0].active_orders || 0),
      created_at: supplier[0].created_at,
    }

    return NextResponse.json({
      success: true,
      supplier: supplierData,
    })
  } catch (error) {
    console.error("Error fetching supplier:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch supplier",
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const data = await request.json()

    const { company_name, contact_person, email, phone, address, status } = data

    const updatedSupplier = await sql`
      UPDATE suppliers 
      SET 
        company_name = ${company_name || null},
        name = ${company_name || null},
        contact_name = ${contact_person || null},
        email = ${email || null},
        phone = ${phone || null},
        address = ${address || null},
        is_active = ${status === "active"},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (updatedSupplier.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Supplier not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Supplier updated successfully",
      supplier: updatedSupplier[0],
    })
  } catch (error) {
    console.error("Error updating supplier:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update supplier",
      },
      { status: 500 },
    )
  }
}

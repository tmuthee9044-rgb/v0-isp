import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

// Get all suppliers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "all"

    let result
    if (status !== "all") {
      const isActiveValue = status === "active"
      result = await sql`
        SELECT 
          s.*,
          0 as total_orders,
          0 as total_order_value,
          0 as active_orders
        FROM suppliers s
        WHERE s.is_active = ${isActiveValue}
        ORDER BY s.company_name ASC
      `
    } else {
      result = await sql`
        SELECT 
          s.*,
          0 as total_orders,
          0 as total_order_value,
          0 as active_orders
        FROM suppliers s
        ORDER BY s.company_name ASC
      `
    }

    const suppliers = (result || []).map((supplier: any) => ({
      id: supplier.id,
      supplier_code: supplier.supplier_code || `SUP-${supplier.id}`,
      company_name: supplier.company_name,
      contact_person: supplier.contact_name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      city: supplier.city || "",
      state: supplier.state || "",
      country: supplier.country || "Kenya",
      postal_code: supplier.postal_code || "",
      tax_number: supplier.tax_id,
      payment_terms: supplier.payment_terms || 30,
      credit_limit: 0,
      supplier_type: "general",
      status: supplier.is_active ? "active" : "inactive",
      rating: 5,
      notes: "",
      total_orders: 0,
      total_order_value: 0,
      active_orders: 0,
      created_at: supplier.created_at,
      updated_at: supplier.updated_at,
    }))

    return NextResponse.json({
      success: true,
      suppliers,
      summary: {
        total_suppliers: suppliers.length,
        active_suppliers: suppliers.filter((s) => s.status === "active").length,
        total_order_value: suppliers.reduce((sum, s) => sum + s.total_order_value, 0),
      },
    })
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    return NextResponse.json(
      {
        success: false,
        suppliers: [],
        summary: {
          total_suppliers: 0,
          active_suppliers: 0,
          total_order_value: 0,
        },
        error: "Failed to fetch suppliers",
      },
      { status: 500 },
    )
  }
}

// Create new supplier
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const result = await sql`
      INSERT INTO suppliers (
        company_name, name, contact_name, email, phone, address,
        website, tax_id, payment_terms, is_active
      ) VALUES (
        ${data.company_name}, 
        ${data.name || data.company_name}, 
        ${data.contact_person || null},
        ${data.email || null}, 
        ${data.phone || null}, 
        ${data.address || null},
        ${data.website || null}, 
        ${data.tax_number || null}, 
        ${data.payment_terms || 30}, 
        ${data.status === "active"}
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      message: "Supplier created successfully",
      supplier: result[0],
    })
  } catch (error) {
    console.error("Error creating supplier:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create supplier",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}

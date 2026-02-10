import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export const dynamic = "force-dynamic"

// Ensure suppliers table has all required columns and proper id default
async function ensureSupplierColumns(sql: any) {
  // Fix the id column: ensure it has a default value (gen_random_uuid for UUID or a sequence for SERIAL)
  await sql`
    DO $$
    BEGIN
      -- Check if the id column is UUID type
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'suppliers' AND column_name = 'id' AND data_type = 'uuid'
      ) THEN
        ALTER TABLE suppliers ALTER COLUMN id SET DEFAULT gen_random_uuid();
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'suppliers' AND column_name = 'id' AND column_default IS NULL
      ) THEN
        CREATE SEQUENCE IF NOT EXISTS suppliers_id_seq;
        ALTER TABLE suppliers ALTER COLUMN id SET DEFAULT nextval('suppliers_id_seq');
        PERFORM setval('suppliers_id_seq', COALESCE((SELECT MAX(id::bigint) FROM suppliers), 0) + 1, false);
      END IF;
    END $$;
  `.catch((e: unknown) => console.error("Failed to fix suppliers id default:", e))

  await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(50)`.catch(() => {})
  await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS name VARCHAR(255)`.catch(() => {})
  await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city VARCHAR(100)`.catch(() => {})
  await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS state VARCHAR(100)`.catch(() => {})
  await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Kenya'`.catch(() => {})
  await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_type VARCHAR(50) DEFAULT 'general'`.catch(() => {})
  await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255)`.catch(() => {})
  await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`.catch(() => {})
  await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20)`.catch(() => {})
  await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes TEXT`.catch(() => {})
  await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 5`.catch(() => {})
  await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15, 2) DEFAULT 0`.catch(() => {})
  await sql`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_number VARCHAR(100)`.catch(() => {})
}

// Get all suppliers
export async function GET(request: NextRequest) {
  try {
    const sql = await getSql()
    await ensureSupplierColumns(sql)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "all"

    let result
    if (status !== "all") {
      const isActiveValue = status === "active"
      result = await sql`
        SELECT 
          s.*
        FROM suppliers s
        WHERE s.is_active = ${isActiveValue}
        ORDER BY s.company_name ASC
      `
    } else {
      result = await sql`
        SELECT s.*
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
        total_order_value: 0,
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
    const sql = await getSql()
    const data = await request.json()

    // Ensure all required columns exist before inserting (in case startup migration hasn't run yet)
    await ensureSupplierColumns(sql)

    // Generate a unique supplier code based on timestamp and count
    const countResult = await sql`SELECT COUNT(*)::INTEGER as count FROM suppliers`
    const count = (countResult[0]?.count || 0) + 1
    const supplierCode = data.supplier_code || `SUP-${String(count).padStart(6, '0')}`

    // Use the actual database column names: contact_name (not contact_person), is_active (not status)
    // Let the database generate the UUID for the id column
    const result = await sql`
      INSERT INTO suppliers (
        supplier_code, company_name, contact_name, name, email, phone, address, city, state, country, supplier_type, is_active, created_at, updated_at
      ) VALUES (
        ${supplierCode},
        ${data.company_name}, 
        ${data.contact_person || data.contact_name || null},
        ${data.company_name || data.name || null},
        ${data.email || null}, 
        ${data.phone || null}, 
        ${data.address || null},
        ${data.city || null},
        ${data.state || null},
        ${data.country || 'Kenya'},
        ${data.supplier_type || 'general'},
        ${data.status === "active" || data.is_active !== false},
        NOW(),
        NOW()
      )
      RETURNING *
    `

    // Map the result back to the expected format
    const supplier = result[0]
    return NextResponse.json({
      success: true,
      message: "Supplier created successfully",
      supplier: {
        ...supplier,
        contact_person: supplier.contact_name,
        status: supplier.is_active ? "active" : "inactive",
      },
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

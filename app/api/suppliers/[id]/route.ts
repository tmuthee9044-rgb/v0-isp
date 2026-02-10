import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

// Ensure suppliers table has all required columns and proper id default
async function ensureSupplierColumns(sql: any) {
  // Fix the id column: ensure it has a default value
  await sql`
    DO $$
    BEGIN
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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = await getSql()
    await ensureSupplierColumns(sql)
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
      supplier_code: supplier[0].supplier_code || `SUP-${supplier[0].id}`,
      company_name: supplier[0].company_name || supplier[0].name,
      contact_person: supplier[0].contact_person || supplier[0].contact_name,
      email: supplier[0].email,
      phone: supplier[0].phone,
      address: supplier[0].address,
      city: supplier[0].city || "",
      state: supplier[0].state || "",
      country: supplier[0].country || "Kenya",
      postal_code: supplier[0].postal_code || "",
      supplier_type: supplier[0].supplier_type || "general",
      status: supplier[0].is_active ? "active" : "inactive",
      rating: supplier[0].rating || 5,
      notes: supplier[0].notes || "",
      total_orders: Number(supplier[0].total_orders || 0),
      total_order_value: Number(supplier[0].total_order_value || 0),
      active_orders: Number(supplier[0].active_orders || 0),
      created_at: supplier[0].created_at,
      updated_at: supplier[0].updated_at,
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
    const sql = await getSql()
    await ensureSupplierColumns(sql)
    const id = params.id
    const data = await request.json()

    const { company_name, contact_person, email, phone, address, city, state, country, supplier_type, status } = data

    const updatedSupplier = await sql`
      UPDATE suppliers 
      SET 
        company_name = ${company_name || null},
        name = ${company_name || null},
        contact_name = ${contact_person || null},
        email = ${email || null},
        phone = ${phone || null},
        address = ${address || null},
        city = ${city || null},
        state = ${state || null},
        country = ${country || 'Kenya'},
        supplier_type = ${supplier_type || 'general'},
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

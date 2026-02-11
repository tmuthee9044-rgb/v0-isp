import { NextResponse } from "next/server"
import { getSql } from "@/lib/database"

export const dynamic = "force-dynamic"

const TABLES_TO_FIX = [
  'users', 'purchase_orders', 'purchase_order_items', 'activity_logs',
  'employees', 'customers', 'suppliers', 'inventory_items',
  'account_balances', 'customer_documents', 'customer_equipment',
  'system_config', 'supplier_invoices', 'roles', 'user_roles'
]

export async function POST() {
  const sql = await getSql()
  const results: string[] = []

  try {
    for (const table of TABLES_TO_FIX) {
      try {
        // Check if table exists
        const tableExists = await sql`
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = ${table}
        `
        if (tableExists.length === 0) {
          results.push(`${table}: table does not exist, skipped`)
          continue
        }

        // Check if id column exists
        const idCol = await sql`
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${table} AND column_name = 'id'
        `
        if (idCol.length === 0) {
          results.push(`${table}: no id column, skipped`)
          continue
        }

        const seqName = `${table}_id_seq`

        // Create sequence if not exists
        await sql.unsafe(`CREATE SEQUENCE IF NOT EXISTS ${seqName}`)

        // Get max id
        const maxResult = await sql.unsafe(`SELECT COALESCE(MAX(id), 0) as max_id FROM "${table}"`)
        const maxId = Number(maxResult[0]?.max_id) || 0

        // Set sequence value
        await sql.unsafe(`SELECT setval('${seqName}', ${maxId + 1}, false)`)

        // Set column default
        await sql.unsafe(`ALTER TABLE "${table}" ALTER COLUMN id SET DEFAULT nextval('${seqName}')`)

        // Own the sequence
        await sql.unsafe(`ALTER SEQUENCE ${seqName} OWNED BY "${table}".id`)

        results.push(`${table}: fixed (max_id=${maxId}, next=${maxId + 1})`)
      } catch (e: any) {
        results.push(`${table}: ERROR - ${e?.message}`)
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}

// Also support GET for easy browser testing
export async function GET() {
  return POST()
}

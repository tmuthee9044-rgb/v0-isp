import { type NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"

// Get all 146 table definitions from Neon
const NEON_SCHEMA = {
  locations: {
    columns: [
      { name: "id", type: "SERIAL PRIMARY KEY" },
      { name: "name", type: "VARCHAR(255)" },
      { name: "address", type: "TEXT" },
      { name: "city", type: "VARCHAR(255)" },
      { name: "region", type: "VARCHAR(255)" },
      { name: "description", type: "TEXT" },
      { name: "status", type: "VARCHAR(50)" },
      { name: "created_at", type: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP" },
      { name: "updated_at", type: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP" },
    ],
  },
  // Add all other 145 tables here...
  customers: {
    columns: [
      { name: "id", type: "SERIAL PRIMARY KEY" },
      { name: "account_number", type: "VARCHAR(100)" },
      { name: "first_name", type: "VARCHAR(255)" },
      { name: "last_name", type: "VARCHAR(255)" },
      { name: "email", type: "VARCHAR(255)" },
      { name: "phone", type: "VARCHAR(50)" },
      { name: "address", type: "TEXT" },
      { name: "city", type: "VARCHAR(255)" },
      { name: "state", type: "VARCHAR(255)" },
      { name: "postal_code", type: "VARCHAR(50)" },
      { name: "country", type: "VARCHAR(255)" },
      { name: "customer_type", type: "VARCHAR(100)" },
      { name: "business_name", type: "VARCHAR(255)" },
      { name: "business_type", type: "VARCHAR(100)" },
      { name: "tax_number", type: "VARCHAR(100)" },
      { name: "id_number", type: "VARCHAR(100)" },
      { name: "status", type: "VARCHAR(50)" },
      { name: "billing_address", type: "TEXT" },
      { name: "installation_address", type: "TEXT" },
      { name: "gps_coordinates", type: "VARCHAR(255)" },
      { name: "portal_username", type: "VARCHAR(255)" },
      { name: "portal_password", type: "VARCHAR(255)" },
      { name: "preferred_contact_method", type: "VARCHAR(50)" },
      { name: "referral_source", type: "VARCHAR(255)" },
      { name: "assigned_staff_id", type: "INTEGER" },
      { name: "location_id", type: "INTEGER" },
      { name: "service_preferences", type: "JSONB" },
      { name: "created_at", type: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP" },
      { name: "updated_at", type: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP" },
    ],
  },
  // Continue with all other tables...
}

export async function POST(request: NextRequest) {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    })

    const logs: string[] = []
    let tablesCreated = 0
    let columnsAdded = 0

    // Process each table
    for (const [tableName, tableSchema] of Object.entries(NEON_SCHEMA)) {
      logs.push(`\n=== Processing table: ${tableName} ===`)

      // Check if table exists
      const tableExists = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tableName],
      )

      if (!tableExists.rows[0].exists) {
        // Create table
        const createColumns = tableSchema.columns.map((col) => `${col.name} ${col.type}`).join(",\n  ")
        const createTableSQL = `CREATE TABLE ${tableName} (\n  ${createColumns}\n)`

        await pool.query(createTableSQL)
        logs.push(`✓ Created table: ${tableName}`)
        tablesCreated++
      } else {
        // Get existing columns
        const existingColumns = await pool.query(
          `SELECT column_name FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = $1`,
          [tableName],
        )

        const existingColumnNames = existingColumns.rows.map((r) => r.column_name)

        // Add missing columns
        for (const col of tableSchema.columns) {
          if (!existingColumnNames.includes(col.name)) {
            const alterSQL = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`
            await pool.query(alterSQL)
            logs.push(`  ✓ Added column: ${tableName}.${col.name}`)
            columnsAdded++
          }
        }
      }
    }

    await pool.end()

    logs.push(`\n✅ Sync complete!`)
    logs.push(`   Tables created: ${tablesCreated}`)
    logs.push(`   Columns added: ${columnsAdded}`)

    return NextResponse.json({
      success: true,
      tablesCreated,
      columnsAdded,
      logs,
    })
  } catch (error: any) {
    console.error("Sync error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}

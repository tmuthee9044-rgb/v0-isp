import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    console.log("[v0] Starting database schema fixes...")

    // Read the SQL fix script content
    const fixQueries = [
      // 1. Create inventory_movements table if it doesn't exist
      `CREATE TABLE IF NOT EXISTS inventory_movements (
        id BIGSERIAL PRIMARY KEY,
        item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
        inventory_item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
        movement_type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        from_location TEXT,
        to_location TEXT,
        reason TEXT,
        reference_number TEXT,
        unit_cost DECIMAL(10,2),
        total_cost DECIMAL(10,2),
        status TEXT DEFAULT 'completed',
        performed_by TEXT DEFAULT 'System',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,

      // Create indexes for inventory_movements
      `CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(item_id)`,
      `CREATE INDEX IF NOT EXISTS idx_inventory_movements_inventory_item_id ON inventory_movements(inventory_item_id)`,
      `CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type)`,
      `CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_inventory_movements_status ON inventory_movements(status)`,

      // 2. Create invoice_items table if it doesn't exist
      `CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        service_plan_id INTEGER REFERENCES service_plans(id),
        service_id INTEGER REFERENCES customer_services(id),
        description TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        unit_price NUMERIC(10,2) NOT NULL,
        total_amount NUMERIC(10,2) NOT NULL,
        tax_rate NUMERIC(5,2) DEFAULT 0,
        tax_amount NUMERIC(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create indexes for invoice_items
      `CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)`,
      `CREATE INDEX IF NOT EXISTS idx_invoice_items_service_id ON invoice_items(service_id)`,
    ]

    // Execute all fix queries
    let queriesExecuted = 0
    const results = []

    for (const query of fixQueries) {
      try {
        await sql(query)
        queriesExecuted++
        console.log(`[v0] Executed query ${queriesExecuted}/${fixQueries.length}`)
      } catch (error) {
        console.error("[v0] Error executing query:", error)
        results.push({
          query: query.substring(0, 100) + "...",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Add missing columns
    const columnAdditions = [
      {
        table: "purchase_order_items",
        column: "quantity_received",
        type: "INTEGER DEFAULT 0",
      },
      {
        table: "account_balances",
        column: "created_at",
        type: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
      },
    ]

    for (const addition of columnAdditions) {
      try {
        // Check if column exists
        const checkResult = await sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = ${addition.table} 
          AND column_name = ${addition.column}
        `

        if (checkResult.length === 0) {
          // Column doesn't exist, add it
          await sql(`ALTER TABLE ${addition.table} ADD COLUMN ${addition.column} ${addition.type}`)
          console.log(`[v0] Added ${addition.column} column to ${addition.table}`)
          results.push({
            action: "add_column",
            table: addition.table,
            column: addition.column,
            status: "success",
          })
        } else {
          console.log(`[v0] Column ${addition.column} already exists in ${addition.table}`)
          results.push({
            action: "add_column",
            table: addition.table,
            column: addition.column,
            status: "already_exists",
          })
        }
      } catch (error) {
        console.error(`[v0] Error adding column ${addition.column} to ${addition.table}:`, error)
        results.push({
          action: "add_column",
          table: addition.table,
          column: addition.column,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Verify tables exist
    const tablesToVerify = ["inventory_movements", "invoice_items"]
    const verificationResults = []

    for (const tableName of tablesToVerify) {
      try {
        const result = await sql`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = ${tableName}
          ) as exists
        `
        verificationResults.push({
          table: tableName,
          exists: result[0].exists,
        })
      } catch (error) {
        verificationResults.push({
          table: tableName,
          exists: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    console.log("[v0] Database schema fixes completed")

    return Response.json({
      success: true,
      message: "Database schema fixes applied successfully",
      queriesExecuted,
      totalQueries: fixQueries.length,
      results,
      verification: verificationResults,
    })
  } catch (error) {
    console.error("[v0] Database fix error:", error)
    return Response.json(
      {
        success: false,
        error: "Database fix failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    // Check current database status
    const tablesToCheck = ["inventory_movements", "invoice_items"]
    const columnsToCheck = [
      { table: "purchase_order_items", column: "quantity_received" },
      { table: "account_balances", column: "created_at" },
    ]

    const tableStatus = []
    for (const tableName of tablesToCheck) {
      const result = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = ${tableName}
        ) as exists
      `
      tableStatus.push({
        table: tableName,
        exists: result[0].exists,
      })
    }

    const columnStatus = []
    for (const check of columnsToCheck) {
      const result = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = ${check.table} 
          AND column_name = ${check.column}
        ) as exists
      `
      columnStatus.push({
        table: check.table,
        column: check.column,
        exists: result[0].exists,
      })
    }

    const allGood = tableStatus.every((t) => t.exists) && columnStatus.every((c) => c.exists)

    return Response.json({
      status: allGood ? "healthy" : "needs_fixes",
      tables: tableStatus,
      columns: columnStatus,
      message: allGood
        ? "All required tables and columns exist"
        : "Some tables or columns are missing. Run POST /api/fix-database-schema to fix.",
    })
  } catch (error) {
    return Response.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

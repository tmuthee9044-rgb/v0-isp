import { neon } from "@neondatabase/serverless"
import fs from "fs"
import path from "path"

const sql = neon(process.env.DATABASE_URL)

async function runSchemaMigration() {
  try {
    console.log("[v0] Starting schema migration to fix database issues...")

    // Read the SQL migration file
    const migrationPath = path.join(process.cwd(), "scripts", "fix-schema-issues.sql")
    const migrationSQL = fs.readFileSync(migrationPath, "utf8")

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"))

    console.log(`[v0] Executing ${statements.length} migration statements...`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`[v0] Executing statement ${i + 1}/${statements.length}`)
        await sql.unsafe(statement)
      }
    }

    console.log("[v0] Schema migration completed successfully!")

    // Verify the changes
    const verifyServiceId = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoice_items' 
      AND column_name = 'service_id'
    `

    const verifyTaxColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tax_returns' 
      AND column_name IN ('due_date', 'penalty_amount', 'tax_authority', 'reference_number', 'notes')
    `

    console.log("[v0] Verification results:")
    console.log(`- service_id column in invoice_items: ${verifyServiceId.length > 0 ? "EXISTS" : "MISSING"}`)
    console.log(`- Enhanced tax_returns columns: ${verifyTaxColumns.length}/5 columns exist`)

    return {
      success: true,
      message: "Schema migration completed successfully",
      verification: {
        service_id_column: verifyServiceId.length > 0,
        tax_columns_count: verifyTaxColumns.length,
      },
    }
  } catch (error) {
    console.error("[v0] Schema migration failed:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Run the migration
runSchemaMigration()
  .then((result) => {
    console.log("[v0] Migration result:", result)
    process.exit(result.success ? 0 : 1)
  })
  .catch((error) => {
    console.error("[v0] Migration error:", error)
    process.exit(1)
  })

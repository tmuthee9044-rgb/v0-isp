import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function runMigration() {
  try {
    console.log("Starting tax columns migration...")

    // Read and execute the SQL migration
    const fs = await import("fs")
    const path = await import("path")

    const migrationPath = path.join(process.cwd(), "scripts", "add-missing-tax-columns.sql")
    const migrationSQL = fs.readFileSync(migrationPath, "utf8")

    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(";").filter((stmt) => stmt.trim())

    for (const statement of statements) {
      if (statement.trim()) {
        console.log("Executing:", statement.substring(0, 50) + "...")
        await sql`${statement}`
      }
    }

    console.log("✅ Tax columns migration completed successfully")

    // Verify the columns were added
    const result = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tax_returns' 
      AND column_name IN ('due_date', 'penalty_amount', 'tax_authority', 'reference_number', 'notes')
      ORDER BY column_name
    `

    console.log("✅ Added columns:", result)
  } catch (error) {
    console.error("❌ Migration failed:", error)
    throw error
  }
}

runMigration()

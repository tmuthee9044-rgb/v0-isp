import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function runDocumentsMigration() {
  try {
    console.log("Starting customer documents migration...")

    // Read and execute the SQL migration
    const fs = await import("fs")
    const path = await import("path")

    const migrationPath = path.join(process.cwd(), "scripts", "create-customer-documents-table.sql")
    const migrationSQL = fs.readFileSync(migrationPath, "utf8")

    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(";").filter((stmt) => stmt.trim().length > 0)

    for (const statement of statements) {
      if (statement.trim()) {
        await sql`${statement.trim()}`
        console.log("✓ Executed statement")
      }
    }

    console.log("✅ Customer documents migration completed successfully!")

    // Verify the tables were created
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('customer_documents', 'customer_document_access_logs', 'customer_document_shares')
      ORDER BY table_name
    `

    console.log(
      "📋 Created tables:",
      tables.map((t) => t.table_name),
    )
  } catch (error) {
    console.error("❌ Migration failed:", error)
    throw error
  }
}

runDocumentsMigration()

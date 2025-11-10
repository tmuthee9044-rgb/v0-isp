import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function runMigration() {
  try {
    console.log("Starting purchase orders migration...")

    // Read and execute the SQL file
    const fs = await import("fs")
    const path = await import("path")

    const sqlContent = fs.readFileSync(path.join(process.cwd(), "scripts/create-purchase-orders-schema.sql"), "utf8")

    // Execute the SQL
    await sql`${sqlContent}`

    console.log("✅ Purchase orders migration completed successfully")

    // Test the auto-generation function
    console.log("Testing PO number generation...")
    const testResult = await sql`SELECT generate_po_number() as po_number`
    console.log("Generated PO number:", testResult[0].po_number)
  } catch (error) {
    console.error("❌ Migration failed:", error)
    throw error
  }
}

runMigration()

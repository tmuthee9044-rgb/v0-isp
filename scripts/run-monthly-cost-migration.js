import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function runMigration() {
  try {
    console.log("[v0] Starting monthly_cost column migration...")

    // Add the monthly_cost column
    await sql`
      ALTER TABLE customer_equipment 
      ADD COLUMN IF NOT EXISTS monthly_cost NUMERIC(10,2) DEFAULT 0.00
    `

    console.log("[v0] Added monthly_cost column to customer_equipment table")

    // Update existing records
    const updateResult = await sql`
      UPDATE customer_equipment 
      SET monthly_cost = 0.00 
      WHERE monthly_cost IS NULL
    `

    console.log(`[v0] Updated ${updateResult.length} existing records with default monthly_cost`)

    // Verify the column was added
    const testQuery = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'customer_equipment' 
      AND column_name = 'monthly_cost'
    `

    if (testQuery.length > 0) {
      console.log("[v0] Migration successful! Column details:", testQuery[0])
    } else {
      console.error("[v0] Migration failed - column not found")
    }
  } catch (error) {
    console.error("[v0] Migration failed:", error)
    throw error
  }
}

runMigration()
  .then(() => {
    console.log("[v0] Monthly cost migration completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[v0] Monthly cost migration failed:", error)
    process.exit(1)
  })

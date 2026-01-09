import pg from "pg"
const { Pool } = pg

async function addPppoeColumns() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    console.log("🔧 Adding pppoe_username and pppoe_password columns...")

    await pool.query(`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(255),
      ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(255);
    `)

    console.log("✅ Columns added successfully!")

    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username 
      ON customer_services(pppoe_username);
    `)

    console.log("✅ Index created successfully!")
    console.log("🎉 Database migration complete!")
  } catch (error) {
    console.error("❌ Error:", error.message)
    throw error
  } finally {
    await pool.end()
  }
}

addPppoeColumns()

const { neon } = require("@neondatabase/serverless")

async function addMissingColumns() {
  const sql = neon(process.env.DATABASE_URL)

  console.log("[v0] Starting to add missing columns to customer_services table...")

  try {
    // Add all missing columns with proper data types
    const columns = [
      { name: "mac_address", type: "VARCHAR(17)", default: null },
      { name: "pppoe_username", type: "VARCHAR(255)", default: null },
      { name: "pppoe_password", type: "VARCHAR(255)", default: null },
      { name: "lock_to_mac", type: "BOOLEAN", default: "FALSE" },
      { name: "auto_renew", type: "BOOLEAN", default: "TRUE" },
      { name: "connection_type", type: "VARCHAR(50)", default: "'pppoe'" },
    ]

    for (const column of columns) {
      try {
        console.log(`[v0] Adding column: ${column.name}...`)

        const defaultClause = column.default !== null ? `DEFAULT ${column.default}` : ""

        await sql`
          ALTER TABLE customer_services 
          ADD COLUMN IF NOT EXISTS ${sql(column.name)} ${sql.unsafe(column.type)} ${sql.unsafe(defaultClause)}
        `

        console.log(`[v0] ✓ Column ${column.name} added successfully`)
      } catch (err) {
        if (err.code === "42701") {
          console.log(`[v0] ℹ Column ${column.name} already exists, skipping...`)
        } else {
          console.error(`[v0] ✗ Error adding column ${column.name}:`, err.message)
        }
      }
    }

    // Create indexes for performance
    console.log("[v0] Creating indexes...")

    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username 
        ON customer_services(pppoe_username) 
        WHERE pppoe_username IS NOT NULL
      `
      console.log("[v0] ✓ Index on pppoe_username created")
    } catch (err) {
      console.log("[v0] ℹ Index on pppoe_username already exists")
    }

    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address 
        ON customer_services(mac_address) 
        WHERE mac_address IS NOT NULL
      `
      console.log("[v0] ✓ Index on mac_address created")
    } catch (err) {
      console.log("[v0] ℹ Index on mac_address already exists")
    }

    console.log("[v0] ✅ All missing columns added successfully!")
    console.log("[v0] The service creation form will now work correctly.")
  } catch (error) {
    console.error("[v0] ❌ Failed to add columns:", error)
    throw error
  }
}

addMissingColumns()
  .then(() => {
    console.log("[v0] Migration completed successfully")
    process.exit(0)
  })
  .catch((err) => {
    console.error("[v0] Migration failed:", err)
    process.exit(1)
  })

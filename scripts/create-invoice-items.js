const { getSql } = require("@/lib/db")

async function createInvoiceItemsTable() {
  try {
    console.log("[v0] Starting invoice_items table migration...")

    const sql = await getSql()

    // Create invoice_items table
    await sql`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price NUMERIC(10, 2) NOT NULL,
        total_price NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      )
    `
    console.log("[v0] invoice_items table created successfully")

    // Create index on invoice_id
    await sql`
      CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id 
      ON invoice_items(invoice_id)
    `
    console.log("[v0] Index on invoice_id created successfully")

    // Create trigger function for updated_at
    await sql`
      CREATE OR REPLACE FUNCTION update_invoice_items_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `
    console.log("[v0] Trigger function created successfully")

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS update_invoice_items_timestamp_trigger ON invoice_items
    `

    await sql`
      CREATE TRIGGER update_invoice_items_timestamp_trigger
      BEFORE UPDATE ON invoice_items
      FOR EACH ROW
      EXECUTE FUNCTION update_invoice_items_timestamp()
    `
    console.log("[v0] Trigger created successfully")

    console.log("[v0] Migration completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("[v0] Migration failed:", error.message)
    console.error("[v0] Error details:", error)
    process.exit(1)
  }
}

createInvoiceItemsTable()

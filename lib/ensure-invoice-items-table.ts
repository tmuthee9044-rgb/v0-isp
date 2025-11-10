"use server"

import { getSql } from "./db"

let migrationRun = false

export async function ensureInvoiceItemsTable() {
  if (migrationRun) return { success: true, message: "Migration already checked" }

  try {
    console.log("[v0] Checking if invoice_items table exists...")
    const sql = await getSql()

    // Check if table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'invoice_items'
      )
    `

    const tableExists = tableCheck[0]?.exists

    if (!tableExists) {
      console.log("[v0] invoice_items table does not exist. Creating...")

      // Create the table
      await sql`
        CREATE TABLE IF NOT EXISTS invoice_items (
          id SERIAL PRIMARY KEY,
          invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
          description TEXT NOT NULL,
          quantity INTEGER DEFAULT 1,
          unit_price NUMERIC(10, 2) NOT NULL,
          total_price NUMERIC(10, 2) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `

      // Create indexes
      await sql`CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)`

      // Create updated_at trigger
      await sql`
        CREATE OR REPLACE FUNCTION update_invoice_items_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `

      await sql`
        DROP TRIGGER IF EXISTS trigger_update_invoice_items_updated_at ON invoice_items
      `

      await sql`
        CREATE TRIGGER trigger_update_invoice_items_updated_at
        BEFORE UPDATE ON invoice_items
        FOR EACH ROW
        EXECUTE FUNCTION update_invoice_items_updated_at()
      `

      console.log("[v0] invoice_items table created successfully!")
      migrationRun = true
      return { success: true, message: "Table created successfully" }
    }

    console.log("[v0] invoice_items table already exists")
    migrationRun = true
    return { success: true, message: "Table already exists" }
  } catch (error) {
    console.error("[v0] Error ensuring invoice_items table:", error)
    return { success: false, error: String(error) }
  }
}

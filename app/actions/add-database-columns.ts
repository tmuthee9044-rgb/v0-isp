"use server"

import { neon } from "@neondatabase/serverless"

export async function addMissingServiceColumns() {
  const sql = neon(process.env.DATABASE_URL!)

  console.log("[v0] Starting database column migration...")

  try {
    // Add missing columns to customer_services table
    await sql`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17),
      ADD COLUMN IF NOT EXISTS pppoe_username VARCHAR(100),
      ADD COLUMN IF NOT EXISTS pppoe_password VARCHAR(100),
      ADD COLUMN IF NOT EXISTS lock_to_mac BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id)
    `

    console.log("[v0] Added columns to customer_services table")

    // Add customer_auth_method column to network_devices table
    await sql`
      ALTER TABLE network_devices
      ADD COLUMN IF NOT EXISTS customer_auth_method VARCHAR(50) DEFAULT 'pppoe_radius'
    `

    console.log("[v0] Added customer_auth_method column to network_devices table")

    // Create indexes for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_services_mac_address ON customer_services(mac_address);
      CREATE INDEX IF NOT EXISTS idx_customer_services_pppoe_username ON customer_services(pppoe_username);
      CREATE INDEX IF NOT EXISTS idx_customer_services_location_id ON customer_services(location_id);
      CREATE INDEX IF NOT EXISTS idx_network_devices_customer_auth_method ON network_devices(customer_auth_method)
    `

    console.log("[v0] Created performance indexes")

    return {
      success: true,
      message: "All missing columns added successfully",
    }
  } catch (error: any) {
    console.error("[v0] Error adding columns:", error.message)
    return {
      success: false,
      message: error.message,
    }
  }
}

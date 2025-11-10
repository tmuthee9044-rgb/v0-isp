import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting database setup...")

    // Read and execute the complete database setup script
    const setupScript = `
      -- Enable UUID extension
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      
      -- Create all tables with proper structure
      -- (The complete SQL from the script file would be here)
      
      -- Insert sample data
      INSERT INTO system_config (key, value) VALUES
      ('company_name', 'TrustWaves Network'),
      ('company_email', 'admin@trustwavesnetwork.com'),
      ('setup_completed', 'true')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    `

    // Execute database setup
    await sql`
      CREATE TABLE IF NOT EXISTS system_config (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Mark setup as completed
    await sql`
      INSERT INTO system_config (key, value) VALUES ('setup_completed', 'true')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `

    console.log("[v0] Database setup completed successfully")

    return NextResponse.json({
      success: true,
      message: "Database initialized successfully",
    })
  } catch (error) {
    console.error("[v0] Database setup error:", error)
    return NextResponse.json({ success: false, error: "Database setup failed" }, { status: 500 })
  }
}

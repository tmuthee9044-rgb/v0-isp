import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const sql = await getSql()
    
    // Fix locations table schema
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS locations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          address TEXT,
          city VARCHAR(255),
          region VARCHAR(255),
          description TEXT,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
    `)
    
    // Add missing columns if they don't exist
    const alterColumns = [
      "ALTER TABLE locations ADD COLUMN IF NOT EXISTS city VARCHAR(255)",
      "ALTER TABLE locations ADD COLUMN IF NOT EXISTS region VARCHAR(255)",
      "ALTER TABLE locations ADD COLUMN IF NOT EXISTS address TEXT",
      "ALTER TABLE locations ADD COLUMN IF NOT EXISTS description TEXT",
      "ALTER TABLE locations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'",
      "ALTER TABLE locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()"
    ]
    
    for (const alterSql of alterColumns) {
      try {
        await sql.unsafe(alterSql)
      } catch (err) {
        // Column might already exist, that's okay
        console.log(`Skipping: ${alterSql}`)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Local database schema fixed successfully"
    })
  } catch (error) {
    console.error("Error fixing schema:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fix schema", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

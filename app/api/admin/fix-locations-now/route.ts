import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function POST() {
  try {
    const sql = await getSql()

    console.log("[v0] Starting locations table fix...")

    // Add missing columns to locations table
    const alterations = [
      "ALTER TABLE locations ADD COLUMN IF NOT EXISTS city VARCHAR(100)",
      "ALTER TABLE locations ADD COLUMN IF NOT EXISTS region VARCHAR(100)",
      "ALTER TABLE locations ADD COLUMN IF NOT EXISTS address TEXT",
      "ALTER TABLE locations ADD COLUMN IF NOT EXISTS description TEXT",
      "ALTER TABLE locations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'",
      "ALTER TABLE locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    ]

    for (const alteration of alterations) {
      try {
        await sql.unsafe(alteration)
        console.log("[v0] Executed:", alteration)
      } catch (err) {
        console.log("[v0] Skipped (may already exist):", alteration)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Locations table schema fixed successfully",
    })
  } catch (error) {
    console.error("[v0] Error fixing locations schema:", error)
    return NextResponse.json({ error: "Failed to fix locations schema", details: String(error) }, { status: 500 })
  }
}

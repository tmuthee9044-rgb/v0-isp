import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function POST() {
  try {
    const sql = await getSql()

    console.log("[v0] Starting missing columns migration...")

    await sql`
      ALTER TABLE company_profiles 
      ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'KES',
      ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'Africa/Nairobi',
      ADD COLUMN IF NOT EXISTS date_format VARCHAR(50) DEFAULT 'DD/MM/YYYY',
      ADD COLUMN IF NOT EXISTS time_format VARCHAR(10) DEFAULT '24h',
      ADD COLUMN IF NOT EXISTS number_format VARCHAR(20) DEFAULT 'comma',
      ADD COLUMN IF NOT EXISTS week_start VARCHAR(20) DEFAULT 'Monday'
    `
    console.log("[v0] Added localization columns to company_profiles")

    await sql`
      ALTER TABLE router_performance_history 
      ADD COLUMN IF NOT EXISTS bandwidth_usage BIGINT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS peak_usage BIGINT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS connections INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS latency DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS packet_loss DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS uptime_percentage DECIMAL(5,2) DEFAULT 100
    `
    console.log("[v0] Added performance columns to router_performance_history")

    return NextResponse.json({
      success: true,
      message: "Missing columns added successfully",
    })
  } catch (error) {
    console.error("[v0] Error adding missing columns:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

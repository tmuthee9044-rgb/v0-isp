import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/database"
import { readFile } from "fs/promises"
import { join } from "path"

export async function POST(request: NextRequest) {
  const sql = await getSql()

  try {
    console.log("[v0] Starting database setup...")

    const schemaPath = join(process.cwd(), "scripts", "000_complete_schema.sql")
    const schemaSQL = await readFile(schemaPath, "utf-8")

    console.log("[v0] Executing complete schema file...")

    // Split by semicolons and execute each statement
    const statements = schemaSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"))

    let successCount = 0
    let errorCount = 0
    const errors = []

    for (const statement of statements) {
      try {
        await sql.unsafe(statement)
        successCount++
      } catch (error) {
        errorCount++
        errors.push({
          statement: statement.substring(0, 100) + "...",
          error: (error as Error).message,
        })
        console.error(`[v0] SQL Error:`, error)
      }
    }

    console.log(`[v0] Database setup completed: ${successCount} successful, ${errorCount} errors`)

    // Mark setup as completed
    await sql`
      INSERT INTO system_config (key, value) VALUES ('setup_completed', 'true')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `

    return NextResponse.json({
      success: true,
      message: "Database initialized successfully",
      details: {
        successCount,
        errorCount,
        errors: errors.slice(0, 10), // Return first 10 errors
      },
    })
  } catch (error) {
    console.error("[v0] Database setup error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Database setup failed: " + (error as Error).message,
      },
      { status: 500 },
    )
  }
}

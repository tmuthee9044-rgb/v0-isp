import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { readFileSync } from "fs"
import { join } from "path"

export async function POST() {
  try {
    const sql = await getSql()

    // Read the SQL script
    const scriptPath = join(process.cwd(), "scripts", "fix_all_missing_columns.sql")
    const sqlScript = readFileSync(scriptPath, "utf-8")

    // Split by semicolons and filter out comments and empty statements
    const statements = sqlScript
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--") && !s.match(/^\/\*/))

    const results = []
    let successCount = 0
    let errorCount = 0

    // Execute each statement
    for (const statement of statements) {
      if (!statement) continue

      try {
        await sql.unsafe(statement)
        successCount++
        results.push({
          success: true,
          statement: statement.substring(0, 100) + "...",
        })
      } catch (error: any) {
        // Ignore "column already exists" errors (code 42701)
        if (error.code === "42701" || error.message?.includes("already exists")) {
          successCount++
          results.push({
            success: true,
            statement: statement.substring(0, 100) + "...",
            note: "Column already exists (skipped)",
          })
        } else {
          errorCount++
          results.push({
            success: false,
            statement: statement.substring(0, 100) + "...",
            error: error.message,
          })
        }
      }
    }

    return NextResponse.json({
      success: errorCount === 0,
      message: `Schema fix completed: ${successCount} successful, ${errorCount} errors`,
      successCount,
      errorCount,
      totalStatements: statements.length,
      results,
    })
  } catch (error: any) {
    console.error("[v0] Error executing schema fix:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.toString(),
      },
      { status: 500 },
    )
  }
}

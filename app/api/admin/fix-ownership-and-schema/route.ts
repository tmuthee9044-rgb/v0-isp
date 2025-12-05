import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"
import { readFileSync } from "fs"
import { join } from "path"

export async function POST() {
  console.log("[v0] Starting ownership fix and schema sync...")

  try {
    const sql = await getSql()

    // Step 1: Try to fix ownership (this might fail if not superuser)
    console.log("[v0] Step 1: Attempting to fix table ownership...")
    try {
      const ownershipScript = readFileSync(join(process.cwd(), "scripts", "fix_table_ownership.sql"), "utf-8")
      await sql.unsafe(ownershipScript)
      console.log("[v0] ✅ Table ownership fixed successfully")
    } catch (ownerError: any) {
      console.log("[v0] ⚠️ Could not fix ownership (may need superuser):", ownerError.message)
      console.log("[v0] Continuing with schema fix anyway...")
    }

    // Step 2: Add missing columns
    console.log("[v0] Step 2: Adding missing columns...")
    const sqlScript = readFileSync(join(process.cwd(), "scripts", "fix_all_missing_columns.sql"), "utf-8")

    const statements = sqlScript
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--") && !s.match(/^\/\*/))

    const results = []
    let successCount = 0
    let errorCount = 0
    const criticalErrors = []

    for (const statement of statements) {
      if (!statement) continue

      try {
        await sql.unsafe(statement)
        successCount++
        console.log(`[v0] ✅ ${statement.substring(0, 80)}...`)
      } catch (error: any) {
        // Ignore "column already exists" errors
        if (error.code === "42701" || error.message?.includes("already exists")) {
          successCount++
          console.log(`[v0] ℹ️ Column already exists (skipped): ${statement.substring(0, 60)}`)
        } else if (error.message?.includes("must be owner")) {
          // Critical ownership error
          errorCount++
          const tableName = statement.match(/ALTER TABLE (\w+)/)?.[1] || "unknown"
          criticalErrors.push(tableName)
          console.log(`[v0] ❌ Permission denied for table: ${tableName}`)
        } else {
          errorCount++
          console.log(`[v0] ❌ Error: ${error.message}`)
          results.push({
            success: false,
            statement: statement.substring(0, 100),
            error: error.message,
          })
        }
      }
    }

    if (criticalErrors.length > 0) {
      const uniqueTables = [...new Set(criticalErrors)]
      return NextResponse.json({
        success: false,
        message: `Permission denied: Current PostgreSQL user does not own ${uniqueTables.length} tables`,
        needsSuperuser: true,
        tablesWithPermissionIssues: uniqueTables,
        successCount,
        errorCount,
        totalStatements: statements.length,
        instructions: "Run this SQL as PostgreSQL superuser: ALTER TABLE <table_name> OWNER TO current_user;",
      })
    }

    return NextResponse.json({
      success: errorCount === 0,
      message: `Schema fix completed: ${successCount} successful, ${errorCount} errors`,
      successCount,
      errorCount,
      totalStatements: statements.length,
    })
  } catch (error: any) {
    console.error("[v0] Fatal error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}

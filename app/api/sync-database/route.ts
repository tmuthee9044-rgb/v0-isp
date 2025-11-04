import { NextResponse } from "next/server"
import { neon } from "@/lib/neon-wrapper"
import { readdir, readFile } from "fs/promises"
import { join } from "path"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    const results = {
      migrationsRun: [] as string[],
      errors: [] as string[],
      summary: "",
    }

    try {
      await sql`SELECT 1 as test`
      console.log("[v0] Database connection successful")
    } catch (error: any) {
      console.error("[v0] Database connection test failed:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Database connection failed",
          details: error.message || "Unable to connect to database",
          hint: "Check DATABASE_URL environment variable and ensure database is running",
        },
        { status: 500 },
      )
    }

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          migration_name VARCHAR(255) UNIQUE NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    } catch (error: any) {
      console.error("[v0] Failed to create migrations table:", error)
      results.errors.push(`Failed to create migrations table: ${error.message}`)
    }

    let appliedMigrations: string[] = []
    try {
      const rows = await sql`SELECT migration_name FROM schema_migrations`
      appliedMigrations = rows.map((row: any) => row.migration_name)
    } catch (error: any) {
      console.error("[v0] Failed to read migrations:", error)
      results.errors.push(`Failed to read migrations: ${error.message}`)
    }

    try {
      const scriptsDir = join(process.cwd(), "scripts")

      // Check if scripts directory exists
      let files: string[] = []
      try {
        files = await readdir(scriptsDir)
      } catch (error: any) {
        console.error("[v0] Scripts directory not found:", error)
        results.errors.push(`Scripts directory not found: ${scriptsDir}`)
        // Return early if no scripts directory
        results.summary = `Database sync completed. No migrations directory found. ${results.errors.length} errors encountered.`
        return NextResponse.json({
          success: false,
          message: "No migrations directory found",
          results,
        })
      }

      const migrationFiles = files.filter((f) => f.endsWith(".sql") && f.match(/^\d{3}_/)).sort()

      console.log("[v0] Found migration files:", migrationFiles)

      for (const file of migrationFiles) {
        const migrationName = file.replace(".sql", "")

        // Skip already applied migrations
        if (appliedMigrations.includes(migrationName)) {
          console.log("[v0] Skipping already applied migration:", migrationName)
          continue
        }

        try {
          const filePath = join(scriptsDir, file)
          const migrationSQL = await readFile(filePath, "utf-8")

          console.log("[v0] Applying migration:", migrationName)

          const statements = migrationSQL
            .split(";")
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && !s.startsWith("--"))

          for (const statement of statements) {
            if (statement.trim()) {
              try {
                if (typeof sql.unsafe === "function") {
                  await sql.unsafe(statement)
                } else {
                  // Fallback for databases without unsafe method
                  await sql([statement] as any)
                }
              } catch (stmtError: any) {
                console.error("[v0] Statement error:", stmtError)
                throw stmtError
              }
            }
          }

          // Record successful migration
          await sql`
            INSERT INTO schema_migrations (migration_name)
            VALUES (${migrationName})
            ON CONFLICT (migration_name) DO NOTHING
          `

          results.migrationsRun.push(migrationName)
          console.log("[v0] Successfully applied migration:", migrationName)
        } catch (error: any) {
          console.error("[v0] Migration error:", migrationName, error)
          results.errors.push(`Migration ${migrationName}: ${error.message}`)
        }
      }
    } catch (error: any) {
      console.error("[v0] Failed to process migration files:", error)
      results.errors.push(`Failed to read migration files: ${error.message}`)
    }

    results.summary = `Database sync completed. Ran ${results.migrationsRun.length} migrations. ${results.errors.length} errors encountered.`

    console.log("[v0] Database sync results:", results)

    return NextResponse.json({
      success: results.errors.length === 0,
      message:
        results.errors.length === 0
          ? "Database schema synchronized successfully"
          : "Database sync completed with errors",
      results,
      databaseType: process.env.DATABASE_URL?.includes("localhost") ? "PostgreSQL (offline)" : "Neon (serverless)",
    })
  } catch (error: any) {
    console.error("[v0] Database sync error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync database schema",
        details: error.message || "Unknown error occurred",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

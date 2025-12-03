import { type NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"
import fs from "fs"
import path from "path"

export async function POST(request: NextRequest) {
  const logs: string[] = []

  try {
    logs.push(`Starting SQL schema synchronization...`)

    const localUrl =
      process.env.DATABASE_URL?.includes("localhost") || process.env.DATABASE_URL?.includes("127.0.0.1")
        ? process.env.DATABASE_URL
        : `postgresql://postgres:postgres@127.0.0.1:5432/isp_system`

    const localPool = new Pool({ connectionString: localUrl })

    // Test connection
    await localPool.query("SELECT 1")
    logs.push(`✓ Connected to local PostgreSQL`)

    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), "scripts", "sync-all-146-tables.sql")
    const sqlContent = fs.readFileSync(sqlFilePath, "utf8")

    logs.push(`✓ Loaded SQL schema file`)

    // Execute the SQL
    await localPool.query(sqlContent)

    logs.push(`✓ Schema synchronization completed successfully!`)

    await localPool.end()

    return NextResponse.json({
      success: true,
      logs,
    })
  } catch (error: any) {
    logs.push(`✗ Error: ${error.message}`)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        logs,
      },
      { status: 500 },
    )
  }
}

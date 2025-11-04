import { NextResponse } from "next/server"
import { neon } from "@/lib/neon-wrapper"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== "string") {
      return NextResponse.json({ success: false, error: "Invalid query" }, { status: 400 })
    }

    // Basic SQL injection prevention - only allow SELECT, INSERT, UPDATE, DELETE
    const trimmedQuery = query.trim().toUpperCase()
    const allowedCommands = ["SELECT", "INSERT", "UPDATE", "DELETE", "WITH"]
    const firstWord = trimmedQuery.split(/\s+/)[0]

    if (!allowedCommands.includes(firstWord)) {
      return NextResponse.json(
        {
          success: false,
          error: `Only ${allowedCommands.join(", ")} queries are allowed`,
        },
        { status: 403 },
      )
    }

    // Prevent dangerous operations
    const dangerousPatterns = [
      /DROP\s+TABLE/i,
      /DROP\s+DATABASE/i,
      /TRUNCATE/i,
      /ALTER\s+TABLE/i,
      /CREATE\s+TABLE/i,
      /GRANT/i,
      /REVOKE/i,
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        return NextResponse.json(
          {
            success: false,
            error: "Dangerous operations are not allowed",
          },
          { status: 403 },
        )
      }
    }

    const sql = neon(process.env.DATABASE_URL!)
    const startTime = Date.now()

    // Execute the query
    const result = await sql.unsafe(query)
    const executionTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      rows: Array.isArray(result) ? result : [],
      rowCount: Array.isArray(result) ? result.length : 0,
      executionTime,
    })
  } catch (error: any) {
    console.error("Query execution error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Query execution failed",
      },
      { status: 500 },
    )
  }
}

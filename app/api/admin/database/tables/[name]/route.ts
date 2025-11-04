import { NextResponse } from "next/server"
import { neon } from "@/lib/neon-wrapper"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: { name: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "50")
    const search = searchParams.get("search") || ""
    const offset = (page - 1) * pageSize

    const sql = neon(process.env.DATABASE_URL!)
    const tableName = params.name

    // Validate table name to prevent SQL injection
    const validTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ${tableName}
    `

    if (validTables.length === 0) {
      return NextResponse.json({ success: false, error: "Table not found" }, { status: 404 })
    }

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total 
      FROM ${sql(tableName)}
    `
    const total = Number(countResult[0].total)

    // Get paginated data
    let rows
    if (search) {
      // Simple search across all columns (convert to text for searching)
      rows = await sql`
        SELECT * FROM ${sql(tableName)}
        WHERE ${sql(tableName)}::text ILIKE ${"%" + search + "%"}
        LIMIT ${pageSize} OFFSET ${offset}
      `
    } else {
      rows = await sql`
        SELECT * FROM ${sql(tableName)}
        LIMIT ${pageSize} OFFSET ${offset}
      `
    }

    return NextResponse.json({
      success: true,
      rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error: any) {
    console.error("Error fetching table data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch table data",
      },
      { status: 500 },
    )
  }
}

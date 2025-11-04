import { NextResponse } from "next/server"
import { neon } from "@/lib/neon-wrapper"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    // Get all tables with row counts
    const tables = await sql`
      SELECT 
        t.table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
        COALESCE(
          (SELECT reltuples::bigint 
           FROM pg_class 
           WHERE relname = t.table_name),
          0
        ) as row_count
      FROM information_schema.tables t
      WHERE t.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `

    return NextResponse.json({
      success: true,
      tables: tables.map((t) => ({
        table_name: t.table_name,
        column_count: Number(t.column_count),
        row_count: Number(t.row_count),
      })),
      databaseType: process.env.DATABASE_URL?.includes("localhost") ? "PostgreSQL (Local)" : "Neon (Cloud)",
    })
  } catch (error: any) {
    console.error("Error fetching tables:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch tables",
      },
      { status: 500 },
    )
  }
}

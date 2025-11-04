import { NextResponse } from "next/server"
import { neon } from "@/lib/neon-wrapper"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: { name: string } }) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const tableName = params.name

    // Get column information
    const columns = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = ${tableName}
      ORDER BY ordinal_position
    `

    // Get primary keys
    const primaryKeys = await sql`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = ${tableName}
      AND tc.constraint_type = 'PRIMARY KEY'
    `

    // Get foreign keys
    const foreignKeys = await sql`
      SELECT 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = ${tableName}
      AND tc.constraint_type = 'FOREIGN KEY'
    `

    return NextResponse.json({
      success: true,
      columns,
      primaryKeys: primaryKeys.map((pk) => pk.column_name),
      foreignKeys,
    })
  } catch (error: any) {
    console.error("Error fetching table schema:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch table schema",
      },
      { status: 500 },
    )
  }
}

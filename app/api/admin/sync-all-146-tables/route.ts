import { type NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"

export async function POST(request: NextRequest) {
  try {
    const neonUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL

    if (!neonUrl) {
      return NextResponse.json({ error: "Neon database URL not found" }, { status: 500 })
    }

    // Determine local PostgreSQL URL
    const localUrl =
      process.env.DATABASE_URL?.includes("localhost") || process.env.DATABASE_URL?.includes("127.0.0.1")
        ? process.env.DATABASE_URL
        : `postgresql://postgres:postgres@127.0.0.1:5432/isp_system`

    const { neon } = await import("@neondatabase/serverless")
    const neonSql = neon(neonUrl)
    const localPool = new Pool({ connectionString: localUrl })

    const logs: string[] = []
    let tablesCreated = 0
    let columnsAdded = 0

    // Get all tables from Neon dynamically
    const neonTables = await neonSql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `

    logs.push(`Found ${neonTables.length} tables in Neon database`)

    // Process each table
    for (const table of neonTables) {
      const tableName = table.table_name
      logs.push(`\n=== Processing table: ${tableName} ===`)

      try {
        // Get complete column definitions from Neon
        const neonColumns = await neonSql`
          SELECT 
            column_name,
            data_type,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${tableName}
          ORDER BY ordinal_position
        `

        // Check if table exists in local PostgreSQL
        const tableExistsResult = await localPool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
          )`,
          [tableName],
        )

        const tableExists = tableExistsResult.rows[0].exists

        if (!tableExists) {
          // Create table with all columns
          const columnDefs = neonColumns
            .map((col: any) => {
              let def = `"${col.column_name}" ${col.data_type.toUpperCase()}`

              if (col.data_type === "character varying" && col.character_maximum_length) {
                def = `"${col.column_name}" VARCHAR(${col.character_maximum_length})`
              } else if (col.data_type === "numeric" && col.numeric_precision) {
                def = `"${col.column_name}" NUMERIC(${col.numeric_precision}, ${col.numeric_scale || 0})`
              }

              if (col.is_nullable === "NO") {
                def += " NOT NULL"
              }

              if (col.column_default) {
                def += ` DEFAULT ${col.column_default}`
              }

              return def
            })
            .join(",\n  ")

          const createTableSQL = `CREATE TABLE "${tableName}" (\n  ${columnDefs}\n)`

          await localPool.query(createTableSQL)
          logs.push(`✓ Created table: ${tableName} with ${neonColumns.length} columns`)
          tablesCreated++
        } else {
          // Table exists - check for missing columns
          const localColumnsResult = await localPool.query(
            `SELECT column_name
             FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = $1`,
            [tableName],
          )

          const localColumnNames = new Set(localColumnsResult.rows.map((r: any) => r.column_name))
          const missingColumns = neonColumns.filter((col: any) => !localColumnNames.has(col.column_name))

          if (missingColumns.length > 0) {
            // Add missing columns
            for (const col of missingColumns) {
              let columnType = col.data_type.toUpperCase()

              if (col.data_type === "character varying" && col.character_maximum_length) {
                columnType = `VARCHAR(${col.character_maximum_length})`
              } else if (col.data_type === "numeric" && col.numeric_precision) {
                columnType = `NUMERIC(${col.numeric_precision}, ${col.numeric_scale || 0})`
              }

              let columnDef = columnType

              if (col.column_default) {
                columnDef += ` DEFAULT ${col.column_default}`
              }

              const alterSQL = `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${col.column_name}" ${columnDef}`

              await localPool.query(alterSQL)
              logs.push(`  ✓ Added column: ${tableName}.${col.column_name}`)
              columnsAdded++
            }
          } else {
            logs.push(`  ✓ Table ${tableName} already in sync`)
          }
        }
      } catch (error: any) {
        logs.push(`  ✗ Error processing ${tableName}: ${error.message}`)
      }
    }

    await localPool.end()

    logs.push(`\n✅ Sync complete!`)
    logs.push(`   Total tables checked: ${neonTables.length}`)
    logs.push(`   Tables created: ${tablesCreated}`)
    logs.push(`   Columns added: ${columnsAdded}`)

    return NextResponse.json({
      success: true,
      totalTables: neonTables.length,
      tablesCreated,
      columnsAdded,
      logs,
    })
  } catch (error: any) {
    console.error("Sync error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}

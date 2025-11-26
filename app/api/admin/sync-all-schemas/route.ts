import { NextResponse } from "next/server"
import { Pool } from "pg"

export async function POST() {
  try {
    console.log("[v0] Starting complete schema synchronization...")

    // Get the local PostgreSQL connection
    const localConnectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

    if (!localConnectionString) {
      return NextResponse.json({ error: "No local database connection string found" }, { status: 500 })
    }

    const localPool = new Pool({ connectionString: localConnectionString })

    // Get Neon connection
    const neonUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED

    if (!neonUrl) {
      return NextResponse.json({ error: "No Neon connection string found" }, { status: 500 })
    }

    const { neon } = await import("@neondatabase/serverless")
    const neonSql = neon(neonUrl)

    // Get all tables from Neon
    const neonTables = await neonSql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `

    const results: any[] = []
    let tablesCreated = 0
    let columnsAdded = 0
    let errors = 0

    // Process each table
    for (const tableRow of neonTables) {
      const tableName = tableRow.table_name

      try {
        // Check if table exists in local
        const localCheck = await localPool.query(
          `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `,
          [tableName],
        )

        const tableExists = localCheck.rows[0].exists

        if (!tableExists) {
          // Get CREATE TABLE statement from Neon
          const createStatement = await neonSql`
            SELECT 
              'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' ||
              string_agg(
                column_name || ' ' || 
                CASE 
                  WHEN data_type = 'character varying' THEN 'VARCHAR(' || COALESCE(character_maximum_length::text, '255') || ')'
                  WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP WITHOUT TIME ZONE'
                  WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMP WITH TIME ZONE'
                  WHEN data_type = 'USER-DEFINED' THEN udt_name
                  ELSE UPPER(data_type)
                END ||
                CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
                CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
                ', '
              ) || 
              ');'
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = ${tableName}
            GROUP BY table_name
          `

          if (createStatement.length > 0) {
            await localPool.query(createStatement[0].text)
            tablesCreated++
            results.push({ table: tableName, action: "created", status: "success" })
          }
        } else {
          // Table exists, check for missing columns
          const neonColumns = await neonSql`
            SELECT column_name, data_type, character_maximum_length, is_nullable, column_default, udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = ${tableName}
            ORDER BY ordinal_position
          `

          const localColumns = await localPool.query(
            `
            SELECT column_name, data_type, character_maximum_length, is_nullable, column_default, udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
          `,
            [tableName],
          )

          const localColumnNames = new Set(localColumns.rows.map((r: any) => r.column_name))
          const missingColumns = neonColumns.filter((nc) => !localColumnNames.has(nc.column_name))

          if (missingColumns.length > 0) {
            for (const col of missingColumns) {
              let colType = col.data_type
              if (colType === "character varying") {
                colType = `VARCHAR(${col.character_maximum_length || 255})`
              } else if (colType === "timestamp without time zone") {
                colType = "TIMESTAMP WITHOUT TIME ZONE"
              } else if (colType === "timestamp with time zone") {
                colType = "TIMESTAMP WITH TIME ZONE"
              } else if (colType === "USER-DEFINED") {
                colType = col.udt_name
              }

              const nullable = col.is_nullable === "YES" ? "" : " NOT NULL"
              const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : ""

              const addColumnSql = `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${col.column_name}" ${colType}${nullable}${defaultVal}`

              await localPool.query(addColumnSql)
              columnsAdded++
            }

            results.push({
              table: tableName,
              action: "columns_added",
              count: missingColumns.length,
              columns: missingColumns.map((c) => c.column_name),
              status: "success",
            })
          } else {
            results.push({ table: tableName, action: "up_to_date", status: "success" })
          }
        }
      } catch (error: any) {
        errors++
        results.push({
          table: tableName,
          action: "error",
          error: error.message,
          status: "failed",
        })
      }
    }

    await localPool.end()

    return NextResponse.json({
      success: true,
      summary: {
        totalTables: neonTables.length,
        tablesCreated,
        columnsAdded,
        errors,
      },
      results,
    })
  } catch (error: any) {
    console.error("[v0] Schema sync error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

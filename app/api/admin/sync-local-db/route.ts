import { NextResponse } from "next/server"
import { Pool } from "pg"
import { getSql } from "@/lib/db"

export async function POST() {
  try {
    // Get Neon connection string
    const neonConnectionString =
      process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING

    if (!neonConnectionString) {
      return NextResponse.json({ error: "Neon connection string not found" }, { status: 500 })
    }

    // Get local PostgreSQL connection
    const sql = await getSql()

    if (!sql || !sql.includes("localhost")) {
      return NextResponse.json({ error: "Not connected to local database" }, { status: 400 })
    }

    // Import Neon dynamically
    const { neon } = await import("@neondatabase/serverless")
    const neonClient = neon(neonConnectionString)
    const localPool = new Pool({ connectionString: sql })

    // Get all tables from Neon
    const tables = await neonClient`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `

    const synced = []
    const errors = []

    // Create missing tables
    for (const table of tables) {
      const tableName = table.table_name

      try {
        const exists = await localPool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_name = '${tableName}'
          );
        `)

        if (!exists.rows[0].exists) {
          // Get table structure
          const columns = await neonClient`
            SELECT 
              column_name,
              data_type,
              character_maximum_length,
              is_nullable,
              column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = ${tableName}
            ORDER BY ordinal_position
          `

          // Build CREATE TABLE statement
          let createTableSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (\n`
          const columnDefs = []

          for (const col of columns) {
            let colDef = `  ${col.column_name} ${col.data_type}`

            if (col.character_maximum_length) {
              colDef += `(${col.character_maximum_length})`
            }

            if (col.is_nullable === "NO") {
              colDef += " NOT NULL"
            }

            if (col.column_default) {
              colDef += ` DEFAULT ${col.column_default}`
            }

            columnDefs.push(colDef)
          }

          createTableSQL += columnDefs.join(",\n") + "\n);"

          await localPool.query(createTableSQL)
          synced.push(tableName)
        }
      } catch (error: any) {
        errors.push({ table: tableName, error: error.message })
      }
    }

    await localPool.end()

    return NextResponse.json({
      success: true,
      total_tables: tables.length,
      synced: synced.length,
      tables_synced: synced,
      errors: errors.length,
      error_details: errors,
    })
  } catch (error: any) {
    console.error("Database sync error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

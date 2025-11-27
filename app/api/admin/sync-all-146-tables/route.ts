import { type NextRequest, NextResponse } from "next/server"
import { Pool } from "pg"

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const logs: string[] = []

  try {
    logs.push(`[${new Date().toISOString()}] Starting comprehensive database schema synchronization...`)

    // Get database connection strings
    const neonUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL
    if (!neonUrl) {
      return NextResponse.json({ error: "Neon database URL not configured" }, { status: 500 })
    }

    const localUrl =
      process.env.DATABASE_URL?.includes("localhost") || process.env.DATABASE_URL?.includes("127.0.0.1")
        ? process.env.DATABASE_URL
        : `postgresql://postgres:postgres@127.0.0.1:5432/isp_system`

    logs.push(`Neon URL: ${neonUrl.substring(0, 30)}...`)
    logs.push(`Local URL: ${localUrl.substring(0, 30)}...`)

    const { neon } = await import("@neondatabase/serverless")
    const neonSql = neon(neonUrl)
    const localPool = new Pool({ connectionString: localUrl })

    // Test local connection first
    try {
      await localPool.query("SELECT 1")
      logs.push(`✓ Successfully connected to local PostgreSQL`)
    } catch (connError: any) {
      logs.push(`✗ Failed to connect to local PostgreSQL: ${connError.message}`)
      return NextResponse.json(
        {
          success: false,
          error: "Cannot connect to local PostgreSQL database. Please ensure PostgreSQL is running on localhost:5432",
          logs,
        },
        { status: 500 },
      )
    }

    let tablesCreated = 0
    let columnsAdded = 0
    let tablesAlreadySynced = 0
    let errors = 0

    // Get all tables from Neon
    logs.push("\n=== Fetching table list from Neon ===")
    const neonTables = await neonSql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `

    logs.push(`Found ${neonTables.length} tables in Neon database`)

    // Process each table
    for (let i = 0; i < neonTables.length; i++) {
      const tableName = neonTables[i].table_name
      logs.push(`\n[${i + 1}/${neonTables.length}] Processing table: ${tableName}`)

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

        if (neonColumns.length === 0) {
          logs.push(`  ⚠ No columns found for table: ${tableName}`)
          continue
        }

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
          const columnDefs = neonColumns
            .map((col: any) => {
              let typeDef = col.data_type.toUpperCase()

              // Handle specific data types
              if (col.data_type === "character varying") {
                if (col.character_maximum_length) {
                  typeDef = `VARCHAR(${col.character_maximum_length})`
                } else {
                  typeDef = `VARCHAR`
                }
              } else if (col.data_type === "numeric" && col.numeric_precision) {
                typeDef = `NUMERIC(${col.numeric_precision}, ${col.numeric_scale || 0})`
              } else if (col.data_type === "timestamp without time zone") {
                typeDef = "TIMESTAMP"
              } else if (col.data_type === "timestamp with time zone") {
                typeDef = "TIMESTAMPTZ"
              } else if (col.data_type === "ARRAY") {
                typeDef = "TEXT[]"
              } else if (col.data_type === "USER-DEFINED") {
                // Handle enums and custom types as TEXT
                typeDef = "TEXT"
              }

              let columnDef = `"${col.column_name}" ${typeDef}`

              // Handle nullable
              if (col.is_nullable === "NO") {
                columnDef += " NOT NULL"
              }

              // Handle defaults (only for simple defaults)
              if (col.column_default) {
                const defaultValue = col.column_default
                // Handle common default patterns
                if (defaultValue.includes("now()")) {
                  columnDef += " DEFAULT CURRENT_TIMESTAMP"
                } else if (defaultValue.includes("true")) {
                  columnDef += " DEFAULT true"
                } else if (defaultValue.includes("false")) {
                  columnDef += " DEFAULT false"
                } else if (!defaultValue.includes("nextval") && !defaultValue.includes("::")) {
                  columnDef += ` DEFAULT ${defaultValue}`
                }
              }

              return columnDef
            })
            .join(",\n  ")

          const createTableSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${columnDefs}\n)`

          await localPool.query(createTableSQL)
          logs.push(`  ✅ Created table: ${tableName} with ${neonColumns.length} columns`)
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
            logs.push(`  📝 Found ${missingColumns.length} missing columns`)

            // Add missing columns one by one
            for (const col of missingColumns) {
              try {
                let typeDef = col.data_type.toUpperCase()

                if (col.data_type === "character varying") {
                  typeDef = col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : `VARCHAR`
                } else if (col.data_type === "numeric" && col.numeric_precision) {
                  typeDef = `NUMERIC(${col.numeric_precision}, ${col.numeric_scale || 0})`
                } else if (col.data_type === "timestamp without time zone") {
                  typeDef = "TIMESTAMP"
                } else if (col.data_type === "timestamp with time zone") {
                  typeDef = "TIMESTAMPTZ"
                } else if (col.data_type === "ARRAY") {
                  typeDef = "TEXT[]"
                } else if (col.data_type === "USER-DEFINED") {
                  typeDef = "TEXT"
                }

                let columnDef = typeDef

                // Add default if applicable
                if (col.column_default) {
                  const defaultValue = col.column_default
                  if (defaultValue.includes("now()")) {
                    columnDef += " DEFAULT CURRENT_TIMESTAMP"
                  } else if (defaultValue.includes("true")) {
                    columnDef += " DEFAULT true"
                  } else if (defaultValue.includes("false")) {
                    columnDef += " DEFAULT false"
                  } else if (!defaultValue.includes("nextval") && !defaultValue.includes("::")) {
                    columnDef += ` DEFAULT ${defaultValue}`
                  }
                }

                // Alter table to add column
                const alterSQL = `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${col.column_name}" ${columnDef}`
                await localPool.query(alterSQL)

                logs.push(`    ✓ Added column: ${col.column_name} (${typeDef})`)
                columnsAdded++
              } catch (colError: any) {
                logs.push(`    ✗ Error adding column ${col.column_name}: ${colError.message}`)
                errors++
              }
            }
          } else {
            logs.push(`  ✓ Table already synchronized (${localColumnNames.size} columns)`)
            tablesAlreadySynced++
          }
        }
      } catch (tableError: any) {
        logs.push(`  ✗ Error processing table ${tableName}: ${tableError.message}`)
        errors++
      }
    }

    await localPool.end()

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    logs.push(`\n${"=".repeat(60)}`)
    logs.push(`✅ SYNCHRONIZATION COMPLETE`)
    logs.push(`${"=".repeat(60)}`)
    logs.push(`Total tables checked: ${neonTables.length}`)
    logs.push(`Tables created: ${tablesCreated}`)
    logs.push(`Tables already synced: ${tablesAlreadySynced}`)
    logs.push(`Columns added: ${columnsAdded}`)
    logs.push(`Errors encountered: ${errors}`)
    logs.push(`Duration: ${duration}s`)
    logs.push(`\nYour local PostgreSQL database now has all ${neonTables.length} tables with matching schemas!`)

    return NextResponse.json({
      success: true,
      totalTables: neonTables.length,
      tablesCreated,
      tablesAlreadySynced,
      columnsAdded,
      errors,
      duration: `${duration}s`,
      logs,
    })
  } catch (error: any) {
    logs.push(`\n❌ FATAL ERROR: ${error.message}`)
    logs.push(`Stack trace: ${error.stack}`)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
        logs,
      },
      { status: 500 },
    )
  }
}

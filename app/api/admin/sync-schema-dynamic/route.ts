import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function POST() {
  try {
    const sql = await getSql()

    const neonTables = await sql`
      SELECT 
        t.table_name,
        json_agg(
          json_build_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'is_nullable', c.is_nullable,
            'column_default', c.column_default
          ) ORDER BY c.ordinal_position
        ) as columns
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND c.table_schema = 'public'
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      GROUP BY t.table_name
      ORDER BY t.table_name
    `

    const localTables = await sql`
      SELECT 
        t.table_name,
        json_agg(
          json_build_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'is_nullable', c.is_nullable,
            'column_default', c.column_default
          ) ORDER BY c.ordinal_position
        ) as columns
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND c.table_schema = 'public'
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      GROUP BY t.table_name
      ORDER BY t.table_name
    `

    const localTableMap = new Map(
      localTables.map((table: any) => [
        table.table_name,
        new Set((table.columns || []).map((col: any) => col.column_name)),
      ]),
    )

    const sqlStatements: string[] = []
    const results: any[] = []
    let missingTables = 0
    let missingColumns = 0

    for (const neonTable of neonTables as any[]) {
      const tableName = neonTable.table_name
      const neonColumns = neonTable.columns || []

      if (!localTableMap.has(tableName)) {
        // Table doesn't exist in local - create it
        missingTables++
        const columnDefs = neonColumns
          .map((col: any) => {
            const nullable = col.is_nullable === "YES" ? "" : "NOT NULL"
            const defaultVal = col.column_default ? `DEFAULT ${col.column_default}` : ""
            return `  ${col.column_name} ${col.data_type} ${nullable} ${defaultVal}`.trim()
          })
          .join(",\n")

        const createTableSql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n${columnDefs}\n);`
        sqlStatements.push(createTableSql)
        results.push({
          table: tableName,
          action: "create_table",
          columns: neonColumns.length,
        })
      } else {
        // Table exists - check for missing columns
        const localColumns = localTableMap.get(tableName)!
        const missingCols = neonColumns.filter((col: any) => !localColumns.has(col.column_name))

        if (missingCols.length > 0) {
          for (const col of missingCols) {
            missingColumns++
            const nullable = col.is_nullable === "YES" ? "" : "NOT NULL"
            const defaultVal = col.column_default ? `DEFAULT ${col.column_default}` : ""
            const alterSql =
              `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${col.column_name} ${col.data_type} ${nullable} ${defaultVal};`.trim()
            sqlStatements.push(alterSql)
          }

          results.push({
            table: tableName,
            action: "add_columns",
            missing_columns: missingCols.map((c: any) => c.column_name),
          })
        }
      }
    }

    let successCount = 0
    let errorCount = 0
    const errors: any[] = []

    for (const statement of sqlStatements) {
      try {
        await sql.unsafe(statement)
        successCount++
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.code === "42701" || error.code === "42P07" || error.message?.includes("already exists")) {
          successCount++
        } else {
          errorCount++
          errors.push({
            statement: statement.substring(0, 100) + "...",
            error: error.message,
          })
        }
      }
    }

    return NextResponse.json({
      success: errorCount === 0,
      message: `Dynamic schema sync completed`,
      summary: {
        total_neon_tables: neonTables.length,
        total_local_tables: localTables.length,
        missing_tables: missingTables,
        missing_columns: missingColumns,
        statements_generated: sqlStatements.length,
        statements_executed: successCount,
        errors: errorCount,
      },
      results,
      errors: errorCount > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("[v0] Dynamic schema sync error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.toString(),
      },
      { status: 500 },
    )
  }
}

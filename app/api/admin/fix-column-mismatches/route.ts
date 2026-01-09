import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const sql = await getSql()

    const results = {
      tablesChecked: 0,
      tablesFix: 0,
      columnsAdded: 0,
      errors: [] as string[],
      details: [] as any[],
    }

    // Get all tables in the database
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `

    results.tablesChecked = tables.length

    // For each table, compare actual vs expected columns
    for (const table of tables) {
      const tableName = table.table_name

      try {
        // Get actual columns in the table
        const actualColumns = await sql`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
          ORDER BY ordinal_position
        `

        // Check if this is one of the tables with known issues
        const tableFixes: Record<string, string[]> = {
          customers: ["name", "first_name", "last_name", "id_number", "business_name", "customer_type"],
          company_profiles: ["name", "language", "currency", "timezone", "date_format", "time_format"],
          customer_services: [
            "mac_address",
            "pppoe_username",
            "pppoe_password",
            "lock_to_mac",
            "auto_renew",
            "location_id",
          ],
          network_devices: ["customer_auth_method"],
          locations: ["contact_person", "contact_phone", "contact_email", "notes"],
          routers: ["last_sync_status", "sync_error", "firmware_version", "model"],
          payments: ["payment_reference", "payment_channel"],
          radius_users: [], // Has MORE columns than expected - this is OK
          radius_sessions_active: [], // Has MORE columns - this is OK
          radius_sessions_archive: [], // Has MORE columns - this is OK
          radius_nas: [], // Has MORE columns - this is OK
          tasks: ["estimated_hours", "actual_hours"],
          backup_settings: [], // Has MORE columns - this is OK
          company_profiles: ["name", "language", "currency"],
          finance_audit_trail: ["changed_by"],
          capacity_predictions: ["prediction_accuracy", "model_version"],
          expense_approvals: ["approved_by", "approved_at", "approval_notes", "approval_level"],
          refunds: ["refund_method", "refund_reference", "refund_status", "processed_by", "processed_at"],
          bandwidth_patterns: ["pattern_type"],
        }

        const expectedColumns = tableFixes[tableName]
        if (!expectedColumns) continue // Skip tables without known fixes

        const actualColumnNames = actualColumns.map((c: any) => c.column_name)
        const missingColumns = expectedColumns.filter((col) => !actualColumnNames.includes(col))

        if (missingColumns.length > 0) {
          // Add missing columns based on common patterns
          for (const colName of missingColumns) {
            try {
              let dataType = "VARCHAR(255)"
              let defaultValue = "NULL"

              // Infer data type from column name
              if (colName.includes("_at") || colName.includes("date")) {
                dataType = "TIMESTAMP"
                defaultValue = "NULL"
              } else if (colName.includes("_id") || colName === "id") {
                dataType = "INTEGER"
                defaultValue = "NULL"
              } else if (colName.includes("is_") || colName.includes("lock_") || colName.includes("auto_")) {
                dataType = "BOOLEAN"
                defaultValue = "false"
              } else if (colName.includes("amount") || colName.includes("price") || colName.includes("cost")) {
                dataType = "DECIMAL(10,2)"
                defaultValue = "0"
              } else if (colName.includes("hours") || colName.includes("count") || colName.includes("percentage")) {
                dataType = "DECIMAL(10,2)"
                defaultValue = "0"
              }

              // Add the column
              await sql.unsafe(`
                ALTER TABLE ${tableName} 
                ADD COLUMN IF NOT EXISTS ${colName} ${dataType} DEFAULT ${defaultValue}
              `)

              results.columnsAdded++
              console.log(`[v0] Added column ${colName} to ${tableName}`)
            } catch (err: any) {
              console.error(`[v0] Error adding column ${colName} to ${tableName}:`, err)
              results.errors.push(`${tableName}.${colName}: ${err.message}`)
            }
          }

          results.tablesFix++
          results.details.push({
            table: tableName,
            missingColumns,
            actualCount: actualColumns.length,
            expectedCount: actualColumns.length + missingColumns.length,
          })
        }
      } catch (err: any) {
        console.error(`[v0] Error checking table ${tableName}:`, err)
        results.errors.push(`${tableName}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      message: `Checked ${results.tablesChecked} tables, fixed ${results.tablesFix} tables, added ${results.columnsAdded} columns`,
      results,
    })
  } catch (error: any) {
    console.error("[v0] Column mismatch fix error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fix column mismatches",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

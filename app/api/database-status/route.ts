import { NextResponse } from "next/server"
import { neon } from "@/lib/neon-wrapper"

export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Check database connection
    const connectionTest = await sql`SELECT 1 as test`

    // Get table information
    const tables = await sql`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `

    // Get total record counts for main tables
    const recordCounts: Record<string, number> = {}
    const mainTables = ["customers", "service_plans", "payments", "network_devices", "employees"]

    for (const table of mainTables) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`
        recordCounts[table] = Number.parseInt(result[0].count)
      } catch (error) {
        recordCounts[table] = 0
      }
    }

    // Check specific module schemas
    const moduleStatus = {
      customers: await checkCustomerSchema(),
      billing: await checkBillingSchema(),
      network: await checkNetworkSchema(),
      hr: await checkHRSchema(),
    }

    const totalRecords = Object.values(recordCounts).reduce((sum: number, count: number) => sum + count, 0)

    return NextResponse.json({
      success: true,
      connection: "connected",
      tables: tables.length,
      totalRecords,
      recordCounts,
      moduleStatus,
      tableList: tables,
      lastChecked: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Database status error:", error)

    let errorMessage = error.message || "Unknown database error"
    let errorHint = ""

    if (error.code === "ECONNREFUSED") {
      errorMessage = "Cannot connect to database"
      errorHint = "Check if PostgreSQL is running and DATABASE_URL is correct"
    } else if (error.message?.includes("does not exist")) {
      errorMessage = "Database or table does not exist"
      errorHint = "Run './install.sh' to create database tables"
    } else if (error.message?.includes("authentication failed")) {
      errorMessage = "Database authentication failed"
      errorHint = "Check database credentials in .env.local"
    }

    return NextResponse.json(
      {
        success: false,
        connection: "failed",
        error: errorMessage,
        hint: errorHint,
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}

async function checkCustomerSchema() {
  try {
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customers'
    `

    const requiredColumns = ["customer_type", "plan", "monthly_fee", "balance", "connection_quality"]
    const existingColumns = columns.map((col: any) => col.column_name)
    const missingColumns = requiredColumns.filter((col) => !existingColumns.includes(col))

    return {
      status: missingColumns.length === 0 ? "complete" : "missing_columns",
      missingColumns,
      totalColumns: existingColumns.length,
    }
  } catch (error: any) {
    return { status: "error", error: error.message }
  }
}

async function checkBillingSchema() {
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('payments', 'invoices', 'service_plans')
    `

    const requiredTables = ["payments", "service_plans"]
    const existingTables = tables.map((t: any) => t.table_name)
    const missingTables = requiredTables.filter((table) => !existingTables.includes(table))

    return {
      status: missingTables.length === 0 ? "complete" : "missing_tables",
      missingTables,
      existingTables,
    }
  } catch (error: any) {
    return { status: "error", error: error.message }
  }
}

async function checkNetworkSchema() {
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('network_devices', 'ip_addresses', 'subnets')
    `

    const requiredTables = ["network_devices", "ip_addresses"]
    const existingTables = tables.map((t: any) => t.table_name)
    const missingTables = requiredTables.filter((table) => !existingTables.includes(table))

    return {
      status: missingTables.length === 0 ? "complete" : "partial",
      missingTables,
      existingTables,
    }
  } catch (error: any) {
    return { status: "error", error: error.message }
  }
}

async function checkHRSchema() {
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('employees', 'payroll', 'leave_requests')
    `

    return {
      status: tables.length > 0 ? "complete" : "missing_tables",
      existingTables: tables.map((t: any) => t.table_name),
    }
  } catch (error: any) {
    return { status: "error", error: error.message }
  }
}

import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const healthReport = {
      connectivity: { status: "unknown", message: "", timestamp: new Date().toISOString() },
      tables: { status: "unknown", details: [], missing: [], extra: [] },
      relationships: { status: "unknown", details: [], issues: [] },
      dataIntegrity: { status: "unknown", details: [], issues: [] },
      performance: { status: "unknown", details: [] },
      overall: { status: "unknown", score: 0 },
    }

    // 1. Test Database Connectivity
    try {
      const connectTest = await sql`SELECT NOW() as current_time, version() as db_version`
      healthReport.connectivity = {
        status: "healthy",
        message: `Connected successfully. PostgreSQL ${connectTest[0].db_version.split(" ")[1]}`,
        timestamp: connectTest[0].current_time,
      }
    } catch (error) {
      healthReport.connectivity = {
        status: "error",
        message: `Connection failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json(healthReport)
    }

    // 2. Check Required Tables
    const requiredTables = [
      "customers",
      "service_plans",
      "customer_services",
      "payments",
      "employees",
      "payroll",
      "leave_requests",
      "invoices",
      "support_tickets",
      "analytics_data",
      "audit_logs",
      "messages",
      "network_devices",
      "ip_addresses",
      "subnets",
    ]

    const existingTablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `
    const existingTables = existingTablesResult.map((t) => t.table_name)

    const missingTables = requiredTables.filter((table) => !existingTables.includes(table))
    const extraTables = existingTables.filter((table) => !requiredTables.includes(table))

    healthReport.tables = {
      status: missingTables.length === 0 ? "healthy" : "warning",
      details: existingTables.map((table) => ({ name: table, status: "exists" })),
      missing: missingTables,
      extra: extraTables,
    }

    // 3. Check Table Relationships and Foreign Keys
    const foreignKeysResult = await sql`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name
    `

    const relationshipIssues = []
    for (const fk of foreignKeysResult) {
      try {
        // Check if foreign key references exist
        const checkResult = await sql`
          SELECT COUNT(*) as orphaned_count
          FROM ${sql(fk.table_name)} t1
          LEFT JOIN ${sql(fk.foreign_table_name)} t2 
            ON t1.${sql(fk.column_name)} = t2.${sql(fk.foreign_column_name)}
          WHERE t1.${sql(fk.column_name)} IS NOT NULL 
            AND t2.${sql(fk.foreign_column_name)} IS NULL
        `

        if (Number.parseInt(checkResult[0].orphaned_count) > 0) {
          relationshipIssues.push({
            table: fk.table_name,
            column: fk.column_name,
            issue: `${checkResult[0].orphaned_count} orphaned records`,
            severity: "warning",
          })
        }
      } catch (error) {
        relationshipIssues.push({
          table: fk.table_name,
          column: fk.column_name,
          issue: `Cannot validate: ${error.message}`,
          severity: "error",
        })
      }
    }

    healthReport.relationships = {
      status: relationshipIssues.length === 0 ? "healthy" : "warning",
      details: foreignKeysResult.map((fk) => ({
        table: fk.table_name,
        column: fk.column_name,
        references: `${fk.foreign_table_name}.${fk.foreign_column_name}`,
        constraint: fk.constraint_name,
      })),
      issues: relationshipIssues,
    }

    // 4. Data Integrity Checks
    const integrityIssues = []

    // Check for customers without required fields
    if (existingTables.includes("customers")) {
      const customerIssues = await sql`
        SELECT 
          COUNT(*) FILTER (WHERE name IS NULL OR name = '') as missing_names,
          COUNT(*) FILTER (WHERE email IS NULL OR email = '') as missing_emails,
          COUNT(*) FILTER (WHERE phone IS NULL OR phone = '') as missing_phones,
          COUNT(*) as total_customers
        FROM customers
      `

      const customer = customerIssues[0]
      if (Number.parseInt(customer.missing_names) > 0) {
        integrityIssues.push({
          table: "customers",
          issue: `${customer.missing_names} customers missing names`,
          severity: "warning",
        })
      }
      if (Number.parseInt(customer.missing_emails) > 0) {
        integrityIssues.push({
          table: "customers",
          issue: `${customer.missing_emails} customers missing emails`,
          severity: "warning",
        })
      }
    }

    // Check for duplicate emails
    if (existingTables.includes("customers")) {
      const duplicateEmails = await sql`
        SELECT email, COUNT(*) as count
        FROM customers 
        WHERE email IS NOT NULL AND email != ''
        GROUP BY email 
        HAVING COUNT(*) > 1
      `

      if (duplicateEmails.length > 0) {
        integrityIssues.push({
          table: "customers",
          issue: `${duplicateEmails.length} duplicate email addresses found`,
          severity: "error",
        })
      }
    }

    healthReport.dataIntegrity = {
      status: integrityIssues.filter((i) => i.severity === "error").length === 0 ? "healthy" : "error",
      details: [],
      issues: integrityIssues,
    }

    // 5. Performance Checks
    const performanceDetails = []

    // Check table sizes
    const tableSizes = await sql`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE schemaname = 'public'
      ORDER BY tablename, attname
    `

    // Check for missing indexes on foreign keys
    const missingIndexes = await sql`
      SELECT 
        t.table_name,
        kcu.column_name
      FROM information_schema.table_constraints t
      JOIN information_schema.key_column_usage kcu 
        ON t.constraint_name = kcu.constraint_name
      WHERE t.constraint_type = 'FOREIGN KEY'
        AND NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = t.table_name 
            AND indexdef LIKE '%' || kcu.column_name || '%'
        )
    `

    performanceDetails.push({
      metric: "Table Statistics",
      value: `${tableSizes.length} columns analyzed`,
      status: "info",
    })

    if (missingIndexes.length > 0) {
      performanceDetails.push({
        metric: "Missing Indexes",
        value: `${missingIndexes.length} foreign keys without indexes`,
        status: "warning",
      })
    }

    healthReport.performance = {
      status: missingIndexes.length === 0 ? "healthy" : "warning",
      details: performanceDetails,
    }

    // 6. Calculate Overall Health Score
    let score = 100
    if (healthReport.connectivity.status !== "healthy") score -= 40
    if (healthReport.tables.status !== "healthy") score -= 20
    if (healthReport.relationships.status !== "healthy") score -= 15
    if (healthReport.dataIntegrity.status === "error") score -= 20
    if (healthReport.dataIntegrity.status === "warning") score -= 10
    if (healthReport.performance.status !== "healthy") score -= 5

    healthReport.overall = {
      status: score >= 90 ? "healthy" : score >= 70 ? "warning" : "error",
      score: Math.max(0, score),
    }

    return NextResponse.json(healthReport)
  } catch (error) {
    console.error("Database health check failed:", error)
    return NextResponse.json(
      {
        connectivity: { status: "error", message: error.message, timestamp: new Date().toISOString() },
        tables: { status: "unknown", details: [], missing: [], extra: [] },
        relationships: { status: "unknown", details: [], issues: [] },
        dataIntegrity: { status: "unknown", details: [], issues: [] },
        performance: { status: "unknown", details: [] },
        overall: { status: "error", score: 0 },
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  try {
    // Auto-fix common issues
    const fixes = []

    // Create missing tables
    const requiredTables = {
      service_plans: `
        CREATE TABLE IF NOT EXISTS service_plans (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          speed_mbps INTEGER NOT NULL,
          price_kes DECIMAL(10,2) NOT NULL,
          fup_limit_gb INTEGER,
          post_fup_speed_mbps INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `,
      customer_services: `
        CREATE TABLE IF NOT EXISTS customer_services (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
          service_plan_id UUID REFERENCES service_plans(id),
          status VARCHAR(50) DEFAULT 'active',
          installation_date DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `,
      payments: `
        CREATE TABLE IF NOT EXISTS payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
          amount_kes DECIMAL(10,2) NOT NULL,
          payment_method VARCHAR(50),
          transaction_id VARCHAR(255),
          status VARCHAR(50) DEFAULT 'completed',
          payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `,
    }

    for (const [tableName, createSQL] of Object.entries(requiredTables)) {
      try {
        await sql`${sql.unsafe(createSQL)}`
        fixes.push(`Created table: ${tableName}`)
      } catch (error) {
        if (!error.message.includes("already exists")) {
          fixes.push(`Failed to create ${tableName}: ${error.message}`)
        }
      }
    }

    // Add missing indexes
    const indexQueries = [
      "CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)",
      "CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status)",
      "CREATE INDEX IF NOT EXISTS idx_customer_services_customer_id ON customer_services(customer_id)",
      "CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id)",
      "CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date)",
    ]

    for (const indexQuery of indexQueries) {
      try {
        await sql`${sql.unsafe(indexQuery)}`
        fixes.push(`Created index: ${indexQuery.split(" ")[5]}`)
      } catch (error) {
        // Index might already exist
      }
    }

    return NextResponse.json({
      success: true,
      fixes,
      message: `Applied ${fixes.length} database fixes`,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}

import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("[v0] Starting comprehensive database integration test...")

    const testResults = {
      connectionStatus: "unknown",
      tableTests: {} as Record<string, any>,
      relationshipTests: {} as Record<string, any>,
      indexTests: {} as Record<string, any>,
      dataIntegrityTests: {} as Record<string, any>,
      overallScore: 0,
    }

    // Test 1: Database Connection
    try {
      await sql`SELECT 1`
      testResults.connectionStatus = "connected"
      console.log("[v0] ✓ Database connection successful")
    } catch (error) {
      testResults.connectionStatus = "failed"
      console.log("[v0] ✗ Database connection failed:", error)
      return NextResponse.json({ success: false, error: "Database connection failed", testResults })
    }

    // Test 2: Table Existence and Structure
    const expectedTables = [
      "customers",
      "service_plans",
      "customer_services",
      "payments",
      "network_devices",
      "ip_addresses",
      "subnets",
      "users",
      "system_config",
      "employees",
      "payroll",
      "leave_requests",
      "invoices",
      "invoice_items",
      "billing_cycles",
      "customer_communications",
      "support_tickets",
      "ticket_responses",
      "network_monitoring",
      "customer_usage",
      "service_outages",
      "financial_accounts",
      "transactions",
      "inventory_items",
      "inventory_movements",
      "system_logs",
      "notifications",
      "reports",
      "audit_trail",
      "customer_phone_numbers",
      "customer_emergency_contacts",
    ]

    for (const tableName of expectedTables) {
      try {
        const result = await sql`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = ${tableName} AND table_schema = 'public'
          ORDER BY ordinal_position
        `
        testResults.tableTests[tableName] = {
          exists: result.length > 0,
          columnCount: result.length,
          columns: result.map((col: any) => ({
            name: col.column_name,
            type: col.data_type,
            nullable: col.is_nullable === "YES",
            default: col.column_default,
          })),
        }
        console.log(`[v0] ✓ Table ${tableName}: ${result.length} columns`)
      } catch (error) {
        testResults.tableTests[tableName] = { exists: false, error: error }
        console.log(`[v0] ✗ Table ${tableName} test failed:`, error)
      }
    }

    // Test 3: Foreign Key Relationships
    const relationshipTests = [
      {
        name: "customer_services_to_customers",
        query: `SELECT COUNT(*) as count FROM customer_services cs 
                JOIN customers c ON cs.customer_id = c.id LIMIT 1`,
      },
      {
        name: "payments_to_customers",
        query: `SELECT COUNT(*) as count FROM payments p 
                JOIN customers c ON p.customer_id = c.id LIMIT 1`,
      },
      {
        name: "invoices_to_customers",
        query: `SELECT COUNT(*) as count FROM invoices i 
                JOIN customers c ON i.customer_id = c.id LIMIT 1`,
      },
      {
        name: "support_tickets_to_customers",
        query: `SELECT COUNT(*) as count FROM support_tickets st 
                JOIN customers c ON st.customer_id = c.id LIMIT 1`,
      },
      {
        name: "payroll_to_employees",
        query: `SELECT COUNT(*) as count FROM payroll p 
                JOIN employees e ON p.employee_id = e.id LIMIT 1`,
      },
    ]

    for (const test of relationshipTests) {
      try {
        let result
        if (test.name === "customer_services_to_customers") {
          result = await sql`SELECT COUNT(*) as count FROM customer_services cs 
                            JOIN customers c ON cs.customer_id = c.id LIMIT 1`
        } else if (test.name === "payments_to_customers") {
          result = await sql`SELECT COUNT(*) as count FROM payments p 
                            JOIN customers c ON p.customer_id = c.id LIMIT 1`
        } else if (test.name === "invoices_to_customers") {
          result = await sql`SELECT COUNT(*) as count FROM invoices i 
                            JOIN customers c ON i.customer_id = c.id LIMIT 1`
        } else if (test.name === "support_tickets_to_customers") {
          result = await sql`SELECT COUNT(*) as count FROM support_tickets st 
                            JOIN customers c ON st.customer_id = c.id LIMIT 1`
        } else if (test.name === "payroll_to_employees") {
          result = await sql`SELECT COUNT(*) as count FROM payroll p 
                            JOIN employees e ON p.employee_id = e.id LIMIT 1`
        }

        testResults.relationshipTests[test.name] = {
          success: true,
          result: result?.[0],
        }
        console.log(`[v0] ✓ Relationship test ${test.name} passed`)
      } catch (error) {
        testResults.relationshipTests[test.name] = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
        console.log(`[v0] ✗ Relationship test ${test.name} failed:`, error)
      }
    }

    // Test 4: Index Performance
    const indexTests = [
      { table: "customers", column: "email" },
      { table: "customers", column: "status" },
      { table: "payments", column: "customer_id" },
      { table: "support_tickets", column: "customer_id" },
      { table: "employees", column: "employee_id" },
    ]

    for (const test of indexTests) {
      try {
        const result = await sql`
          SELECT indexname, indexdef 
          FROM pg_indexes 
          WHERE tablename = ${test.table} 
          AND indexdef LIKE ${"%" + test.column + "%"}
        `
        testResults.indexTests[`${test.table}_${test.column}`] = {
          hasIndex: result.length > 0,
          indexes: result,
        }
        console.log(`[v0] ✓ Index test ${test.table}.${test.column}: ${result.length} indexes found`)
      } catch (error) {
        testResults.indexTests[`${test.table}_${test.column}`] = {
          hasIndex: false,
          error: error,
        }
        console.log(`[v0] ✗ Index test ${test.table}.${test.column} failed:`, error)
      }
    }

    // Test 5: Data Integrity and CRUD Operations
    const dataIntegrityTests = [
      {
        name: "customer_crud",
        test: async () => {
          // Test customer creation
          const insertResult = await sql`
            INSERT INTO customers (name, email, phone, address, customer_type, status)
            VALUES ('Test Customer', 'test@example.com', '+254700000000', 'Test Address', 'individual', 'active')
            RETURNING id
          `
          const customerId = insertResult[0].id

          // Test customer read
          const readResult = await sql`SELECT * FROM customers WHERE id = ${customerId}`

          // Test customer update
          await sql`UPDATE customers SET name = 'Updated Test Customer' WHERE id = ${customerId}`

          // Test customer delete
          await sql`DELETE FROM customers WHERE id = ${customerId}`

          return { success: true, customerId, operations: ["create", "read", "update", "delete"] }
        },
      },
      {
        name: "employee_crud",
        test: async () => {
          const insertResult = await sql`
            INSERT INTO employees (employee_id, first_name, last_name, email, position, department, hire_date, salary)
            VALUES ('TEST001', 'Test', 'Employee', 'test.employee@company.com', 'Tester', 'QA', CURRENT_DATE, 50000)
            RETURNING id
          `
          const employeeId = insertResult[0].id

          const readResult = await sql`SELECT * FROM employees WHERE id = ${employeeId}`
          await sql`UPDATE employees SET salary = 55000 WHERE id = ${employeeId}`
          await sql`DELETE FROM employees WHERE id = ${employeeId}`

          return { success: true, employeeId, operations: ["create", "read", "update", "delete"] }
        },
      },
      {
        name: "service_plan_crud",
        test: async () => {
          const insertResult = await sql`
            INSERT INTO service_plans (name, description, speed, price, status)
            VALUES ('Test Plan', 'Test service plan', '10 Mbps', 2500, 'active')
            RETURNING id
          `
          const planId = insertResult[0].id

          const readResult = await sql`SELECT * FROM service_plans WHERE id = ${planId}`
          await sql`UPDATE service_plans SET price = 3000 WHERE id = ${planId}`
          await sql`DELETE FROM service_plans WHERE id = ${planId}`

          return { success: true, planId, operations: ["create", "read", "update", "delete"] }
        },
      },
    ]

    for (const test of dataIntegrityTests) {
      try {
        const result = await test.test()
        testResults.dataIntegrityTests[test.name] = result
        console.log(`[v0] ✓ Data integrity test ${test.name} passed`)
      } catch (error) {
        testResults.dataIntegrityTests[test.name] = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
        console.log(`[v0] ✗ Data integrity test ${test.name} failed:`, error)
      }
    }

    // Calculate overall score
    const totalTests =
      1 + // connection
      expectedTables.length + // tables
      relationshipTests.length + // relationships
      indexTests.length + // indexes
      dataIntegrityTests.length // data integrity

    let passedTests = testResults.connectionStatus === "connected" ? 1 : 0

    // Count passed table tests
    passedTests += Object.values(testResults.tableTests).filter((test: any) => test.exists).length

    // Count passed relationship tests
    passedTests += Object.values(testResults.relationshipTests).filter((test: any) => test.success).length

    // Count passed index tests
    passedTests += Object.values(testResults.indexTests).filter((test: any) => test.hasIndex).length

    // Count passed data integrity tests
    passedTests += Object.values(testResults.dataIntegrityTests).filter((test: any) => test.success).length

    testResults.overallScore = Math.round((passedTests / totalTests) * 100)

    console.log(`[v0] Database integration test completed. Score: ${testResults.overallScore}%`)

    return NextResponse.json({
      success: true,
      message: "Database integration test completed",
      testResults,
      summary: {
        totalTests,
        passedTests,
        score: testResults.overallScore,
        tablesFound: Object.keys(testResults.tableTests).filter((table) => testResults.tableTests[table].exists).length,
        totalExpectedTables: expectedTables.length,
      },
    })
  } catch (error) {
    console.error("[v0] Database integration test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Database integration test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

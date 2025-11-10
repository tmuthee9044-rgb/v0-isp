#!/usr/bin/env tsx
/**
 * Database Connection Test Script
 *
 * Tests the database connection and verifies the dual database system is working correctly
 * for both offline PostgreSQL and Neon serverless databases.
 *
 * Usage: npx tsx scripts/test-connection.ts
 */

import { getSql } from "../lib/db"

interface TestResult {
  name: string
  status: "pass" | "fail"
  message: string
  duration?: number
}

const results: TestResult[] = []

function logTest(name: string, status: "pass" | "fail", message: string, duration?: number) {
  results.push({ name, status, message, duration })
  const icon = status === "pass" ? "✅" : "❌"
  const durationStr = duration ? ` (${duration}ms)` : ""
  console.log(`${icon} ${name}: ${message}${durationStr}`)
}

async function testBasicConnection() {
  const startTime = Date.now()
  try {
    const sql = await getSql()
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`
    const row = result.rows?.[0] || result[0]
    const duration = Date.now() - startTime

    logTest(
      "Basic Connection",
      "pass",
      `Connected successfully. PostgreSQL version: ${row.pg_version.split(" ")[0]}`,
      duration,
    )
    return true
  } catch (error: any) {
    const duration = Date.now() - startTime
    logTest("Basic Connection", "fail", error.message, duration)
    return false
  }
}

async function testDatabaseDetection() {
  const databaseUrl = process.env.DATABASE_URL || ""
  const isLocal = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
  const dbType = isLocal ? "Offline PostgreSQL" : "Neon Serverless"

  logTest(
    "Database Detection",
    "pass",
    `Detected ${dbType} (${databaseUrl.split("@")[1]?.split("/")[0] || "unknown host"})`,
  )
}

async function testTableAccess() {
  const startTime = Date.now()
  try {
    const sql = await getSql()
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `
    const tables = result.rows || result
    const duration = Date.now() - startTime

    if (tables.length === 0) {
      logTest("Table Access", "fail", "No tables found in database", duration)
      return false
    }

    logTest(
      "Table Access",
      "pass",
      `Found ${tables.length} tables: ${tables
        .slice(0, 3)
        .map((t: any) => t.table_name)
        .join(", ")}${tables.length > 3 ? "..." : ""}`,
      duration,
    )
    return true
  } catch (error: any) {
    const duration = Date.now() - startTime
    logTest("Table Access", "fail", error.message, duration)
    return false
  }
}

async function testCRUDOperations() {
  const startTime = Date.now()
  try {
    const sql = await getSql()

    // Test INSERT
    const insertResult = await sql`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address)
      VALUES (1, 'test_connection', 'system', 0, '{"test": true}', '127.0.0.1')
      RETURNING id
    `
    const logId = insertResult.rows?.[0]?.id || insertResult[0]?.id

    // Test SELECT
    const selectResult = await sql`
      SELECT * FROM activity_logs WHERE id = ${logId}
    `
    const log = selectResult.rows?.[0] || selectResult[0]

    // Test DELETE (cleanup)
    await sql`DELETE FROM activity_logs WHERE id = ${logId}`

    const duration = Date.now() - startTime

    if (log && log.action === "test_connection") {
      logTest("CRUD Operations", "pass", "INSERT, SELECT, DELETE operations successful", duration)
      return true
    } else {
      logTest("CRUD Operations", "fail", "Data mismatch in operations", duration)
      return false
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    logTest("CRUD Operations", "fail", error.message, duration)
    return false
  }
}

async function testParameterizedQueries() {
  const startTime = Date.now()
  try {
    const sql = await getSql()
    const testValue = "test@example.com"
    const result = await sql`
      SELECT ${testValue} as email, 
             ${123} as number,
             ${true} as boolean,
             ${new Date()} as timestamp
    `
    const row = result.rows?.[0] || result[0]
    const duration = Date.now() - startTime

    if (row.email === testValue && row.number === 123 && row.boolean === true) {
      logTest("Parameterized Queries", "pass", "All parameter types handled correctly", duration)
      return true
    } else {
      logTest("Parameterized Queries", "fail", "Parameter type mismatch", duration)
      return false
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    logTest("Parameterized Queries", "fail", error.message, duration)
    return false
  }
}

async function testTransactions() {
  const startTime = Date.now()
  try {
    const sql = await getSql()

    // Start transaction
    await sql`BEGIN`

    // Insert test record
    const insertResult = await sql`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
      VALUES (1, 'test_transaction', 'system', 0, '{"test": "rollback"}')
      RETURNING id
    `
    const logId = insertResult.rows?.[0]?.id || insertResult[0]?.id

    // Rollback
    await sql`ROLLBACK`

    // Verify rollback worked
    const checkResult = await sql`
      SELECT * FROM activity_logs WHERE id = ${logId}
    `
    const exists = (checkResult.rows || checkResult).length > 0

    const duration = Date.now() - startTime

    if (!exists) {
      logTest("Transactions", "pass", "BEGIN/ROLLBACK working correctly", duration)
      return true
    } else {
      logTest("Transactions", "fail", "ROLLBACK did not revert changes", duration)
      return false
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    logTest("Transactions", "fail", error.message, duration)
    return false
  }
}

async function runAllTests() {
  console.log("\n🧪 Database Connection Test Suite\n")
  console.log("=".repeat(60))
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`)
  console.log(`Database URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":***@") || "NOT SET"}`)
  console.log("=".repeat(60))
  console.log("")

  // Run tests
  await testDatabaseDetection()
  const basicConnected = await testBasicConnection()

  if (!basicConnected) {
    console.log("\n❌ Basic connection failed. Skipping remaining tests.\n")
    printSummary()
    process.exit(1)
  }

  await testTableAccess()
  await testParameterizedQueries()
  await testCRUDOperations()
  await testTransactions()

  console.log("")
  printSummary()

  // Exit with appropriate code
  const allPassed = results.every((r) => r.status === "pass")
  process.exit(allPassed ? 0 : 1)
}

function printSummary() {
  console.log("=".repeat(60))
  console.log("📊 Test Summary")
  console.log("=".repeat(60))

  const passed = results.filter((r) => r.status === "pass").length
  const failed = results.filter((r) => r.status === "fail").length
  const total = results.length

  console.log(`Total Tests: ${total}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)

  if (failed > 0) {
    console.log("\n❌ Failed Tests:")
    results.filter((r) => r.status === "fail").forEach((r) => console.log(`   - ${r.name}: ${r.message}`))
  }

  console.log("=".repeat(60))
  console.log("")

  if (failed === 0) {
    console.log("🎉 All tests passed! Your database connection is working perfectly.\n")
  } else {
    console.log("⚠️  Some tests failed. Check the errors above and refer to DATABASE_CONNECTION_GUIDE.md\n")
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error("\n💥 Unexpected error:", error)
  process.exit(1)
})

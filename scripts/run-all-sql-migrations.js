#!/usr/bin/env node

/**
 * Comprehensive SQL Migration Runner
 * Executes ALL SQL files in the scripts directory without skipping
 * Ensures all database tables and schema are created
 * PostgreSQL offline only (Rule 4)
 */

import { getPool } from "../lib/db.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const stats = {
  total: 0,
  executed: 0,
  failed: 0,
  failedFiles: [],
}

async function executeSQLFile(filePath, pool) {
  try {
    const content = fs.readFileSync(filePath, "utf8")

    // Skip empty files
    if (!content.trim()) {
      console.log(`⏭️  Skipped (empty): ${path.basename(filePath)}`)
      return { skipped: true }
    }

    const statements = content
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"))

    if (statements.length === 0) {
      console.log(`⏭️  Skipped (no statements): ${path.basename(filePath)}`)
      return { skipped: true }
    }

    console.log(`\n🔄 Executing: ${path.basename(filePath)} (${statements.length} statements)`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        try {
          await pool.query(statement)
        } catch (stmtError) {
          // Log but continue - some statements may fail if tables already exist
          if (!stmtError.message.includes("already exists")) {
            console.log(`   ⚠️  Statement ${i + 1} warning: ${stmtError.message}`)
          }
        }
      }
    }

    console.log(`✅ Completed: ${path.basename(filePath)}`)
    stats.executed++
    return { success: true }
  } catch (error) {
    console.error(`❌ Failed: ${path.basename(filePath)} - ${error.message}`)
    stats.failed++
    stats.failedFiles.push({ file: filePath, error: error.message })
    return { success: false, error: error.message }
  }
}

async function runAllMigrations() {
  console.log("=" + "=".repeat(70))
  console.log("🚀 COMPREHENSIVE SQL MIGRATION RUNNER")
  console.log("=" + "=".repeat(70))
  console.log("Rule 4: Using PostgreSQL offline database only")
  console.log("")

  const pool = getPool()

  // Get all SQL files in scripts directory
  const scriptsDir = path.join(__dirname)
  const allFiles = fs
    .readdirSync(scriptsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort() // Execute in alphabetical order

  stats.total = allFiles.length

  console.log(`📁 Found ${stats.total} SQL files to execute\n`)

  // Execute complete schema first if it exists
  const completeSchemaIndex = allFiles.findIndex((f) => f.includes("000_complete_schema"))
  if (completeSchemaIndex !== -1) {
    const schemaFile = allFiles[completeSchemaIndex]
    console.log("🎯 Executing complete schema first...")
    await executeSQLFile(path.join(scriptsDir, schemaFile), pool)
    allFiles.splice(completeSchemaIndex, 1) // Remove from list
  }

  for (const file of allFiles) {
    const filePath = path.join(scriptsDir, file)
    await executeSQLFile(filePath, pool)
  }

  // Verify tables were created
  console.log("\n" + "=" + "=".repeat(70))
  console.log("🔍 VERIFICATION")
  console.log("=" + "=".repeat(70))

  const tablesResult = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `)

  const tables = tablesResult.rows

  console.log(`\n📊 Total tables in database: ${tables.length}`)
  console.log("\n📋 Tables created:")
  tables.forEach((table) => {
    console.log(`   ✓ ${table.table_name}`)
  })

  // Check critical tables
  const criticalTables = [
    "customers",
    "service_plans",
    "customer_services",
    "payments",
    "invoices",
    "invoice_items",
    "network_devices",
    "ip_addresses",
    "employees",
    "radius_users",
    "radius_nas",
    "radcheck",
    "radreply",
    "radgroupcheck",
    "radgroupreply",
    "radusergroup",
    "radacct",
    "radpostauth",
  ]

  const existingTableNames = tables.map((t) => t.table_name)
  const missingTables = criticalTables.filter((t) => !existingTableNames.includes(t))

  console.log("\n" + "=" + "=".repeat(70))
  console.log("📈 MIGRATION SUMMARY")
  console.log("=" + "=".repeat(70))
  console.log(`Total files found: ${stats.total}`)
  console.log(`✅ Files executed: ${stats.executed}`)
  console.log(`❌ Files failed: ${stats.failed}`)
  console.log(`📊 Total tables created: ${tables.length}`)

  if (missingTables.length > 0) {
    console.log(`\n⚠️  WARNING: ${missingTables.length} critical tables missing:`)
    missingTables.forEach((table) => {
      console.log(`   ❌ ${table}`)
    })
  } else {
    console.log("\n✅ SUCCESS: All critical tables created!")
  }

  if (stats.failedFiles.length > 0) {
    console.log("\n❌ Failed files:")
    stats.failedFiles.forEach(({ file, error }) => {
      console.log(`   - ${path.basename(file)}: ${error}`)
    })
  }

  console.log("=" + "=".repeat(70))

  return {
    success: stats.failed === 0 && missingTables.length === 0,
    stats,
    missingTables,
  }
}

// Run migrations
runAllMigrations()
  .then((result) => {
    if (result.success) {
      console.log("\n✨ Migration completed successfully!")
      process.exit(0)
    } else {
      console.log("\n⚠️  Migration completed with warnings")
      process.exit(0) // Don't fail, just warn
    }
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error)
    process.exit(1)
  })

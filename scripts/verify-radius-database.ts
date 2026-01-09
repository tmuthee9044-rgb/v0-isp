#!/usr/bin/env tsx

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function verifyRadiusTables() {
  console.log("🔍 Checking RADIUS database tables...\n")

  const requiredTables = [
    "radius_users",
    "radius_nas",
    "radius_sessions_active",
    "radius_sessions_archive",
    "radius_accounting",
    "bandwidth_usage",
  ]

  try {
    // Check which tables exist
    const existingTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ANY(${requiredTables})
    `

    const existingTableNames = existingTables.map((t: any) => t.table_name)
    const missingTables = requiredTables.filter((t) => !existingTableNames.includes(t))

    console.log("✅ Existing tables:", existingTableNames.join(", ") || "None")
    if (missingTables.length > 0) {
      console.log("❌ Missing tables:", missingTables.join(", "))
    }

    // Check columns for existing tables
    for (const tableName of existingTableNames) {
      console.log(`\n📋 Columns in ${tableName}:`)
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
        ORDER BY ordinal_position
      `
      columns.forEach((col: any) => {
        console.log(`  - ${col.column_name} (${col.data_type})${col.is_nullable === "YES" ? " NULL" : " NOT NULL"}`)
      })
    }

    // Check indexes
    console.log("\n🔍 Checking indexes...")
    for (const tableName of existingTableNames) {
      const indexes = await sql`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = ${tableName}
      `
      if (indexes.length > 0) {
        console.log(`\n📇 Indexes on ${tableName}:`)
        indexes.forEach((idx: any) => {
          console.log(`  - ${idx.indexname}`)
        })
      }
    }

    if (missingTables.length > 0) {
      console.log("\n⚠️  Some RADIUS tables are missing!")
      console.log("Run the following command to create them:")
      console.log("  chmod +x scripts/create-radius-tables.sh && ./scripts/create-radius-tables.sh")
    } else {
      console.log("\n✅ All RADIUS tables exist and are ready to use!")
    }
  } catch (error: any) {
    console.error("❌ Error checking database:", error.message)
    process.exit(1)
  }
}

verifyRadiusTables()

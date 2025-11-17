import { Pool } from "pg"
import { neon } from "@neondatabase/serverless"

/**
 * Sync Local PostgreSQL Database Schema from Neon
 * This script ensures Rule 4 compliance by keeping both databases in sync
 */

async function syncDatabaseSchema() {
  console.log("🔄 Starting database schema sync...")

  // Get Neon connection
  const neonConnectionString =
    process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING

  if (!neonConnectionString) {
    throw new Error("❌ Neon connection string not found")
  }

  // Get local PostgreSQL connection
  const localConnectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/isp_db"

  console.log("📡 Connecting to Neon to get schema...")
  const neonClient = neon(neonConnectionString)

  console.log("🔧 Connecting to local PostgreSQL...")
  const localPool = new Pool({ connectionString: localConnectionString })

  try {
    // Get all table definitions from Neon
    const tables = await neonClient`
      SELECT 
        table_name,
        table_schema
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `

    console.log(`✅ Found ${tables.length} tables in Neon database`)

    // For each table, get its CREATE TABLE statement
    for (const table of tables) {
      const tableName = table.table_name

      try {
        // Check if table exists in local database
        const exists = await localPool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_name = '${tableName}'
          );
        `)

        if (!exists.rows[0].exists) {
          console.log(`📋 Creating table: ${tableName}`)

          // Get table structure from Neon
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

          // Create the table
          await localPool.query(createTableSQL)
          console.log(`✅ Created table: ${tableName}`)
        } else {
          console.log(`⏭️  Table already exists: ${tableName}`)
        }
      } catch (error: any) {
        console.error(`❌ Error processing table ${tableName}:`, error.message)
      }
    }

    console.log("✅ Database schema sync complete!")
  } catch (error: any) {
    console.error("❌ Schema sync failed:", error.message)
    throw error
  } finally {
    await localPool.end()
  }
}

// Run the sync
syncDatabaseSchema()
  .then(() => {
    console.log("🎉 Sync completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("💥 Sync failed:", error)
    process.exit(1)
  })

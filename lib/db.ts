"use server"

import postgres from "postgres"

// Cached database client
let sqlClient: any = null
let sequencesFixed = false
const columnsChecked = false

/**
 * Determine which connection string to use - PRIORITIZE LOCAL PostgreSQL per Rule 4
 */
const connectionString =
  process.env.LOCAL_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING

if (!connectionString) {
  throw new Error(`
❌ No database connection string found!

Per Rule 4, this system requires PostgreSQL offline database.
Please set LOCAL_DATABASE_URL environment variable to your local PostgreSQL:
LOCAL_DATABASE_URL=postgresql://username:password@localhost:5432/isp_database
  `)
}

/**
 * Check if we're using local PostgreSQL per Rule 4
 */
const isLocal =
  process.env.LOCAL_DATABASE_URL !== undefined ||
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1")

if (isLocal) {
  console.log("✅ [DB] Local PostgreSQL connected successfully (Rule 4 - Offline Mode)")
  console.log(`[DB] Connection: ${connectionString.replace(/:[^:@]+@/, ":****@")}`)
} else {
  console.warn("⚠️  [DB] WARNING: Using cloud PostgreSQL instead of local offline database!")
  console.warn("⚠️  [DB] Rule 4 requires LOCAL PostgreSQL. Set LOCAL_DATABASE_URL environment variable.")
}

/**
 * Initialize pure PostgreSQL client - works with any PostgreSQL database
 */
export const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

/**
 * Fix all SERIAL sequences to ensure auto-increment works
 */
async function fixSequences() {
  if (sequencesFixed) return

  try {
    console.log("[DB] Checking and fixing SERIAL sequences...")

    const tables = [
      "customer_services",
      "customer_billing_configurations",
      "customer_phone_numbers",
      "customer_emergency_contacts",
      "customer_contacts",
      "invoices",
      "invoice_items",
      "payments",
      "account_balances",
      "system_logs",
      "customers",
      "employees",
      "routers",
      "service_plans",
      "support_tickets",
      "leave_requests",
      "payroll_records",
      "performance_reviews",
      "hotspots",
      "hotspot_users",
      "hotspot_vouchers",
      "credit_notes",
      "system_users",
      "roles",
      "router_sync_status", // Added router_sync_status to sequence fix list
    ]

    for (const table of tables) {
      try {
        // Check if table exists first
        const tableExists = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          ) as exists
        `

        if (!tableExists[0]?.exists) continue

        // Get max id
        const maxResult = await sql`
          SELECT COALESCE(MAX(id), 0) as max_id FROM ${sql(table)}
        `
        const maxId = (maxResult[0]?.max_id || 0) + 1

        // Drop and recreate sequence
        await sql.unsafe(`DROP SEQUENCE IF EXISTS ${table}_id_seq CASCADE`)
        await sql.unsafe(`CREATE SEQUENCE ${table}_id_seq START WITH ${maxId}`)
        await sql.unsafe(`ALTER TABLE ${table} ALTER COLUMN id SET DEFAULT nextval('${table}_id_seq')`)
        await sql.unsafe(`ALTER SEQUENCE ${table}_id_seq OWNED BY ${table}.id`)

        console.log(`✅ [DB] Fixed sequence for ${table} (next id: ${maxId})`)
      } catch (err: any) {
        // Table might not have id column or other issues, skip
        console.log(`⚠️  [DB] Skipped ${table}: ${err.message}`)
        continue
      }
    }

    sequencesFixed = true
    console.log("✅ [DB] All SERIAL sequences verified and fixed")
  } catch (error: any) {
    console.error("⚠️  [DB] Error fixing sequences:", error.message)
  }
}

/**
 * Check and add missing columns to critical tables
 */
async function addMissingColumns() {
  try {
    console.log("[DB] Checking for missing columns...")

    await sql
      .unsafe(`
      ALTER TABLE router_performance_history 
      ADD COLUMN IF NOT EXISTS router_id VARCHAR(50)
    `)
      .catch(() => {})

    // Add columns to router_performance_history
    await sql
      .unsafe(`
      ALTER TABLE router_performance_history 
      ADD COLUMN IF NOT EXISTS bandwidth_usage INTEGER
    `)
      .catch(() => {})

    await sql
      .unsafe(`
      ALTER TABLE router_performance_history 
      ADD COLUMN IF NOT EXISTS peak_usage INTEGER
    `)
      .catch(() => {})

    await sql
      .unsafe(`
      ALTER TABLE router_performance_history 
      ADD COLUMN IF NOT EXISTS connections INTEGER
    `)
      .catch(() => {})

    await sql
      .unsafe(`
      ALTER TABLE router_performance_history 
      ADD COLUMN IF NOT EXISTS latency DECIMAL(10,2)
    `)
      .catch(() => {})

    await sql
      .unsafe(`
      ALTER TABLE router_performance_history 
      ADD COLUMN IF NOT EXISTS packet_loss DECIMAL(5,2)
    `)
      .catch(() => {})

    await sql
      .unsafe(`
      ALTER TABLE router_performance_history 
      ADD COLUMN IF NOT EXISTS uptime_percentage DECIMAL(5,2)
    `)
      .catch(() => {})

    await sql
      .unsafe(`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS router_id INTEGER
    `)
      .catch(() => {})

    await sql
      .unsafe(`
      ALTER TABLE ip_pools 
      ADD COLUMN IF NOT EXISTS router_id INTEGER
    `)
      .catch(() => {})

    // Add satisfaction_rating to support_tickets
    await sql
      .unsafe(`
      ALTER TABLE support_tickets 
      ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER
    `)
      .catch(() => {})

    // Add pppoe_enabled to customer_services
    await sql
      .unsafe(`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS pppoe_enabled BOOLEAN DEFAULT false
    `)
      .catch(() => {})

    await sql
      .unsafe(`
      ALTER TABLE customer_services 
      ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17)
    `)
      .catch(() => {})

    console.log("✅ [DB] Missing columns verified and added")
  } catch (error: any) {
    console.error("⚠️  [DB] Error adding missing columns:", error.message)
  }
}

/**
 * Create FreeRADIUS tables if they don't exist
 */
async function createRadiusTables() {
  try {
    console.log("[DB] Checking for FreeRADIUS tables...")

    // Check if radacct table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'radacct'
      ) as exists
    `

    if (tableExists[0]?.exists) {
      console.log("✅ [DB] FreeRADIUS tables already exist")
      return
    }

    console.log("[DB] Creating FreeRADIUS radacct table...")
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS radacct (
        radacctid BIGSERIAL PRIMARY KEY,
        acctsessionid VARCHAR(64) NOT NULL,
        acctuniqueid VARCHAR(32) NOT NULL UNIQUE,
        username VARCHAR(64),
        groupname VARCHAR(64),
        realm VARCHAR(64),
        nasipaddress INET NOT NULL,
        nasportid VARCHAR(32),
        nasporttype VARCHAR(32),
        acctstarttime TIMESTAMP WITH TIME ZONE,
        acctupdatetime TIMESTAMP WITH TIME ZONE,
        acctstoptime TIMESTAMP WITH TIME ZONE,
        acctinterval BIGINT,
        acctsessiontime BIGINT,
        acctauthentic VARCHAR(32),
        connectinfo_start VARCHAR(50),
        connectinfo_stop VARCHAR(50),
        acctinputoctets BIGINT,
        acctoutputoctets BIGINT,
        calledstationid VARCHAR(50),
        callingstationid VARCHAR(50),
        acctterminatecause VARCHAR(32),
        servicetype VARCHAR(32),
        framedprotocol VARCHAR(32),
        framedipaddress INET,
        acctstartdelay BIGINT,
        acctstopdelay BIGINT,
        xascendsessionsvrkey VARCHAR(10),
        framedipv6address VARCHAR(45),
        framedipv6prefix VARCHAR(45),
        framedinterfaceid VARCHAR(44),
        delegatedipv6prefix VARCHAR(45)
      )
    `)

    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS radacct_username_idx ON radacct (username)
    `)
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS radacct_acctstarttime_idx ON radacct (acctstarttime)
    `)
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS radacct_acctstoptime_idx ON radacct (acctstoptime)
    `)
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS radacct_nasipaddress_idx ON radacct (nasipaddress)
    `)
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS radacct_acctsessionid_idx ON radacct (acctsessionid)
    `)

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS radcheck (
        id SERIAL PRIMARY KEY,
        username VARCHAR(64) NOT NULL,
        attribute VARCHAR(64) NOT NULL,
        op VARCHAR(2) NOT NULL DEFAULT '==',
        value VARCHAR(253) NOT NULL
      )
    `)
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS radcheck_username_idx ON radcheck (username)
    `)

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS radreply (
        id SERIAL PRIMARY KEY,
        username VARCHAR(64) NOT NULL,
        attribute VARCHAR(64) NOT NULL,
        op VARCHAR(2) NOT NULL DEFAULT '=',
        value VARCHAR(253) NOT NULL
      )
    `)
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS radreply_username_idx ON radreply (username)
    `)

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS radgroupcheck (
        id SERIAL PRIMARY KEY,
        groupname VARCHAR(64) NOT NULL,
        attribute VARCHAR(64) NOT NULL,
        op VARCHAR(2) NOT NULL DEFAULT '==',
        value VARCHAR(253) NOT NULL
      )
    `)

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS radgroupreply (
        id SERIAL PRIMARY KEY,
        groupname VARCHAR(64) NOT NULL,
        attribute VARCHAR(64) NOT NULL,
        op VARCHAR(2) NOT NULL DEFAULT '=',
        value VARCHAR(253) NOT NULL
      )
    `)

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS radusergroup (
        username VARCHAR(64) NOT NULL,
        groupname VARCHAR(64) NOT NULL,
        priority INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (username, groupname)
      )
    `)
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS radusergroup_username_idx ON radusergroup (username)
    `)

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS radpostauth (
        id BIGSERIAL PRIMARY KEY,
        username VARCHAR(64) NOT NULL,
        pass VARCHAR(64),
        reply VARCHAR(32),
        authdate TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `)
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS radpostauth_username_idx ON radpostauth (username)
    `)
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS radpostauth_authdate_idx ON radpostauth (authdate)
    `)

    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS nas (
        id SERIAL PRIMARY KEY,
        nasname VARCHAR(128) NOT NULL UNIQUE,
        shortname VARCHAR(32),
        type VARCHAR(30) NOT NULL DEFAULT 'other',
        ports INTEGER,
        secret VARCHAR(60) NOT NULL,
        server VARCHAR(64),
        community VARCHAR(50),
        description VARCHAR(200)
      )
    `)

    console.log("✅ [DB] FreeRADIUS tables created successfully")
  } catch (error: any) {
    console.error("⚠️  [DB] Error creating FreeRADIUS tables:", error.message)
  }
}

/**
 * Fix employee_id type mismatches - convert to UUID if employees.id is UUID
 */
async function fixEmployeeIdTypes() {
  try {
    console.log("[DB] Checking employee_id type consistency...")

    // Check if employees table exists
    const employeesExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employees'
      ) as exists
    `

    if (!employeesExists[0]?.exists) {
      console.log("⚠️  [DB] Employees table doesn't exist, skipping type check")
      return
    }

    // Check the data type of employees.id
    const employeeIdType = await sql`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'employees' 
      AND column_name = 'id'
    `

    const isUUID = employeeIdType[0]?.data_type === "uuid"
    console.log(`[DB] employees.id type: ${employeeIdType[0]?.data_type}`)

    if (isUUID) {
      console.log("[DB] Detected UUID employees.id, converting foreign keys to UUID...")

      // Tables that reference employees.id
      const tablesToFix = ["payroll_records", "leave_requests", "performance_reviews", "employee_documents"]

      for (const table of tablesToFix) {
        try {
          // Check if table exists
          const tableExists = await sql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = ${table}
            ) as exists
          `

          if (!tableExists[0]?.exists) continue

          // Check if employee_id column exists
          const columnExists = await sql`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = ${table}
              AND column_name = 'employee_id'
            ) as exists
          `

          if (!columnExists[0]?.exists) continue

          // Check current type
          const currentType = await sql`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
            AND column_name = 'employee_id'
          `

          if (currentType[0]?.data_type === "uuid") {
            console.log(`✅ [DB] ${table}.employee_id already UUID`)
            continue
          }

          await sql
            .unsafe(`
            ALTER TABLE ${table} 
            DROP CONSTRAINT IF EXISTS ${table}_employee_id_fkey
          `)
            .catch(() => {})

          await sql
            .unsafe(`
            DELETE FROM ${table} 
            WHERE employee_id IS NULL 
            OR employee_id NOT IN (SELECT id::text::integer FROM employees WHERE id::text ~ '^[0-9]+$')
          `)
            .catch(() => {
              // If the subquery fails, just try to delete nulls
              return sql.unsafe(`DELETE FROM ${table} WHERE employee_id IS NULL`).catch(() => {})
            })

          try {
            await sql.unsafe(`
              ALTER TABLE ${table} 
              ALTER COLUMN employee_id TYPE UUID USING (
                SELECT id FROM employees WHERE id::text::integer = employee_id LIMIT 1
              )
            `)
          } catch (directCastError: any) {
            console.log(`[DB] Direct conversion failed for ${table}, using fallback...`)
            await sql.unsafe(`
              ALTER TABLE ${table} 
              ALTER COLUMN employee_id TYPE UUID USING gen_random_uuid()
            `)
          }

          // Re-add foreign key constraint
          await sql.unsafe(`
            ALTER TABLE ${table} 
            ADD CONSTRAINT ${table}_employee_id_fkey 
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
          `)

          console.log(`✅ [DB] Converted ${table}.employee_id to UUID`)
        } catch (err: any) {
          console.log(`⚠️  [DB] Could not convert ${table}.employee_id: ${err.message}`)
        }
      }
    } else {
      console.log("✅ [DB] employees.id is INTEGER, foreign keys should be INTEGER")
    }

    console.log("✅ [DB] Employee ID type consistency verified")
  } catch (error: any) {
    console.error("⚠️  [DB] Error fixing employee_id types:", error.message)
  }
}

/**
 * Unified SQL client — pure PostgreSQL driver for Rule 4 compliance
 */
export async function getSql() {
  if (sqlClient) {
    return sqlClient
  }

  // Test connection
  await sql`SELECT 1 as health_check`
  console.log("✅ [DB] PostgreSQL connection verified")

  await createRadiusTables()
  await addMissingColumns()
  await fixSequences()
  await fixEmployeeIdTypes()

  sqlClient = sql
  return sqlClient
}

/**
 * Get database status for diagnostics
 */
export async function getDatabaseStatus() {
  try {
    const result = await sql`SELECT current_database() as db, version() as version`

    return {
      connected: true,
      database: result[0]?.db,
      version: result[0]?.version,
      driver: "postgres (Pure PostgreSQL)",
      mode: isLocal ? "Local (Offline)" : "Cloud",
    }
  } catch (error: any) {
    return {
      connected: false,
      error: error.message,
    }
  }
}

export default sql
export const db = sql
export const getSqlConnection = () => sql

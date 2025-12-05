import { NextResponse } from "next/server"
import { Pool } from "pg"

export async function POST() {
  try {
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
      return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 500 })
    }

    // Parse connection details
    const url = new URL(connectionString.replace("postgresql://", "http://"))
    const dbUser = url.username
    const dbName = url.pathname.slice(1)

    console.log(`[v0] Fixing permissions for database: ${dbName}, user: ${dbUser}`)

    // Create a superuser connection (assuming we can connect as postgres)
    const superuserConnectionString = `postgresql://postgres@localhost:5432/${dbName}`
    const pool = new Pool({ connectionString: superuserConnectionString })

    // Transfer table ownership
    await pool.query(`
      DO $$
      DECLARE
          r RECORD;
      BEGIN
          -- Transfer ownership of all tables
          FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
          LOOP
              EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO ${dbUser}';
          END LOOP;
          
          -- Transfer ownership of all sequences
          FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
          LOOP
              EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequencename) || ' OWNER TO ${dbUser}';
          END LOOP;
      END$$;
    `)

    // Grant all privileges
    await pool.query(`
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${dbUser};
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${dbUser};
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${dbUser};
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${dbUser};
    `)

    await pool.end()

    console.log("[v0] ✓ Permissions fixed successfully")

    return NextResponse.json({
      success: true,
      message: "Database permissions fixed. You can now run the schema sync.",
      user: dbUser,
      database: dbName,
    })
  } catch (error: any) {
    console.error("[v0] Error fixing permissions:", error)
    return NextResponse.json(
      {
        error: "Failed to fix permissions",
        message: error.message,
        hint: "Run: sudo bash scripts/fix_database_permissions.sh",
      },
      { status: 500 },
    )
  }
}

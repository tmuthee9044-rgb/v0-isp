import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    // Test basic connection
    const sql = neon(process.env.DATABASE_URL!)

    // Test simple query
    const result = await sql`SELECT NOW() as current_time, version() as db_version`

    // Test table existence
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `

    return Response.json({
      status: "success",
      connection: "active",
      timestamp: result[0].current_time,
      database_version: result[0].db_version,
      existing_tables: tables.map((t) => t.table_name),
      environment_vars: {
        DATABASE_URL: process.env.DATABASE_URL ? "Set" : "Missing",
        POSTGRES_URL: process.env.POSTGRES_URL ? "Set" : "Missing",
      },
    })
  } catch (error) {
    console.error("Database connection error:", error)
    return Response.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        environment_vars: {
          DATABASE_URL: process.env.DATABASE_URL ? "Set" : "Missing",
          POSTGRES_URL: process.env.POSTGRES_URL ? "Set" : "Missing",
        },
      },
      { status: 500 },
    )
  }
}

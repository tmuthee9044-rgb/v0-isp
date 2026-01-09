import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Test basic connection
    const result = await sql`SELECT NOW() as current_time`

    // Test customers table
    const customerCount = await sql`SELECT COUNT(*) as count FROM customers`

    // Test if we can insert a test record
    const testInsert = await sql`
      INSERT INTO customers (name, email, phone, address, status, created_at, updated_at)
      VALUES ('Test Customer', 'test@example.com', '+254700000000', 'Test Address', 'active', NOW(), NOW())
      RETURNING id, name
    `

    // Clean up test record
    await sql`DELETE FROM customers WHERE email = 'test@example.com'`

    return NextResponse.json({
      success: true,
      connection: "Connected to Neon database",
      currentTime: result[0].current_time,
      customerCount: customerCount[0].count,
      testInsert: testInsert[0],
      message: "Database is working correctly",
    })
  } catch (error) {
    console.error("Database test failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown database error",
        message: "Database connection failed",
      },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/database"
import bcrypt from "bcryptjs"

// Helper to generate next id for tables that lack auto-increment
async function nextId(sql: any, table: string): Promise<number> {
  const result = await sql.unsafe(`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM ${table}`)
  return result[0]?.next_id || 1
}

export async function POST(request: NextRequest) {
  const sql = await getSql()

  try {
    const adminData = await request.json()

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminData.password, 12)

    // Check if user already exists
    const existingUser = await sql`SELECT id FROM users WHERE email = ${adminData.email}`
    
    if (existingUser.length > 0) {
      // Update existing user
      await sql`
        UPDATE users SET
          password_hash = ${hashedPassword},
          first_name = ${adminData.firstName},
          last_name = ${adminData.lastName},
          phone = ${adminData.phone || ""},
          role = 'admin',
          is_active = true,
          updated_at = NOW()
        WHERE email = ${adminData.email}
      `
    } else {
      // Create new admin user with explicit id
      const userId = await nextId(sql, 'users')
      await sql`
        INSERT INTO users (
          id,
          username, 
          email, 
          password_hash, 
          first_name, 
          last_name, 
          phone, 
          role, 
          is_active, 
          created_at, 
          updated_at
        ) VALUES (
          ${userId},
          ${adminData.email},
          ${adminData.email},
          ${hashedPassword},
          ${adminData.firstName},
          ${adminData.lastName},
          ${adminData.phone || ""},
          'admin',
          true,
          NOW(),
          NOW()
        )
      `
    }

    // Mark setup as complete
    await sql`
      INSERT INTO system_config (config_key, config_value, description, updated_at)
      VALUES ('setup_complete', 'true', 'Initial setup completed', NOW())
      ON CONFLICT (config_key) 
      DO UPDATE SET 
        config_value = EXCLUDED.config_value,
        updated_at = NOW()
    `

    return NextResponse.json({ success: true, message: "Admin account created successfully" })
  } catch (error) {
    console.error("Error creating admin account:", error)
    return NextResponse.json({ success: false, error: "Failed to create admin account" }, { status: 500 })
  }
}

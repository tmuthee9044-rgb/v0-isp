import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const adminData = await request.json()

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminData.password, 12)

    // Create admin user
    await sql`
      INSERT INTO users (
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
      ON CONFLICT (email) 
      DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        updated_at = NOW()
    `

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

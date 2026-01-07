import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/database"

export async function GET() {
  const sql = await getSql()

  try {
    console.log("[v0] Fetching users from database...")

    const users = await sql`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.status,
        u.created_at
      FROM users u
      ORDER BY u.created_at DESC
    `

    console.log(`[v0] Found ${users.length} users`)

    const roleStats = await sql`
      SELECT 
        role,
        COUNT(*) as user_count
      FROM users
      WHERE status = 'active'
      GROUP BY role
    `

    const roles = [
      {
        name: "Administrator",
        description: "Full system access and user management",
        permissions: ["All Permissions"],
        userCount: roleStats.find((r) => r.role === "administrator")?.user_count || 0,
      },
      {
        name: "Manager",
        description: "Manage customers, billing, and reports",
        permissions: ["Customer Management", "Billing", "Reports"],
        userCount: roleStats.find((r) => r.role === "manager")?.user_count || 0,
      },
      {
        name: "Technician",
        description: "Network operations and technical support",
        permissions: ["Network Management", "Support Tickets"],
        userCount: roleStats.find((r) => r.role === "technician")?.user_count || 0,
      },
      {
        name: "Accountant",
        description: "Financial management and reporting",
        permissions: ["Billing", "Financial Reports", "Payments"],
        userCount: roleStats.find((r) => r.role === "accountant")?.user_count || 0,
      },
    ]

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.username,
        email: user.email,
        role: user.role,
        department: "N/A",
        status: user.status,
        lastLogin: "N/A",
        employeeId: user.id,
      })),
      roles: roles,
    })
  } catch (error) {
    console.error("[v0] Error fetching user management data:", error)
    return NextResponse.json({ error: "Failed to fetch user management data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const sql = await getSql()

  try {
    const body = await request.json()
    const { action, data } = body

    console.log(`[v0] User management action: ${action}`)

    if (action === "create_user") {
      const { username, email, role, password } = data

      const encoder = new TextEncoder()
      const passwordData = encoder.encode(password + username)
      const hashBuffer = await crypto.subtle.digest("SHA-256", passwordData)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const passwordHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

      const result = await sql`
        INSERT INTO users (username, email, role, password_hash, status, created_at)
        VALUES (${username}, ${email}, ${role.toLowerCase()}, ${passwordHash}, 'active', NOW())
        RETURNING id, username, email, role
      `

      console.log(`[v0] Created user: ${result[0].username}`)

      return NextResponse.json({ success: true, user: result[0] })
    }

    if (action === "create_role") {
      console.log(`[v0] Role creation requested: ${data.name}`)
      return NextResponse.json({ success: true, message: "Roles are predefined in the system" })
    }

    if (action === "update_settings") {
      const settings = data

      const settingsToSave = [
        // Password Policy
        { key: "password_min_length", value: settings.passwordPolicy.minLength },
        { key: "password_expiry_days", value: settings.passwordPolicy.expiryDays },
        { key: "password_require_uppercase", value: settings.passwordPolicy.requireUppercase },
        { key: "password_require_numbers", value: settings.passwordPolicy.requireNumbers },
        { key: "password_require_special_chars", value: settings.passwordPolicy.requireSpecialChars },
        { key: "password_prevent_reuse", value: settings.passwordPolicy.preventReuse },
        // Session Management
        { key: "session_timeout_minutes", value: settings.sessionManagement.timeoutMinutes },
        { key: "max_login_attempts", value: settings.sessionManagement.maxLoginAttempts },
        { key: "lockout_duration_minutes", value: settings.sessionManagement.lockoutDurationMinutes },
        { key: "max_concurrent_sessions", value: settings.sessionManagement.maxConcurrentSessions },
        { key: "force_password_change", value: settings.sessionManagement.forcePasswordChange },
        { key: "remember_login_sessions", value: settings.sessionManagement.rememberLoginSessions },
        // Two Factor Authentication
        { key: "2fa_admin_enabled", value: settings.twoFactorAuthentication.admin2FAEnabled },
        { key: "2fa_optional_enabled", value: settings.twoFactorAuthentication.optional2FAEnabled },
        { key: "2fa_method_sms", value: settings.twoFactorAuthentication.methods.sms },
        { key: "2fa_method_email", value: settings.twoFactorAuthentication.methods.email },
        { key: "2fa_method_authenticator", value: settings.twoFactorAuthentication.methods.authenticatorApp },
        // Employee Integration
        { key: "employee_auto_create_accounts", value: settings.employeeIntegration.autoCreateAccounts },
        { key: "employee_auto_disable_terminated", value: settings.employeeIntegration.autoDisableTerminated },
        { key: "employee_sync_department_changes", value: settings.employeeIntegration.syncDepartmentChanges },
        { key: "employee_sync_contact_info", value: settings.employeeIntegration.syncContactInfo },
        { key: "employee_username_format", value: settings.employeeIntegration.usernameFormat },
        { key: "employee_email_domain", value: settings.employeeIntegration.emailDomain },
        { key: "employee_default_password_policy", value: settings.employeeIntegration.defaultPasswordPolicy },
        { key: "employee_account_notification_method", value: settings.employeeIntegration.accountNotificationMethod },
      ]

      for (const setting of settingsToSave) {
        await sql`
          INSERT INTO system_config (key, value, updated_at)
          VALUES (${setting.key}, ${JSON.stringify(setting.value)}, NOW())
          ON CONFLICT (key) DO UPDATE 
          SET value = ${JSON.stringify(setting.value)}, updated_at = NOW()
        `
      }

      console.log(`[v0] Updated ${settingsToSave.length} settings in database`)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Error in user management operation:", error)
    return NextResponse.json({ error: "Operation failed" }, { status: 500 })
  }
}

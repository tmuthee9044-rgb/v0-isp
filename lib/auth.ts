import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"

const sql = neon(process.env.DATABASE_URL!)

export interface User {
  id: string
  username: string
  email: string
  role: string
  permissions: string[]
  employee_id?: string
  first_name?: string
  last_name?: string
  department?: string
  status: string
}

export interface AuthSession {
  user: User
  token: string
  expires: Date
}

export class AuthService {
  private static JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
  private static TOKEN_EXPIRY = "24h"

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  static generateToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
      },
      this.JWT_SECRET,
      { expiresIn: this.TOKEN_EXPIRY },
    )
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET)
    } catch (error) {
      return null
    }
  }

  static async authenticateUser(email: string, password: string): Promise<AuthSession | null> {
    try {
      const [user] = await sql`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.password_hash,
          u.role,
          u.status,
          u.employee_id,
          e.first_name,
          e.last_name,
          e.department,
          ur.permissions
        FROM users u
        LEFT JOIN employees e ON u.employee_id = e.id
        LEFT JOIN user_roles ur ON u.role = ur.role_name
        WHERE u.email = ${email} AND u.status = 'active'
      `

      if (!user || !(await this.verifyPassword(password, user.password_hash))) {
        return null
      }

      const userData: User = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions ? user.permissions.split(",") : [],
        employee_id: user.employee_id,
        first_name: user.first_name,
        last_name: user.last_name,
        department: user.department,
        status: user.status,
      }

      const token = this.generateToken(userData)
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      // Store session in database
      await sql`
        INSERT INTO user_sessions (user_id, token, expires_at, created_at)
        VALUES (${user.id}, ${token}, ${expires.toISOString()}, NOW())
      `

      return {
        user: userData,
        token,
        expires,
      }
    } catch (error) {
      console.error("Authentication error:", error)
      return null
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const cookieStore = cookies()
      const token = cookieStore.get("auth-token")?.value

      if (!token) return null

      const decoded = this.verifyToken(token)
      if (!decoded) return null

      // Verify session exists and is valid
      const [session] = await sql`
        SELECT 
          us.expires_at,
          u.id,
          u.username,
          u.email,
          u.role,
          u.status,
          u.employee_id,
          e.first_name,
          e.last_name,
          e.department,
          ur.permissions
        FROM user_sessions us
        JOIN users u ON us.user_id = u.id
        LEFT JOIN employees e ON u.employee_id = e.id
        LEFT JOIN user_roles ur ON u.role = ur.role_name
        WHERE us.token = ${token} AND us.expires_at > NOW() AND u.status = 'active'
      `

      if (!session) return null

      return {
        id: session.id,
        username: session.username,
        email: session.email,
        role: session.role,
        permissions: session.permissions ? session.permissions.split(",") : [],
        employee_id: session.employee_id,
        first_name: session.first_name,
        last_name: session.last_name,
        department: session.department,
        status: session.status,
      }
    } catch (error) {
      console.error("Get current user error:", error)
      return null
    }
  }

  static async logout(token: string): Promise<void> {
    try {
      await sql`
        DELETE FROM user_sessions WHERE token = ${token}
      `
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  static hasPermission(user: User, permission: string): boolean {
    return user.permissions.includes(permission) || user.permissions.includes("*")
  }

  static hasRole(user: User, role: string): boolean {
    return user.role === role
  }

  static hasAnyRole(user: User, roles: string[]): boolean {
    return roles.includes(user.role)
  }
}

// Permission constants
export const PERMISSIONS = {
  // Customer Management
  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_CREATE: "customers.create",
  CUSTOMERS_EDIT: "customers.edit",
  CUSTOMERS_DELETE: "customers.delete",
  CUSTOMERS_APPROVE: "customers.approve",

  // Billing & Finance
  BILLING_VIEW: "billing.view",
  BILLING_CREATE: "billing.create",
  BILLING_EDIT: "billing.edit",
  BILLING_DELETE: "billing.delete",
  PAYMENTS_PROCESS: "payments.process",
  INVOICES_GENERATE: "invoices.generate",

  // Network Management
  NETWORK_VIEW: "network.view",
  NETWORK_CONFIGURE: "network.configure",
  NETWORK_MONITOR: "network.monitor",
  DEVICES_MANAGE: "devices.manage",

  // Support System
  SUPPORT_VIEW: "support.view",
  SUPPORT_CREATE: "support.create",
  SUPPORT_ASSIGN: "support.assign",
  SUPPORT_RESOLVE: "support.resolve",

  // User Management
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",
  ROLES_MANAGE: "roles.manage",

  // System Administration
  SYSTEM_CONFIG: "system.config",
  SYSTEM_LOGS: "system.logs",
  SYSTEM_BACKUP: "system.backup",
  REPORTS_VIEW: "reports.view",

  // HR Management
  HR_VIEW: "hr.view",
  HR_MANAGE: "hr.manage",
  PAYROLL_VIEW: "payroll.view",
  PAYROLL_PROCESS: "payroll.process",

  // All permissions
  ALL: "*",
} as const

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MANAGER: "manager",
  TECHNICIAN: "technician",
  SUPPORT_AGENT: "support_agent",
  ACCOUNTANT: "accountant",
  HR_MANAGER: "hr_manager",
  CUSTOMER: "customer",
} as const

#!/usr/bin/env node

import { exec } from "child_process"
import { promisify } from "util"
import { readFileSync, existsSync, writeFileSync } from "fs"
import { join } from "path"

const execAsync = promisify(exec)

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
}

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

async function checkPostgreSQLService(): Promise<boolean> {
  try {
    log("🔍 Checking PostgreSQL service...", colors.blue)

    // Check if PostgreSQL is running
    try {
      await execAsync("sudo systemctl is-active postgresql")
      log("✅ PostgreSQL service is running", colors.green)
      return true
    } catch {
      log("⚠️  PostgreSQL service is not running. Starting...", colors.yellow)
      try {
        await execAsync("sudo systemctl start postgresql")
        log("✅ PostgreSQL service started successfully", colors.green)
        return true
      } catch (error) {
        log("❌ Failed to start PostgreSQL service", colors.red)
        log("Please run: sudo systemctl start postgresql", colors.yellow)
        return false
      }
    }
  } catch (error) {
    log("⚠️  Could not check PostgreSQL service status", colors.yellow)
    return true // Continue anyway, might be running differently
  }
}

async function checkEnvFile(): Promise<boolean> {
  const envPath = join(process.cwd(), ".env.local")

  log("🔍 Checking .env.local file...", colors.blue)

  if (!existsSync(envPath)) {
    log("⚠️  .env.local file not found. Creating...", colors.yellow)

    const defaultEnv = `# Database Configuration (Offline PostgreSQL)
DATABASE_URL=postgresql://isp_user:isp_password@localhost:5432/isp_system
POSTGRES_URL=postgresql://isp_user:isp_password@localhost:5432/isp_system
POSTGRES_PRISMA_URL=postgresql://isp_user:isp_password@localhost:5432/isp_system
POSTGRES_URL_NON_POOLING=postgresql://isp_user:isp_password@localhost:5432/isp_system

# Note: Update these credentials to match your PostgreSQL setup
# Run ./install.sh to set up the database automatically
`

    writeFileSync(envPath, defaultEnv)
    log("✅ Created .env.local with default PostgreSQL configuration", colors.green)
    log("⚠️  Please update credentials if needed", colors.yellow)
  } else {
    log("✅ .env.local file exists", colors.green)
  }

  return true
}

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    log("🔍 Testing database connection...", colors.blue)

    // Load environment variables
    const envPath = join(process.cwd(), ".env.local")
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, "utf-8")
      const dbUrl = envContent.match(/DATABASE_URL=(.+)/)?.[1]

      if (dbUrl) {
        // Extract connection details
        const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
        if (match) {
          const [, user, password, host, port, database] = match

          // Test connection using psql
          try {
            await execAsync(
              `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${user} -d ${database} -c "SELECT 1;" > /dev/null 2>&1`,
            )
            log("✅ Database connection successful", colors.green)
            return true
          } catch {
            log("❌ Database connection failed", colors.red)
            log("⚠️  Run ./install.sh to set up the database", colors.yellow)
            return false
          }
        }
      }
    }

    log("⚠️  Could not test database connection", colors.yellow)
    return true // Continue anyway
  } catch (error) {
    log("⚠️  Could not test database connection", colors.yellow)
    return true // Continue anyway
  }
}

async function checkDatabaseTables(): Promise<boolean> {
  try {
    log("🔍 Checking database tables...", colors.blue)

    const envPath = join(process.cwd(), ".env.local")
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, "utf-8")
      const dbUrl = envContent.match(/DATABASE_URL=(.+)/)?.[1]

      if (dbUrl) {
        const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
        if (match) {
          const [, user, password, host, port, database] = match

          const requiredTables = [
            "customers",
            "service_plans",
            "customer_services",
            "payments",
            "invoices",
            "network_devices",
            "ip_addresses",
            "employees",
            "payroll",
            "leave_requests",
            "activity_logs",
            "schema_migrations",
          ]

          try {
            const { stdout } = await execAsync(
              `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${user} -d ${database} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"`,
            )

            const tableCount = Number.parseInt(stdout.trim())

            if (tableCount >= requiredTables.length) {
              log(`✅ Database has ${tableCount} tables`, colors.green)
              return true
            } else {
              log(`⚠️  Database has only ${tableCount} tables (expected ${requiredTables.length})`, colors.yellow)
              log("⚠️  Run ./install.sh to create missing tables", colors.yellow)
              return false
            }
          } catch {
            log("⚠️  Could not check database tables", colors.yellow)
            log("⚠️  Run ./install.sh to set up the database", colors.yellow)
            return false
          }
        }
      }
    }

    return true // Continue anyway
  } catch (error) {
    log("⚠️  Could not check database tables", colors.yellow)
    return true // Continue anyway
  }
}

async function main() {
  log("\n🚀 Running pre-development checks...\n", colors.blue)

  const checks = [
    { name: "PostgreSQL Service", fn: checkPostgreSQLService },
    { name: "Environment File", fn: checkEnvFile },
    { name: "Database Connection", fn: checkDatabaseConnection },
    { name: "Database Tables", fn: checkDatabaseTables },
  ]

  let allPassed = true

  for (const check of checks) {
    const passed = await check.fn()
    if (!passed) {
      allPassed = false
    }
    console.log("") // Empty line for spacing
  }

  if (allPassed) {
    log("✅ All checks passed! Starting development server...\n", colors.green)
  } else {
    log("⚠️  Some checks failed. The app may not work correctly.", colors.yellow)
    log("💡 Run ./install.sh to fix database issues.\n", colors.yellow)
  }

  // Always continue to start the dev server
  process.exit(0)
}

main().catch((error) => {
  log(`❌ Pre-dev check failed: ${error.message}`, colors.red)
  process.exit(0) // Don't block dev server from starting
})

#!/usr/bin/env node

/**
 * Automated migration script to update all API routes to use dual database system
 * This script updates routes from direct Neon imports to use getSql() from lib/db.ts
 *
 * Rule 4 Compliance: Ensures all routes support both PostgreSQL offline and Neon serverless
 */

const fs = require("fs")
const path = require("path")
const { glob } = require("glob")

// Statistics
const stats = {
  total: 0,
  migrated: 0,
  skipped: 0,
  errors: 0,
  files: [],
}

/**
 * Check if file needs migration
 */
function needsMigration(content) {
  return (
    content.includes('from "@neondatabase/serverless"') &&
    content.includes("const sql = neon(process.env.DATABASE_URL") &&
    !content.includes('from "@/lib/db"')
  )
}

/**
 * Migrate a single file
 */
function migrateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8")

    if (!needsMigration(content)) {
      stats.skipped++
      return { success: true, skipped: true }
    }

    let newContent = content

    // Step 1: Remove old Neon import
    newContent = newContent.replace(/import\s+\{\s*neon\s*\}\s+from\s+['"]@neondatabase\/serverless['"]\s*\n?/g, "")

    // Step 2: Add new import from lib/db (after other imports, before const sql line)
    if (!newContent.includes('from "@/lib/db"')) {
      // Find the last import statement
      const importRegex = /^import\s+.*from\s+['"].*['"]\s*$/gm
      const imports = newContent.match(importRegex)

      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1]
        const lastImportIndex = newContent.lastIndexOf(lastImport)
        const insertPosition = lastImportIndex + lastImport.length

        newContent =
          newContent.slice(0, insertPosition) + '\nimport { getSql } from "@/lib/db"' + newContent.slice(insertPosition)
      }
    }

    // Step 3: Replace const sql = neon(...) with getSql() call
    // Handle both with and without exclamation mark
    newContent = newContent.replace(
      /const\s+sql\s*=\s*neon$$process\.env\.DATABASE_URL!?$$/g,
      "// Dual database support: auto-detects Neon or local PostgreSQL\n  const sql = await getSql()",
    )

    // Step 4: Make handler functions async if they aren't already
    // Match GET, POST, PUT, DELETE, PATCH handlers
    const handlerRegex = /export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(/g
    newContent = newContent.replace(handlerRegex, (match, asyncKeyword, method) => {
      if (asyncKeyword) {
        return match // Already async
      }
      return `export async function ${method}(`
    })

    // Step 5: Add "use server" directive if not present
    if (!newContent.includes('"use server"') && !newContent.includes("'use server'")) {
      // Add after any existing directives or at the top
      if (newContent.startsWith("import")) {
        newContent = '"use server"\n\n' + newContent
      } else {
        newContent = '"use server"\n\n' + newContent
      }
    }

    // Write the migrated content
    fs.writeFileSync(filePath, newContent, "utf8")

    stats.migrated++
    stats.files.push(filePath)

    return { success: true, migrated: true }
  } catch (error) {
    stats.errors++
    console.error(`Error migrating ${filePath}:`, error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log("🚀 Starting dual database migration...\n")
  console.log("Rule 4: Migrating all routes to support both PostgreSQL offline and Neon serverless\n")

  // Find all API route files
  const apiFiles = await glob("app/api/**/*.ts", {
    ignore: ["**/*.d.ts", "**/node_modules/**"],
  })

  // Find all action files
  const actionFiles = await glob("app/actions/**/*.ts", {
    ignore: ["**/*.d.ts", "**/node_modules/**"],
  })

  const allFiles = [...apiFiles, ...actionFiles]
  stats.total = allFiles.length

  console.log(`Found ${stats.total} files to check\n`)

  // Migrate each file
  for (const file of allFiles) {
    const result = migrateFile(file)

    if (result.migrated) {
      console.log(`✅ Migrated: ${file}`)
    } else if (result.skipped) {
      // Silent skip
    } else if (!result.success) {
      console.log(`❌ Error: ${file} - ${result.error}`)
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(60))
  console.log("📊 Migration Summary")
  console.log("=".repeat(60))
  console.log(`Total files checked: ${stats.total}`)
  console.log(`✅ Successfully migrated: ${stats.migrated}`)
  console.log(`⏭️  Skipped (already migrated): ${stats.skipped}`)
  console.log(`❌ Errors: ${stats.errors}`)
  console.log("=".repeat(60))

  if (stats.migrated > 0) {
    console.log("\n✨ Migration complete! All routes now support dual database system.")
    console.log("📝 Changes made:")
    console.log("   - Removed direct Neon imports")
    console.log("   - Added getSql() from @/lib/db")
    console.log("   - Made handlers async")
    console.log('   - Added "use server" directives')
    console.log("\n🔄 The system now automatically detects and connects to:")
    console.log("   - Local PostgreSQL (127.0.0.1:5432) in development")
    console.log("   - Neon serverless in production")
  }

  process.exit(stats.errors > 0 ? 1 : 0)
}

// Run migration
main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})

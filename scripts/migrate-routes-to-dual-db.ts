/**
 * Migration Script: Update all API routes to use dual database system
 *
 * This script helps identify and update routes that need to be migrated
 * from direct Neon imports to the dual database system (lib/db.ts)
 */

import * as fs from "fs"
import * as path from "path"

interface RouteFile {
  path: string
  needsMigration: boolean
  usesDirectNeon: boolean
}

function scanDirectory(dir: string, results: RouteFile[] = []): RouteFile[] {
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      scanDirectory(filePath, results)
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      const content = fs.readFileSync(filePath, "utf-8")
      const usesDirectNeon =
        content.includes('from "@neondatabase/serverless"') || content.includes("from '@neondatabase/serverless'")
      const usesDualDb = content.includes('from "@/lib/db"') || content.includes("from '@/lib/db'")

      if (usesDirectNeon && !usesDualDb) {
        results.push({
          path: filePath,
          needsMigration: true,
          usesDirectNeon: true,
        })
      }
    }
  }

  return results
}

// Scan app/api directory
const apiDir = path.join(process.cwd(), "app", "api")
const routesToMigrate = scanDirectory(apiDir)

console.log(`Found ${routesToMigrate.length} routes that need migration:`)
routesToMigrate.forEach((route) => {
  console.log(`  - ${route.path.replace(process.cwd(), "")}`)
})

console.log("\nMigration pattern:")
console.log('FROM: import { neon } from "@neondatabase/serverless"')
console.log("      const sql = neon(process.env.DATABASE_URL!)")
console.log('\nTO:   import { getSql } from "@/lib/db"')
console.log("      const sql = await getSql()")

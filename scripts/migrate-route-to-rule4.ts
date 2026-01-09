import * as fs from "fs"
import { glob } from "glob"

async function fixRouteFile(filePath: string) {
  let content = fs.readFileSync(filePath, "utf-8")
  let modified = false

  // Check if file violates Rule 4
  if (!content.includes('from "@neondatabase/serverless"')) {
    return { filePath, modified: false, reason: "No violation found" }
  }

  // Replace the import
  content = content.replace(
    /import\s+{\s*neon\s*}\s+from\s+"@neondatabase\/serverless"/g,
    'import { getSql } from "@/lib/db"',
  )
  modified = true

  // Remove singleton sql instance
  content = content.replace(/\nconst sql = neon$$process\.env\.DATABASE_URL!?$$\n?/g, "\n")

  // Find all exported async functions (GET, POST, PUT, DELETE, PATCH)
  const functionPattern = /export async function (GET|POST|PUT|DELETE|PATCH)\s*$$[^)]*$$\s*{/g
  const matches = [...content.matchAll(functionPattern)]

  if (matches.length > 0) {
    // Add getSql() call at the start of each function
    let offset = 0
    for (const match of matches) {
      const insertPos = match.index! + match[0].length + offset
      const getSqlLine = "\n  const sql = await getSql()\n"

      // Check if already has getSql
      const functionBody = content.substring(insertPos, insertPos + 200)
      if (!functionBody.includes("getSql()")) {
        content = content.slice(0, insertPos) + getSqlLine + content.slice(insertPos)
        offset += getSqlLine.length
      }
    }
  }

  fs.writeFileSync(filePath, content, "utf-8")
  return { filePath, modified, reason: "Fixed successfully" }
}

async function main() {
  console.log("Finding all API routes with Rule 4 violations...")

  const files = await glob("app/api/**/*.ts")
  const violations: string[] = []

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8")
    if (content.includes('from "@neondatabase/serverless"')) {
      violations.push(file)
    }
  }

  console.log(`Found ${violations.length} files with violations`)
  console.log("Fixing files...")

  const results = []
  for (const file of violations) {
    try {
      const result = await fixRouteFile(file)
      results.push(result)
      if (result.modified) {
        console.log(`✓ Fixed: ${file}`)
      }
    } catch (error) {
      console.error(`✗ Error fixing ${file}:`, error)
      results.push({ filePath: file, modified: false, reason: `Error: ${error}` })
    }
  }

  console.log("\n=== Summary ===")
  console.log(`Total files processed: ${results.length}`)
  console.log(`Files fixed: ${results.filter((r) => r.modified).length}`)
  console.log(`Files skipped: ${results.filter((r) => !r.modified).length}`)
}

main().catch(console.error)

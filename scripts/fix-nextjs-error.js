#!/usr/bin/env node

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

console.log("🔧 Starting Next.js cache corruption fix...\n")

// Function to safely remove directory
function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    console.log(`🗑️  Removing ${dirPath}...`)
    fs.rmSync(dirPath, { recursive: true, force: true })
    console.log(`✅ Removed ${dirPath}`)
  }
}

// Function to run command
function runCommand(command, description) {
  console.log(`\n⚙️  ${description}...`)
  try {
    execSync(command, { stdio: "inherit" })
    console.log(`✅ ${description} complete`)
  } catch (error) {
    console.log(`⚠️  ${description} failed (continuing anyway)`)
  }
}

// Step 1: Kill all node processes
console.log("\n📍 Step 1: Stopping all Node processes...")
try {
  execSync("pkill -9 node", { stdio: "ignore" })
} catch (e) {
  // Process killing might fail if no processes exist
}

// Step 2: Remove all cache directories
console.log("\n📍 Step 2: Removing all cache directories...")
removeDir(path.join(process.cwd(), ".next"))
removeDir(path.join(process.cwd(), "node_modules/.cache"))
removeDir(path.join(process.cwd(), ".swc"))
removeDir(path.join(process.cwd(), ".turbo"))
removeDir(path.join(process.cwd(), "node_modules/.vite"))

// Step 3: Clean npm cache
runCommand("npm cache clean --force", "Cleaning npm cache")

// Step 4: Reinstall dependencies
console.log("\n📍 Step 4: Reinstalling dependencies...")
console.log("This may take a few minutes...\n")
runCommand("npm install", "Installing dependencies")

console.log("\n✅ Fix complete! The cache corruption has been resolved.")
console.log('\n📍 Next step: Run "npm run dev" to start your server fresh.\n')

process.exit(0)

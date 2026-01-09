const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")

console.log("🚀 ISP Management System - Post-Install Setup\n")

// Check if this is the first install
const lockFile = path.join(__dirname, "..", ".install.lock")
const isFirstInstall = !fs.existsSync(lockFile)

if (isFirstInstall) {
  console.log("✓ First time installation detected")
  console.log("✓ Running database migrations...\n")

  // Create lock file to prevent repeated auto-start
  fs.writeFileSync(lockFile, new Date().toISOString())

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("Installation complete! Starting development server...\n")
  console.log("To start manually in the future, run: npm run dev")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

  // Auto-start the development server in the background
  setTimeout(() => {
    const devProcess = spawn("npm", ["run", "dev"], {
      stdio: "inherit",
      shell: true,
      detached: false,
    })

    devProcess.on("error", (error) => {
      console.error("Failed to start development server:", error.message)
      console.log("\nPlease start manually with: npm run dev")
    })
  }, 1000)
} else {
  console.log("✓ System already configured")
  console.log("ℹ To start the server, run: npm run dev\n")
}

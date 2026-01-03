// Run this script to add missing columns to the database
async function executeMigration() {
  console.log("Executing database column migration...")

  const response = await fetch("http://localhost:3000/api/setup/add-columns", {
    method: "POST",
  })

  const result = await response.json()
  console.log("Migration result:", result)
}

executeMigration().catch(console.error)

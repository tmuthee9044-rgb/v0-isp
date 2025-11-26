// Run this script to immediately fix the locations table schema
// Usage: npx tsx scripts/fix-locations-immediate.ts

async function fixLocations() {
  console.log("Fixing locations table schema...")

  try {
    const response = await fetch("http://localhost:3000/api/admin/fix-locations-now", {
      method: "POST",
    })

    const result = await response.json()
    console.log("Result:", result)

    if (result.success) {
      console.log("✓ Locations table fixed successfully!")
    } else {
      console.error("✗ Failed to fix locations table:", result.error)
    }
  } catch (error) {
    console.error("✗ Error:", error)
  }
}

fixLocations()

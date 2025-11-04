import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { fileData, columnMapping } = await request.json()

    if (!fileData || !columnMapping) {
      return NextResponse.json({ error: "Missing file data or column mapping" }, { status: 400 })
    }

    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < fileData.rows.length; i++) {
      const row = fileData.rows[i]

      try {
        // Map row data to vehicle fields
        const vehicleData: any = {}

        Object.entries(columnMapping).forEach(([vehicleField, fileColumn]) => {
          if (fileColumn) {
            const columnIndex = fileData.headers.indexOf(fileColumn as string)
            if (columnIndex !== -1) {
              vehicleData[vehicleField] = row[columnIndex] || null
            }
          }
        })

        // Validate required fields
        if (!vehicleData.vehicle_number || !vehicleData.make || !vehicleData.model || !vehicleData.year) {
          errors.push(`Row ${i + 1}: Missing required fields`)
          continue
        }

        // Check for duplicate vehicle number
        const existingVehicle = await sql`
          SELECT id FROM vehicles WHERE vehicle_number = ${vehicleData.vehicle_number}
        `

        if (existingVehicle.length > 0) {
          errors.push(`Row ${i + 1}: Vehicle ${vehicleData.vehicle_number} already exists`)
          continue
        }

        // Convert numeric fields
        const year = Number.parseInt(vehicleData.year) || new Date().getFullYear()
        const engineCapacity = vehicleData.engine_capacity ? Number.parseFloat(vehicleData.engine_capacity) : null
        const seatingCapacity = vehicleData.seating_capacity ? Number.parseInt(vehicleData.seating_capacity) : null

        // Insert vehicle
        await sql`
          INSERT INTO vehicles (
            vehicle_number, make, model, year, vehicle_type, fuel_type,
            engine_capacity, seating_capacity, insurance_policy, registration_date,
            status, created_at, updated_at
          ) VALUES (
            ${vehicleData.vehicle_number}, ${vehicleData.make}, ${vehicleData.model},
            ${year}, ${vehicleData.vehicle_type || "car"}, ${vehicleData.fuel_type || "petrol"},
            ${engineCapacity}, ${seatingCapacity}, ${vehicleData.insurance_policy},
            ${vehicleData.registration_date}, ${vehicleData.status || "active"},
            NOW(), NOW()
          )
        `

        imported++
      } catch (error) {
        console.error(`Error importing vehicle row ${i + 1}:`, error)
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Import failed"}`)
      }
    }

    return NextResponse.json({
      imported,
      errors,
      total: fileData.rows.length,
      message: `Successfully imported ${imported} vehicles`,
    })
  } catch (error) {
    console.error("Vehicle import processing error:", error)
    return NextResponse.json({ error: "Failed to process vehicle import" }, { status: 500 })
  }
}

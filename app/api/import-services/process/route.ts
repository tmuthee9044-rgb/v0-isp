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
        // Map row data to service plan fields
        const serviceData: any = {}

        Object.entries(columnMapping).forEach(([serviceField, fileColumn]) => {
          if (fileColumn) {
            const columnIndex = fileData.headers.indexOf(fileColumn as string)
            if (columnIndex !== -1) {
              serviceData[serviceField] = row[columnIndex] || null
            }
          }
        })

        // Validate required fields
        if (!serviceData.name || !serviceData.price || !serviceData.download_speed || !serviceData.upload_speed) {
          errors.push(`Row ${i + 1}: Missing required fields`)
          continue
        }

        // Check for duplicate service plan name
        const existingService = await sql`
          SELECT id FROM service_plans WHERE name = ${serviceData.name}
        `

        if (existingService.length > 0) {
          errors.push(`Row ${i + 1}: Service plan ${serviceData.name} already exists`)
          continue
        }

        // Convert numeric fields
        const price = Number.parseFloat(serviceData.price) || 0
        const downloadSpeed = Number.parseInt(serviceData.download_speed) || 0
        const uploadSpeed = Number.parseInt(serviceData.upload_speed) || 0
        const dataLimit = serviceData.data_limit ? Number.parseInt(serviceData.data_limit) : null
        const contractLength = serviceData.contract_length ? Number.parseInt(serviceData.contract_length) : null
        const setupFee = serviceData.setup_fee ? Number.parseFloat(serviceData.setup_fee) : null

        // Insert service plan
        await sql`
          INSERT INTO service_plans (
            name, price, download_speed, upload_speed, service_type, description,
            data_limit, contract_length, setup_fee, status, created_at, updated_at
          ) VALUES (
            ${serviceData.name}, ${price}, ${downloadSpeed}, ${uploadSpeed},
            ${serviceData.service_type || "residential"}, ${serviceData.description},
            ${dataLimit}, ${contractLength}, ${setupFee},
            ${serviceData.status || "active"}, NOW(), NOW()
          )
        `

        imported++
      } catch (error) {
        console.error(`Error importing service row ${i + 1}:`, error)
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Import failed"}`)
      }
    }

    return NextResponse.json({
      imported,
      errors,
      total: fileData.rows.length,
      message: `Successfully imported ${imported} service plans`,
    })
  } catch (error) {
    console.error("Service import processing error:", error)
    return NextResponse.json({ error: "Failed to process service import" }, { status: 500 })
  }
}

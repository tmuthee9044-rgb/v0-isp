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
        // Map row data to customer fields
        const customerData: any = {}

        Object.entries(columnMapping).forEach(([customerField, fileColumn]) => {
          if (fileColumn) {
            const columnIndex = fileData.headers.indexOf(fileColumn as string)
            if (columnIndex !== -1) {
              customerData[customerField] = row[columnIndex] || null
            }
          }
        })

        // Validate required fields
        if (!customerData.first_name || !customerData.last_name || !customerData.email) {
          errors.push(`Row ${i + 1}: Missing required fields`)
          continue
        }

        // Check for duplicate email
        const existingCustomer = await sql`
          SELECT id FROM customers WHERE email = ${customerData.email}
        `

        if (existingCustomer.length > 0) {
          errors.push(`Row ${i + 1}: Email ${customerData.email} already exists`)
          continue
        }

        // Insert customer
        await sql`
          INSERT INTO customers (
            first_name, last_name, email, phone, address, city, postal_code,
            customer_type, business_name, business_registration, id_number,
            date_of_birth, gender, occupation, monthly_income,
            preferred_contact_method, preferred_contact_time, marketing_consent,
            notes, status, created_at
          ) VALUES (
            ${customerData.first_name}, ${customerData.last_name}, ${customerData.email},
            ${customerData.phone}, ${customerData.address}, ${customerData.city},
            ${customerData.postal_code}, ${customerData.customer_type || "individual"},
            ${customerData.business_name}, ${customerData.business_registration},
            ${customerData.id_number}, ${customerData.date_of_birth}, ${customerData.gender},
            ${customerData.occupation}, ${customerData.monthly_income},
            ${customerData.preferred_contact_method}, ${customerData.preferred_contact_time},
            ${customerData.marketing_consent === "true" || customerData.marketing_consent === "1"},
            ${customerData.notes}, 'active', NOW()
          )
        `

        imported++
      } catch (error) {
        console.error(`Error importing row ${i + 1}:`, error)
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Import failed"}`)
      }
    }

    return NextResponse.json({
      imported,
      errors,
      total: fileData.rows.length,
      message: `Successfully imported ${imported} customers`,
    })
  } catch (error) {
    console.error("Import processing error:", error)
    return NextResponse.json({ error: "Failed to process import" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const sql = await getSql()

    const contentType = request.headers.get("content-type") || ""

    let importType: string
    let data: any[]
    let columnMapping: any = {}

    if (contentType.includes("application/json")) {
      // New format from import page
      const body = await request.json()
      const { fileData, columnMapping: mapping, entityType } = body

      importType = entityType
      columnMapping = mapping

      // Transform rows into mapped objects
      data = fileData.rows.map((row: any[]) => {
        const obj: any = {}
        Object.keys(mapping).forEach((key) => {
          const headerName = mapping[key]
          const headerIndex = fileData.headers.indexOf(headerName)
          obj[key] = row[headerIndex] || ""
        })
        return obj
      })
    } else {
      // Old FormData format
      const formData = await request.formData()
      const file = formData.get("file") as File
      importType = formData.get("importType") as string

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 })
      }

      const text = await file.text()
      const lines = text.split("\n").filter((line) => line.trim())
      const headers = lines[0].split(",").map((h) => h.trim())

      data = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim())
        const row: any = {}
        headers.forEach((header, i) => {
          row[header] = values[i] || ""
        })
        return row
      })
    }

    let imported = 0
    const errors: string[] = []

    console.log("[v0] Import starting:", { importType, recordCount: data.length })

    if (importType === "customers") {
      for (const row of data) {
        try {
          const accountNumber = row.account_number || `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

          const name =
            row.business_name ||
            (row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : null) ||
            row.first_name ||
            row.last_name ||
            "Unknown Customer"

          await sql`
            INSERT INTO customers (
              account_number, name, first_name, last_name, email, phone, national_id,
              customer_type, business_name, business_type, tax_number,
              address, city, state, postal_code, country,
              installation_address, billing_address, gps_coordinates,
              preferred_contact_method, referral_source, status, created_at
            ) VALUES (
              ${accountNumber},
              ${name},
              ${row.first_name || ""},
              ${row.last_name || ""},
              ${row.email || null},
              ${row.phone || ""},
              ${row.national_id || null},
              ${row.customer_type || "individual"},
              ${row.business_name || null},
              ${row.business_type || null},
              ${row.tax_number || null},
              ${row.address || null},
              ${row.city || null},
              ${row.state || null},
              ${row.postal_code || null},
              ${row.country || null},
              ${row.installation_address || null},
              ${row.billing_address || null},
              ${row.gps_coordinates || null},
              ${row.preferred_contact_method || null},
              ${row.referral_source || null},
              ${row.status || "active"},
              NOW()
            )
          `
          imported++
        } catch (error) {
          console.error("[v0] Customer import error:", error)
          errors.push(`Row ${imported + 1}: ${error instanceof Error ? error.message : "Unknown error"}`)
        }
      }

      // Log activity
      await sql`
        INSERT INTO activity_logs (user_id, action, entity_type, details, created_at)
        VALUES (1, 'bulk_import', 'customers', ${JSON.stringify({ imported, total: data.length, errors: errors.length })}, NOW())
      `
    } else if (importType === "services") {
      for (const row of data) {
        try {
          await sql`
            INSERT INTO service_plans (
              name, description, price, download_speed, upload_speed,
              data_limit, billing_cycle, currency, priority_level,
              fair_usage_policy, status, created_at
            ) VALUES (
              ${row.name},
              ${row.description || null},
              ${Number.parseFloat(row.price) || 0},
              ${Number.parseInt(row.download_speed) || 0},
              ${Number.parseInt(row.upload_speed) || 0},
              ${Number.parseInt(row.data_limit) || null},
              ${row.billing_cycle || "monthly"},
              ${row.currency || "KES"},
              ${Number.parseInt(row.priority_level) || 5},
              ${row.fair_usage_policy || null},
              ${row.status || "active"},
              NOW()
            )
          `
          imported++
        } catch (error) {
          console.error("[v0] Service import error:", error)
          errors.push(`Row ${imported + 1}: ${error instanceof Error ? error.message : "Unknown error"}`)
        }
      }

      // Log activity
      await sql`
        INSERT INTO activity_logs (user_id, action, entity_type, details, created_at)
        VALUES (1, 'bulk_import', 'services', ${JSON.stringify({ imported, total: data.length, errors: errors.length })}, NOW())
      `
    } else if (importType === "vehicles") {
      for (const row of data) {
        try {
          await sql`
            INSERT INTO vehicles (
              name, registration, type, model, year, fuel_type,
              mileage, fuel_consumption, purchase_date, purchase_cost,
              insurance_expiry, license_expiry, last_service, next_service,
              assigned_to, location, status, created_at
            ) VALUES (
              ${row.name},
              ${row.registration},
              ${row.type},
              ${row.model || null},
              ${Number.parseInt(row.year) || null},
              ${row.fuel_type || null},
              ${Number.parseInt(row.mileage) || null},
              ${Number.parseFloat(row.fuel_consumption) || null},
              ${row.purchase_date || null},
              ${Number.parseFloat(row.purchase_cost) || null},
              ${row.insurance_expiry || null},
              ${row.license_expiry || null},
              ${row.last_service || null},
              ${row.next_service || null},
              ${row.assigned_to || null},
              ${row.location || null},
              ${row.status || "active"},
              NOW()
            )
          `
          imported++
        } catch (error) {
          console.error("[v0] Vehicle import error:", error)
          errors.push(`Row ${imported + 1}: ${error instanceof Error ? error.message : "Unknown error"}`)
        }
      }

      // Log activity
      await sql`
        INSERT INTO activity_logs (user_id, action, entity_type, details, created_at)
        VALUES (1, 'bulk_import', 'vehicles', ${JSON.stringify({ imported, total: data.length, errors: errors.length })}, NOW())
      `
    } else if (importType === "employees") {
      for (const row of data) {
        try {
          await sql`
            INSERT INTO employees (
              employee_id, first_name, last_name, email, phone,
              department, position, hire_date, basic_salary, status, created_at
            ) VALUES (
              ${row.employee_id},
              ${row.first_name},
              ${row.last_name},
              ${row.email},
              ${row.phone || null},
              ${row.department || null},
              ${row.position || null},
              ${row.hire_date || null},
              ${Number.parseFloat(row.salary) || null},
              ${row.status || "active"},
              NOW()
            )
          `
          imported++
        } catch (error) {
          console.error("[v0] Employee import error:", error)
          errors.push(`Row ${imported + 1}: ${error instanceof Error ? error.message : "Unknown error"}`)
        }
      }

      // Log activity
      await sql`
        INSERT INTO activity_logs (user_id, action, entity_type, details, created_at)
        VALUES (1, 'bulk_import', 'employees', ${JSON.stringify({ imported, total: data.length, errors: errors.length })}, NOW())
      `
    }

    console.log("[v0] Import completed:", { imported, total: data.length, errors: errors.length })

    return NextResponse.json({
      imported,
      total: data.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("[v0] Import error:", error)
    return NextResponse.json(
      {
        error: "Import failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

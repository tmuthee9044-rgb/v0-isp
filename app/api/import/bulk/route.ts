import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const importType = formData.get("importType") as string
    const selectedFields = JSON.parse(formData.get("selectedFields") as string)

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())
    const headers = lines[0].split(",").map((h) => h.trim())

    const data = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim())
      const row: any = {}
      headers.forEach((header, i) => {
        row[header] = values[i] || ""
      })
      return row
    })

    let imported = 0

    // Import based on type
    if (importType === "customers") {
      for (const row of data) {
        const accountNumber = `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await sql`
          INSERT INTO customers (
            account_number, first_name, last_name, email, phone, id_number,
            customer_type, business_name, address, city, state, postal_code,
            installation_address, status, created_at
          ) VALUES (
            ${accountNumber},
            ${row["First Name"] || ""},
            ${row["Last Name"] || ""},
            ${row["Email"] || null},
            ${row["Phone"] || ""},
            ${row["ID Number"] || null},
            ${row["Customer Type"] || "individual"},
            ${row["Business Name"] || null},
            ${row["Address"] || null},
            ${row["City"] || null},
            ${row["State/Region"] || null},
            ${row["Postal Code"] || null},
            ${row["Installation Address"] || null},
            ${row["Status"] || "active"},
            NOW()
          )
        `
        imported++
      }
    } else if (importType === "service_plans") {
      for (const row of data) {
        await sql`
          INSERT INTO service_plans (
            name, description, price, download_speed, upload_speed,
            data_limit, billing_cycle, status, created_at
          ) VALUES (
            ${row["Plan Name"]},
            ${row["Description"] || null},
            ${Number.parseFloat(row["Price"]) || 0},
            ${Number.parseInt(row["Download Speed (Mbps)"]) || 0},
            ${Number.parseInt(row["Upload Speed (Mbps)"]) || 0},
            ${Number.parseInt(row["Data Limit (GB)"]) || null},
            ${row["Billing Cycle"] || "monthly"},
            ${row["Status"] || "active"},
            NOW()
          )
        `
        imported++
      }
    } else if (importType === "vehicles") {
      for (const row of data) {
        await sql`
          INSERT INTO vehicles (
            name, registration, type, model, year, fuel_type,
            purchase_date, purchase_cost, mileage, status, created_at
          ) VALUES (
            ${row["Vehicle Name"]},
            ${row["Registration Number"]},
            ${row["Vehicle Type"]},
            ${row["Model"] || null},
            ${Number.parseInt(row["Year"]) || null},
            ${row["Fuel Type"] || null},
            ${row["Purchase Date"] || null},
            ${Number.parseFloat(row["Purchase Cost"]) || null},
            ${Number.parseInt(row["Current Mileage"]) || null},
            ${row["Status"] || "active"},
            NOW()
          )
        `
        imported++
      }
    } else if (importType === "employees") {
      for (const row of data) {
        await sql`
          INSERT INTO employees (
            employee_id, first_name, last_name, email, phone,
            department, position, hire_date, salary, status, created_at
          ) VALUES (
            ${row["Employee ID"]},
            ${row["First Name"]},
            ${row["Last Name"]},
            ${row["Email"]},
            ${row["Phone"] || null},
            ${row["Department"] || null},
            ${row["Position"] || null},
            ${row["Hire Date"] || null},
            ${Number.parseFloat(row["Salary"]) || null},
            ${row["Status"] || "active"},
            NOW()
          )
        `
        imported++
      }
    }

    return NextResponse.json({ imported, total: data.length })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json({ error: "Import failed" }, { status: 500 })
  }
}

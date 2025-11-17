import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const sql = await getSql()
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

    if (importType === "customers") {
      for (const row of data) {
        const accountNumber = row["Account Number"] || `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        await sql`
          INSERT INTO customers (
            account_number, first_name, last_name, email, phone, id_number,
            customer_type, business_name, business_type, tax_number,
            address, city, state, postal_code, country,
            installation_address, billing_address, gps_coordinates,
            preferred_contact_method, referral_source, status, created_at
          ) VALUES (
            ${accountNumber},
            ${row["First Name"] || ""},
            ${row["Last Name"] || ""},
            ${row["Email"] || null},
            ${row["Phone"] || ""},
            ${row["ID Number"] || null},
            ${row["Customer Type"] || "individual"},
            ${row["Business Name"] || null},
            ${row["Business Type"] || null},
            ${row["Tax Number"] || null},
            ${row["Address"] || null},
            ${row["City"] || null},
            ${row["State/Region"] || null},
            ${row["Postal Code"] || null},
            ${row["Country"] || null},
            ${row["Installation Address"] || null},
            ${row["Billing Address"] || null},
            ${row["GPS Coordinates"] || null},
            ${row["Preferred Contact Method"] || null},
            ${row["Referral Source"] || null},
            ${row["Status"] || "active"},
            NOW()
          )
        `
        imported++
      }
    } else if (importType === "services") {
      for (const row of data) {
        await sql`
          INSERT INTO service_plans (
            name, description, price, download_speed, upload_speed,
            data_limit, billing_cycle, currency, priority_level,
            fair_usage_policy, status, created_at
          ) VALUES (
            ${row["Plan Name"]},
            ${row["Description"] || null},
            ${Number.parseFloat(row["Price"]) || 0},
            ${Number.parseInt(row["Download Speed (Mbps)"]) || 0},
            ${Number.parseInt(row["Upload Speed (Mbps)"]) || 0},
            ${Number.parseInt(row["Data Limit (GB)"]) || null},
            ${row["Billing Cycle"] || "monthly"},
            ${row["Currency"] || "KES"},
            ${Number.parseInt(row["Priority Level"]) || 5},
            ${row["Fair Usage Policy"] || null},
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
            mileage, fuel_consumption, purchase_date, purchase_cost,
            insurance_expiry, license_expiry, last_service, next_service,
            assigned_to, location, status, created_at
          ) VALUES (
            ${row["Vehicle Name"]},
            ${row["Registration Number"]},
            ${row["Vehicle Type"]},
            ${row["Model"] || null},
            ${Number.parseInt(row["Year"]) || null},
            ${row["Fuel Type"] || null},
            ${Number.parseInt(row["Current Mileage"]) || null},
            ${Number.parseFloat(row["Fuel Consumption (L/100km)"]) || null},
            ${row["Purchase Date"] || null},
            ${Number.parseFloat(row["Purchase Cost"]) || null},
            ${row["Insurance Expiry"] || null},
            ${row["License Expiry"] || null},
            ${row["Last Service Date"] || null},
            ${row["Next Service Date"] || null},
            ${row["Assigned To"] || null},
            ${row["Location"] || null},
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
    console.error("[v0] Import error:", error)
    return NextResponse.json({ 
      error: "Import failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}

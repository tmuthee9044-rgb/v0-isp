import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    let customers: any[] = []
    let detectedFormat = "unknown"

    const contentType = request.headers.get("content-type")

    if (contentType?.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData()
      const file = formData.get("file") as File

      if (!file) {
        return Response.json({ error: "No file provided" }, { status: 400 })
      }

      const text = await file.text()
      const fileName = file.name.toLowerCase()

      // Auto-detect format based on file content and name
      if (fileName.includes("splynx") || text.includes("tariff_name") || text.includes("billing_type")) {
        detectedFormat = "splynx"
        customers = parseSplynxFormat(text)
      } else if (fileName.includes("mikrotik") || text.trim().startsWith("[") || text.trim().startsWith("{")) {
        detectedFormat = "mikrotik"
        customers = parseMikroTikFormat(text)
      } else if (fileName.includes("radius") || text.includes("Cleartext-Password") || text.includes("Reply-Message")) {
        detectedFormat = "radius"
        customers = parseRadiusFormat(text)
      } else if (fileName.endsWith(".csv") || text.includes(",")) {
        detectedFormat = "csv"
        customers = parseCSVFormat(text)
      } else {
        return Response.json({ error: "Unable to detect file format" }, { status: 400 })
      }
    } else {
      // Handle JSON data (legacy support)
      const body = await request.json()
      customers = body.customers || []
      detectedFormat = body.source || "manual"
    }

    if (!customers || !Array.isArray(customers)) {
      return Response.json({ error: "Invalid customers data" }, { status: 400 })
    }

    let imported = 0
    let errors = 0
    const errorDetails: string[] = []

    for (const customer of customers) {
      try {
        const requiredField = customer.name || customer.email || customer.phone
        if (!requiredField) {
          errors++
          errorDetails.push(`Customer missing required identification (name, email, or phone)`)
          continue
        }

        const existing = await sql`
          SELECT id FROM customers 
          WHERE email = ${customer.email || ""} 
          OR phone = ${customer.phone || ""}
          AND (email != '' OR phone != '')
        `

        if (existing.length > 0) {
          errors++
          errorDetails.push(`Customer ${customer.name || customer.email || customer.phone} already exists`)
          continue
        }

        const customerData = {
          first_name: customer.name?.split(" ")[0] || customer.first_name || "",
          last_name: customer.last_name || customer.name?.split(" ").slice(1).join(" ") || "",
          email: customer.email || "",
          phone: customer.phone || "",
          customer_type: customer.customer_type || "individual",
          status: customer.status || "active",
          monthly_fee: Number.parseFloat(customer.monthly_fee?.toString() || "0") || 0,
          balance: Number.parseFloat(customer.balance?.toString() || "0") || 0,
          physical_address: customer.physical_address || customer.address || "",
          physical_city: customer.physical_city || customer.city || "",
          physical_county: customer.physical_county || customer.county || "",
          postal_code: customer.postal_code || customer.zip_code || "",
          plan: customer.plan || customer.tariff_name || "",
          import_source: detectedFormat,
          import_date: new Date().toISOString(),
        }

        // Insert new customer with enhanced field mapping
        await sql`
          INSERT INTO customers (
            first_name, last_name, email, phone, customer_type, status,
            monthly_fee, balance, physical_address, physical_city, physical_county,
            postal_code, plan, import_source, import_date, created_at, updated_at
          ) VALUES (
            ${customerData.first_name},
            ${customerData.last_name},
            ${customerData.email},
            ${customerData.phone},
            ${customerData.customer_type},
            ${customerData.status},
            ${customerData.monthly_fee},
            ${customerData.balance},
            ${customerData.physical_address},
            ${customerData.physical_city},
            ${customerData.physical_county},
            ${customerData.postal_code},
            ${customerData.plan},
            ${customerData.import_source},
            ${customerData.import_date},
            NOW(),
            NOW()
          )
        `
        imported++
      } catch (error) {
        console.error("Error importing customer:", error)
        errors++
        errorDetails.push(`Failed to import ${customer.name || customer.email || "unknown customer"}: ${error}`)
      }
    }

    return Response.json({
      success: true,
      imported,
      errors,
      format: detectedFormat,
      message: `Successfully imported ${imported} customers from ${detectedFormat.toUpperCase()} format${errors > 0 ? ` (${errors} errors)` : ""}`,
      errorDetails: errors > 0 ? errorDetails.slice(0, 10) : [], // Limit to first 10 errors
    })
  } catch (error) {
    console.error("Import customers error:", error)
    return Response.json({ error: "Failed to import customers" }, { status: 500 })
  }
}

function parseSplynxFormat(text: string): any[] {
  const lines = text.split("\n").filter((line) => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
  const dataRows = lines.slice(1)

  return dataRows.map((row) => {
    const values = row.split(",").map((v) => v.trim().replace(/"/g, ""))
    return {
      name: values[headers.indexOf("name")] || values[headers.indexOf("login")] || "",
      email: values[headers.indexOf("email")] || "",
      phone: values[headers.indexOf("phone")] || "",
      status: values[headers.indexOf("status")] === "active" ? "active" : "inactive",
      plan: values[headers.indexOf("tariff_name")] || "",
      monthly_fee: Number.parseFloat(values[headers.indexOf("tariff_price")]) || 0,
      balance: Number.parseFloat(values[headers.indexOf("deposit")]) || 0,
      physical_address: values[headers.indexOf("street_1")] || "",
      physical_city: values[headers.indexOf("city")] || "",
      postal_code: values[headers.indexOf("zip_code")] || "",
      customer_type: "individual",
    }
  })
}

function parseMikroTikFormat(text: string): any[] {
  try {
    const data = JSON.parse(text)
    const users = Array.isArray(data) ? data : [data]

    return users.map((user) => ({
      name: user["full-name"] || user.username || "",
      email: user.email || "",
      phone: user.phone || "",
      status: user.disabled === "yes" ? "inactive" : "active",
      plan: user.profile || user["actual-profile"] || "",
      physical_address: user.address || "",
      customer_type: "individual",
    }))
  } catch {
    return []
  }
}

function parseRadiusFormat(text: string): any[] {
  const lines = text.split("\n").filter((line) => line.trim() && !line.startsWith("\t"))

  return lines.map((line) => {
    const username = line.split("\t")[0]
    const isEmail = username.includes("@")
    return {
      name: username,
      email: isEmail ? username : "",
      phone: !isEmail ? username : "",
      status: "active",
      customer_type: "individual",
    }
  })
}

function parseCSVFormat(text: string): any[] {
  const lines = text.split("\n").filter((line) => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, "").toLowerCase())
  const dataRows = lines.slice(1)

  return dataRows.map((row) => {
    const values = row.split(",").map((v) => v.trim().replace(/"/g, ""))
    const customer: any = {}

    headers.forEach((header, index) => {
      const value = values[index] || ""
      switch (header) {
        case "name":
        case "first name":
          customer.name = value
          break
        case "last name":
          customer.last_name = value
          break
        case "email":
          customer.email = value
          break
        case "phone":
          customer.phone = value
          break
        case "customer type":
          customer.customer_type = value
          break
        case "status":
          customer.status = value || "active"
          break
        case "monthly fee":
        case "monthly fee (kes)":
          customer.monthly_fee = Number.parseFloat(value) || 0
          break
        case "balance":
        case "balance (kes)":
          customer.balance = Number.parseFloat(value) || 0
          break
        case "address":
          customer.physical_address = value
          break
        case "city":
          customer.physical_city = value
          break
        case "county":
          customer.physical_county = value
          break
        case "plan":
        case "service plan":
          customer.plan = value
          break
      }
    })

    return customer
  })
}

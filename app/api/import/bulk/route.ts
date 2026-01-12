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
          const accountNumber =
            row.account_number || row.login || `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

          const name =
            row.name ||
            row.business_name ||
            (row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : null) ||
            row.first_name ||
            row.last_name ||
            "Unknown Customer"

          const parseDate = (dateStr: string) => {
            if (!dateStr || dateStr === "0000-00-00" || dateStr === "") return null
            try {
              return new Date(dateStr).toISOString()
            } catch {
              return null
            }
          }

          const parseBool = (val: any) => {
            if (val === 1 || val === "1" || val === true || val === "true") return true
            if (val === 0 || val === "0" || val === false || val === "false") return false
            return null
          }

          const parseDecimal = (val: any) => {
            if (!val || val === "") return 0
            const parsed = Number.parseFloat(val)
            return isNaN(parsed) ? 0 : parsed
          }

          const parseInt = (val: any) => {
            if (!val || val === "") return null
            const parsed = Number.parseInt(val)
            return isNaN(parsed) ? null : parsed
          }

          await sql`
            INSERT INTO customers (
              account_number, name, first_name, last_name, business_name, email, alternate_email, 
              phone, phone_primary, phone_secondary, phone_office, national_id, date_of_birth, gender,
              customer_type, status, physical_address, physical_city, physical_county, physical_postal_code, 
              physical_country, physical_gps_coordinates, billing_address, billing_city, billing_county, billing_postal_code,
              installation_address, city, state, country, postal_code, gps_coordinates, region,
              emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
              business_type, business_reg_no, contact_person, tax_number, vat_pin,
              plan, monthly_fee, balance, connection_quality, portal_login_id, portal_username, portal_password,
              installation_date, last_payment_date, contract_end_date, preferred_contact_method,
              referral_source, sales_rep, account_manager, special_requirements, internal_notes,
              billing_cycle, auto_renewal, paperless_billing, sms_notifications,
              billing_email, zip_code, billing_street_1, billing_zip_code, 
              mrr_total, gdpr_agreed, prepaid_monthly_costs, prepaid_expiration_date,
              prepaid_remains_days, billing_type, partner_id, location_id, 
              added_by, added_by_id, login, category, password_hash,
              date_add, last_online, daily_prepaid_cost, conversion_date,
              mpesa_phone_number, report_first_service_amount, report_first_service_cancel_date,
              splynx_addon_agents_agent, splynx_addon_resellers_reseller,
              enabled, type, deposit, billing_date, billing_due, 
              blocking_period, grace_period, make_invoices, payment_method, min_balance,
              request_auto_enable, request_auto_day, request_auto_period,
              reminder_enable, reminder_day_1, reminder_day_2, reminder_day_3,
              reminder_payment, reminder_payment_value, reminder_payment_comment, reminder_type,
              billing_person, request_auto_type, request_auto_next, send_finance_notification,
              partner_percent, auto_cap, auto_cap_tariffs, limitation_type,
              max_cap_during_month, transfer_usage_to_new_service, created_at
            ) VALUES (
              ${accountNumber}, ${name}, ${row.first_name || ""}, ${row.last_name || ""},
              ${row.business_name || null}, ${row.email || null}, ${row.alternate_email || null},
              ${row.phone || ""}, ${row.phone_primary || null}, ${row.phone_secondary || null}, 
              ${row.phone_office || null}, ${row.national_id || null}, ${parseDate(row.date_of_birth)}, 
              ${row.gender || null}, ${row.customer_type || row.type || row.category || "person"},
              ${row.status || "active"}, ${row.physical_address || null}, ${row.physical_city || null},
              ${row.physical_county || null}, ${row.physical_postal_code || null}, 
              ${row.physical_country || "Kenya"}, ${row.physical_gps_coordinates || null},
              ${row.billing_address || null}, ${row.billing_city || null}, ${row.billing_county || null}, ${row.billing_postal_code || null},
              ${row.installation_address || null}, ${row.city || null}, ${row.state || null}, 
              ${row.country || "Kenya"}, ${row.postal_code || null}, ${row.gps_coordinates || null},
              ${row.region || null}, ${row.emergency_contact_name || null}, ${row.emergency_contact_phone || null},
              ${row.emergency_contact_relationship || null}, ${row.business_type || null}, 
              ${row.business_reg_no || null}, ${row.contact_person || null}, ${row.tax_number || null},
              ${row.vat_pin || null}, ${row.plan || null}, ${parseDecimal(row.monthly_fee)}, 
              ${parseDecimal(row.balance)}, ${row.connection_quality || null}, ${row.portal_login_id || null},
              ${row.portal_username || null}, ${row.portal_password || null}, ${parseDate(row.installation_date)},
              ${parseDate(row.last_payment_date)}, ${parseDate(row.contract_end_date)}, 
              ${row.preferred_contact_method || null}, ${row.referral_source || null}, 
              ${row.sales_rep || null}, ${row.account_manager || null}, ${row.special_requirements || null},
              ${row.internal_notes || null}, ${row.billing_cycle || "monthly"}, 
              ${parseBool(row.auto_renewal)}, ${parseBool(row.paperless_billing)}, 
              ${parseBool(row.sms_notifications)}, ${row.billing_email || null}, ${row.zip_code || null}, 
              ${row.billing_street_1 || null}, ${row.billing_zip_code || null},
              ${parseDecimal(row.mrr_total)}, ${row.gdpr_agreed || null},
              ${parseDecimal(row.prepaid_monthly_costs)}, ${parseDate(row.prepaid_expiration_date)},
              ${parseInt(row.prepaid_remains_days)}, ${row.billing_type || "postpaid"},
              ${parseInt(row.partner_id)}, ${parseInt(row.location_id)},
              ${row.added_by || null}, ${parseInt(row.added_by_id)},
              ${row.login || null}, ${row.category || null}, ${row.password_hash || row.password || null},
              ${parseDate(row.date_add) || new Date().toISOString()},
              ${parseDate(row.last_online)}, ${parseDate(row.last_update)},
              ${parseDecimal(row.daily_prepaid_cost)}, ${parseDate(row.conversion_date)},
              ${row.mpesa_phone_number || null}, ${parseDecimal(row.report_first_service_amount)},
              ${parseDate(row.report_first_service_cancel_date)},
              ${row.splynx_addon_agents_agent || null}, ${row.splynx_addon_resellers_reseller || null},
              ${parseBool(row.enabled) ?? true}, ${row.type || "person"},
              ${parseDecimal(row.deposit)}, ${parseInt(row.billing_date)}, ${parseInt(row.billing_due)},
              ${parseInt(row.blocking_period)}, ${parseInt(row.grace_period)},
              ${parseBool(row.make_invoices) ?? true}, ${row.payment_method || "cash"},
              ${parseDecimal(row.min_balance)}, ${parseBool(row.request_auto_enable) ?? false},
              ${parseInt(row.request_auto_day)}, ${parseInt(row.request_auto_period)},
              ${parseBool(row.reminder_enable) ?? true}, ${parseInt(row.reminder_day_1)},
              ${parseInt(row.reminder_day_2)}, ${parseInt(row.reminder_day_3)},
              ${parseBool(row.reminder_payment) ?? false}, ${parseDecimal(row.reminder_payment_value)},
              ${row.reminder_payment_comment || null}, ${parseInt(row.reminder_type)},
              ${row.billing_person || null}, ${row.request_auto_type || null},
              ${parseDate(row.request_auto_next)}, ${parseBool(row.send_finance_notification) ?? true},
              ${parseDecimal(row.partner_percent)}, ${parseBool(row.auto_cap) ?? false},
              ${row.auto_cap_tariffs || null}, ${row.limitation_type || null},
              ${parseInt(row.max_cap_during_month)}, ${parseBool(row.transfer_usage_to_new_service) ?? true},
              NOW()
            )
            ON CONFLICT (account_number) DO UPDATE SET
              name = EXCLUDED.name,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              status = EXCLUDED.status,
              updated_at = NOW()
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

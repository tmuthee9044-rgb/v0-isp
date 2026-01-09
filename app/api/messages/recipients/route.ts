import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "all" // customers, employees, or all
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || "all"

    let recipients: any[] = []

    if (type === "customers" || type === "all") {
      let customers
      if (search && status !== "all") {
        customers = await sql`
          SELECT 
            id, 
            CONCAT(first_name, ' ', last_name) as name,
            first_name,
            last_name,
            email, 
            phone, 
            status,
            'customer' as recipient_type,
            (SELECT name FROM service_plans sp 
             JOIN customer_services cs ON sp.id = cs.service_plan_id 
             WHERE cs.customer_id = customers.id 
             AND cs.status = 'active' 
             LIMIT 1) as plan
          FROM customers 
          WHERE (first_name ILIKE ${`%${search}%`} OR last_name ILIKE ${`%${search}%`} OR email ILIKE ${`%${search}%`} OR phone ILIKE ${`%${search}%`})
          AND status = ${status}
          ORDER BY first_name, last_name
        `
      } else if (search) {
        customers = await sql`
          SELECT 
            id, 
            CONCAT(first_name, ' ', last_name) as name,
            first_name,
            last_name,
            email, 
            phone, 
            status,
            'customer' as recipient_type,
            (SELECT name FROM service_plans sp 
             JOIN customer_services cs ON sp.id = cs.service_plan_id 
             WHERE cs.customer_id = customers.id 
             AND cs.status = 'active' 
             LIMIT 1) as plan
          FROM customers 
          WHERE (first_name ILIKE ${`%${search}%`} OR last_name ILIKE ${`%${search}%`} OR email ILIKE ${`%${search}%`} OR phone ILIKE ${`%${search}%`})
          ORDER BY first_name, last_name
        `
      } else if (status !== "all") {
        customers = await sql`
          SELECT 
            id, 
            CONCAT(first_name, ' ', last_name) as name,
            first_name,
            last_name,
            email, 
            phone, 
            status,
            'customer' as recipient_type,
            (SELECT name FROM service_plans sp 
             JOIN customer_services cs ON sp.id = cs.service_plan_id 
             WHERE cs.customer_id = customers.id 
             AND cs.status = 'active' 
             LIMIT 1) as plan
          FROM customers 
          WHERE status = ${status}
          ORDER BY first_name, last_name
        `
      } else {
        customers = await sql`
          SELECT 
            id, 
            CONCAT(first_name, ' ', last_name) as name,
            first_name,
            last_name,
            email, 
            phone, 
            status,
            'customer' as recipient_type,
            (SELECT name FROM service_plans sp 
             JOIN customer_services cs ON sp.id = cs.service_plan_id 
             WHERE cs.customer_id = customers.id 
             AND cs.status = 'active' 
             LIMIT 1) as plan
          FROM customers 
          ORDER BY first_name, last_name
        `
      }
      recipients = [...recipients, ...customers]
    }

    if (type === "employees" || type === "all") {
      let employees
      if (search && status !== "all") {
        employees = await sql`
          SELECT 
            id,
            CONCAT(first_name, ' ', last_name) as name,
            first_name,
            last_name,
            email,
            phone,
            status,
            'employee' as recipient_type,
            position as plan
          FROM employees 
          WHERE (first_name ILIKE ${`%${search}%`} OR last_name ILIKE ${`%${search}%`} OR email ILIKE ${`%${search}%`} OR phone ILIKE ${`%${search}%`})
          AND status = ${status}
          ORDER BY first_name, last_name
        `
      } else if (search) {
        employees = await sql`
          SELECT 
            id,
            CONCAT(first_name, ' ', last_name) as name,
            first_name,
            last_name,
            email,
            phone,
            status,
            'employee' as recipient_type,
            position as plan
          FROM employees 
          WHERE (first_name ILIKE ${`%${search}%`} OR last_name ILIKE ${`%${search}%`} OR email ILIKE ${`%${search}%`} OR phone ILIKE ${`%${search}%`})
          ORDER BY first_name, last_name
        `
      } else if (status !== "all") {
        employees = await sql`
          SELECT 
            id,
            CONCAT(first_name, ' ', last_name) as name,
            first_name,
            last_name,
            email,
            phone,
            status,
            'employee' as recipient_type,
            position as plan
          FROM employees 
          WHERE status = ${status}
          ORDER BY first_name, last_name
        `
      } else {
        employees = await sql`
          SELECT 
            id,
            CONCAT(first_name, ' ', last_name) as name,
            first_name,
            last_name,
            email,
            phone,
            status,
            'employee' as recipient_type,
            position as plan
          FROM employees 
          ORDER BY first_name, last_name
        `
      }
      recipients = [...recipients, ...employees]
    }

    return NextResponse.json({ success: true, recipients })
  } catch (error) {
    console.error("Error fetching recipients:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch recipients", recipients: [] }, { status: 500 })
  }
}

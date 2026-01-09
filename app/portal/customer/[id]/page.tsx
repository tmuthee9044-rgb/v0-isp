import { notFound } from "next/navigation"
import { neon } from "@neondatabase/serverless"
import { CustomerPortalClient } from "./customer-portal-client"

export const dynamic = "force-dynamic"

async function getCustomer(id: string) {
  try {
    console.log("[v0] Fetching customer with ID:", id)
    const sql = neon(process.env.DATABASE_URL!)
    const result = await sql`
      SELECT 
        id, name, email, phone, address, city, county, postal_code,
        connection_type, router_ip, mac_address, installation_date,
        last_payment, balance, notes, portal_login_id, portal_username,
        customer_type, payment_method, auto_payment, status,
        physical_gps_lat, physical_gps_lng, business_name, business_type,
        vat_pin, business_reg_no, first_name, last_name, alternate_email,
        created_at, updated_at
      FROM customers 
      WHERE id = ${id}
    `

    console.log("[v0] Customer query result:", result.length, "records found")

    if (result.length === 0) {
      console.log("[v0] No customer found with ID:", id)
      return null
    }

    return result[0]
  } catch (error) {
    console.error("[v0] Error fetching customer:", error)
    return null
  }
}

async function getCustomerServices(customerId: string) {
  try {
    console.log("[v0] Fetching services for customer:", customerId)
    const sql = neon(process.env.DATABASE_URL!)
    const result = await sql`
      SELECT cs.*, sp.name as plan_name, sp.price, sp.speed_download, sp.speed_upload
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.plan_id = sp.id
      WHERE cs.customer_id = ${customerId}
      ORDER BY cs.created_at DESC
    `
    console.log("[v0] Services found:", result.length)
    return result
  } catch (error) {
    console.error("[v0] Error fetching customer services:", error)
    return []
  }
}

async function getCustomerPayments(customerId: string) {
  try {
    console.log("[v0] Fetching payments for customer:", customerId)
    const sql = neon(process.env.DATABASE_URL!)
    const result = await sql`
      SELECT * FROM payments 
      WHERE customer_id = ${customerId}
      ORDER BY payment_date DESC
      LIMIT 10
    `
    console.log("[v0] Payments found:", result.length)
    return result
  } catch (error) {
    console.error("[v0] Error fetching customer payments:", error)
    return []
  }
}

export default async function CustomerPortalPage({ params }: { params: { id: string } }) {
  console.log("[v0] Customer portal page accessed with ID:", params.id)

  if (!params.id || params.id === "undefined") {
    console.log("[v0] Invalid customer ID provided:", params.id)
    notFound()
  }

  const customer = await getCustomer(params.id)

  if (!customer) {
    console.log("[v0] Customer not found, showing 404")
    notFound()
  }

  console.log("[v0] Customer found:", customer.name)

  const [services, payments] = await Promise.all([getCustomerServices(params.id), getCustomerPayments(params.id)])

  console.log("[v0] Rendering customer portal for:", customer.name)
  return <CustomerPortalClient customer={customer} services={services} payments={payments} />
}

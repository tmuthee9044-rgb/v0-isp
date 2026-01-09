import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

// Customer Status Validation API for Router Authentication
export async function POST(request: Request) {
  try {
    const { customer_id, username, check_type = "full" } = await request.json()

    if (!customer_id && !username) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer ID or username required",
        },
        { status: 400 },
      )
    }

    const result = await sql`
      SELECT 
        c.id as customer_id,
        c.first_name,
        c.last_name,
        c.email,
        c.status as customer_status,
        c.portal_username,
        cs.id as service_id,
        cs.status as service_status,
        cs.start_date,
        cs.end_date,
        cs.monthly_fee,
        cs.ip_address,
        sp.name as plan_name,
        sp.download_speed,
        sp.upload_speed,
        ab.balance,
        ab.status as billing_status,
        ab.credit_limit,
        ab.last_payment_date,
        nd.name as router_name,
        nd.status as router_status,
        CASE 
          WHEN c.status = 'active' AND cs.status = 'active' AND ab.status != 'suspended' 
               AND (cs.end_date IS NULL OR cs.end_date > CURRENT_DATE)
               AND ab.balance > -ab.credit_limit
          THEN true 
          ELSE false 
        END as is_valid
      FROM customers c
      LEFT JOIN customer_services cs ON c.id = cs.customer_id AND cs.status = 'active'
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      LEFT JOIN account_balances ab ON c.id = ab.customer_id
      LEFT JOIN network_devices nd ON cs.router_id = nd.id
      WHERE (c.id = ${customer_id} OR c.portal_username = ${username} OR c.email = ${username})
      LIMIT 1
    `

    if (result.length === 0) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: "Customer not found",
        },
        { status: 404 },
      )
    }

    const customer = result[0]

    const validationResults = {
      customer_exists: true,
      customer_active: customer.customer_status === "active",
      service_active: customer.service_status === "active",
      billing_current: customer.billing_status !== "suspended" && customer.balance > -customer.credit_limit,
      service_current: !customer.end_date || new Date(customer.end_date) > new Date(),
      router_online: customer.router_status === "active",
    }

    const overallValid = Object.values(validationResults).every(Boolean)

    const messages = []
    if (!validationResults.customer_active) messages.push("Customer account is inactive")
    if (!validationResults.service_active) messages.push("No active service found")
    if (!validationResults.billing_current) messages.push("Account suspended due to billing issues")
    if (!validationResults.service_current) messages.push("Service has expired")
    if (!validationResults.router_online) messages.push("Router is offline")

    await sql`
      INSERT INTO system_logs (
        level, source, category, message, details, customer_id
      )
      VALUES (
        ${overallValid ? "INFO" : "WARNING"}, 'Customer Validation', 'authentication',
        ${overallValid ? "Customer validation successful" : "Customer validation failed"},
        ${JSON.stringify({
          validation_results: validationResults,
          messages,
          check_type,
          ip_address: customer.ip_address,
        })}, 
        ${customer.customer_id}
      )
    `

    return NextResponse.json({
      success: true,
      valid: overallValid,
      customer: {
        id: customer.customer_id,
        name: `${customer.first_name} ${customer.last_name}`,
        email: customer.email,
        username: customer.portal_username,
        status: customer.customer_status,
      },
      service: {
        id: customer.service_id,
        status: customer.service_status,
        plan: customer.plan_name,
        ip_address: customer.ip_address,
        speeds: {
          download: customer.download_speed,
          upload: customer.upload_speed,
        },
      },
      billing: {
        balance: customer.balance,
        status: customer.billing_status,
        credit_limit: customer.credit_limit,
        last_payment: customer.last_payment_date,
      },
      validation: validationResults,
      messages: messages.length > 0 ? messages : ["Customer validation successful"],
    })
  } catch (error) {
    console.error("Customer validation error:", error)
    return NextResponse.json(
      {
        success: false,
        valid: false,
        error: "Validation system error",
      },
      { status: 500 },
    )
  }
}

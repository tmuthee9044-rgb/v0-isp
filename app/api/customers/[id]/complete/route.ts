import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const customerId = Number.parseInt(params.id)

    if (isNaN(customerId)) {
      return NextResponse.json({ success: false, error: "Invalid customer ID" }, { status: 400 })
    }

    const [customerResult, servicesResult, invoicesResult, ticketsResult, billingConfigResult, paymentAccountsResult] =
      await Promise.all([
        // Customer basic data with phone numbers and emergency contacts
        sql`
        SELECT 
          c.*,
          COALESCE(
            JSON_AGG(
              CASE WHEN cpn.id IS NOT NULL THEN
                JSON_BUILD_OBJECT(
                  'number', cpn.phone_number,
                  'type', cpn.type,
                  'isPrimary', cpn.is_primary
                )
              END
            ) FILTER (WHERE cpn.id IS NOT NULL), 
            '[]'::json
          ) as phone_numbers,
          COALESCE(
            JSON_AGG(
              CASE WHEN cec.id IS NOT NULL THEN
                JSON_BUILD_OBJECT(
                  'name', cec.name,
                  'phone', cec.phone,
                  'email', cec.email,
                  'relationship', cec.relationship
                )
              END
            ) FILTER (WHERE cec.id IS NOT NULL),
            '[]'::json
          ) as emergency_contacts
        FROM customers c
        LEFT JOIN customer_phone_numbers cpn ON c.id = cpn.customer_id
        LEFT JOIN customer_emergency_contacts cec ON c.id = cec.customer_id
        WHERE c.id = ${customerId}
        GROUP BY c.id
      `,

        // Services with plan details
        sql`
        SELECT 
          cs.*,
          sp.name as plan_name,
          sp.price,
          sp.upload_speed,
          sp.download_speed,
          sp.data_limit
        FROM customer_services cs
        LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
        WHERE cs.customer_id = ${customerId}
      `,

        // Invoices with payment status
        sql`
        SELECT 
          i.*,
          COALESCE(SUM(p.amount), 0) as paid_amount,
          (i.amount - COALESCE(SUM(p.amount), 0)) as outstanding_amount
        FROM invoices i
        LEFT JOIN payments p ON i.id = p.invoice_id AND p.status = 'completed'
        WHERE i.customer_id = ${customerId}
        GROUP BY i.id
        ORDER BY i.created_at DESC
      `,

        // Tickets with assigned user details
        sql`
        SELECT 
          t.*,
          u.name as assigned_user_name
        FROM tickets t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.customer_id = ${customerId}
        ORDER BY t.created_at DESC
      `,

        // Billing configuration
        sql`
        SELECT * FROM customer_billing_config 
        WHERE customer_id = ${customerId}
      `,

        // Payment accounts
        sql`
        SELECT * FROM customer_payment_accounts 
        WHERE customer_id = ${customerId}
      `,
      ])

    if (customerResult.length === 0) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 })
    }

    const customer = customerResult[0]

    return NextResponse.json({
      success: true,
      customer: {
        ...customer,
        services: servicesResult,
        invoices: invoicesResult,
        tickets: ticketsResult,
        billing_config: billingConfigResult[0] || null,
        payment_accounts: paymentAccountsResult,
      },
    })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

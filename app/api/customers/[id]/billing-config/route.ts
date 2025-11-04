import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id

    const customerCheck = await sql`
      SELECT id FROM customers WHERE id = ${customerId}
    `

    if (customerCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: `Customer with ID ${customerId} does not exist` },
        { status: 404 },
      )
    }

    const config = await sql`
      SELECT * FROM customer_billing_configurations 
      WHERE customer_id = ${customerId}
    `

    const paymentAccounts = await sql`
      SELECT id, title, field_1, type FROM customer_payment_accounts 
      WHERE customer_id = ${customerId}
    `

    if (config.length === 0) {
      // Create default configuration if none exists
      const [newConfig] = await sql`
        INSERT INTO customer_billing_configurations (
          customer_id, billing_cycle, billing_day, pro_rata_enabled,
          tax_inclusive, tax_rate, payment_terms, grace_period_days,
          late_fee_type, late_fee_amount, credit_limit, auto_generate_invoices,
          auto_send_invoices, auto_send_reminders, reminder_days_before,
          reminder_days_after, notification_methods, created_by
        ) VALUES (
          ${customerId}, 'monthly', 1, true, false, 16.0, 30, 7,
          'percentage', 5.0, 0, true, true, true, 3, 7, 
          '["email"]', 1
        ) RETURNING *
      `

      return NextResponse.json({
        success: true,
        config: {
          billing_enabled: newConfig.auto_generate_invoices || true,
          payment_period: newConfig.billing_cycle === "monthly" ? "1 month" : newConfig.billing_cycle,
          payment_method: "Netcash Debit Order",
          billing_day: newConfig.billing_day || 1,
          payment_due_days: newConfig.payment_terms || 15,
          blocking_period: "Same as payment due date",
          deactivation_period: newConfig.overdue_threshold_days || 10,
          minimal_balance: 0.0,
          partner_percent: 0.0,
          auto_create_invoices: newConfig.auto_generate_invoices || true,
          send_billing_notifications: newConfig.auto_send_invoices || true,
          account_balance: 680.0,
          next_block_status: "In the next billing cycle",
          reminders_enabled: newConfig.auto_send_reminders || true,
          reminder_message_type: "Email",
          reminder_1_day: newConfig.reminder_days_before || 10,
          reminder_2_day: 5,
          reminder_3_day: 5,
        },
        payment_accounts: [],
      })
    }

    const billingData = config[0]

    return NextResponse.json({
      success: true,
      config: {
        billing_enabled: billingData.auto_generate_invoices || true,
        payment_period: billingData.billing_cycle === "monthly" ? "1 month" : billingData.billing_cycle,
        payment_method: "Netcash Debit Order",
        billing_day: billingData.billing_day || 1,
        payment_due_days: billingData.payment_terms || 15,
        blocking_period: "Same as payment due date",
        deactivation_period: billingData.overdue_threshold_days || 10,
        minimal_balance: 0.0,
        partner_percent: 0.0,
        auto_create_invoices: billingData.auto_generate_invoices || true,
        send_billing_notifications: billingData.auto_send_invoices || true,
        account_balance: 680.0,
        next_block_status: "In the next billing cycle",
        reminders_enabled: billingData.auto_send_reminders || true,
        reminder_message_type: "Email",
        reminder_1_day: billingData.reminder_days_before || 10,
        reminder_2_day: 5,
        reminder_3_day: 5,
      },
      payment_accounts: paymentAccounts || [],
    })
  } catch (error) {
    console.error("Error fetching billing config:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch billing config" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id
    const updates = await request.json()

    const customerCheck = await sql`
      SELECT id FROM customers WHERE id = ${customerId}
    `

    if (customerCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: `Customer with ID ${customerId} does not exist` },
        { status: 404 },
      )
    }

    // Map UI fields to database fields
    const dbUpdates: any = {}

    if (updates.billing_enabled !== undefined) {
      dbUpdates.auto_generate_invoices = updates.billing_enabled
    }
    if (updates.payment_period !== undefined) {
      dbUpdates.billing_cycle = updates.payment_period === "1 month" ? "monthly" : updates.payment_period
    }
    if (updates.billing_day !== undefined) {
      dbUpdates.billing_day = updates.billing_day
    }
    if (updates.payment_due_days !== undefined) {
      dbUpdates.payment_terms = updates.payment_due_days
    }
    if (updates.deactivation_period !== undefined) {
      dbUpdates.overdue_threshold_days = updates.deactivation_period
    }
    if (updates.auto_create_invoices !== undefined) {
      dbUpdates.auto_generate_invoices = updates.auto_create_invoices
    }
    if (updates.send_billing_notifications !== undefined) {
      dbUpdates.auto_send_invoices = updates.send_billing_notifications
    }
    if (updates.reminders_enabled !== undefined) {
      dbUpdates.auto_send_reminders = updates.reminders_enabled
    }
    if (updates.reminder_1_day !== undefined) {
      dbUpdates.reminder_days_before = updates.reminder_1_day
    }

    if (Object.keys(dbUpdates).length > 0) {
      const setClauses = Object.entries(dbUpdates)
        .map(([key, value]) => `${key} = ${typeof value === "string" ? `'${value}'` : value}`)
        .join(", ")

      await sql.unsafe(`
        UPDATE customer_billing_configurations 
        SET ${setClauses}, updated_at = NOW()
        WHERE customer_id = ${customerId}
      `)
    }

    return NextResponse.json({
      success: true,
      message: "Billing configuration updated successfully",
    })
  } catch (error) {
    console.error("Error updating billing config:", error)
    return NextResponse.json({ success: false, error: "Failed to update billing config" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id
    const configData = await request.json()

    const customerCheck = await sql`
      SELECT id FROM customers WHERE id = ${customerId}
    `

    if (customerCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: `Customer with ID ${customerId} does not exist` },
        { status: 404 },
      )
    }

    const billingCycle =
      configData.billing_cycle ||
      (configData.payment_period === "1_month" ? "monthly" : configData.payment_period) ||
      "monthly"

    const [updatedConfig] = await sql`
      UPDATE customer_billing_configurations 
      SET 
        billing_cycle = ${billingCycle},
        billing_day = ${configData.billing_day || 1},
        pro_rata_enabled = ${configData.pro_rata_enabled ?? true},
        tax_inclusive = ${configData.tax_inclusive ?? false},
        tax_rate = ${configData.tax_rate || 0},
        tax_exempt = ${configData.tax_exempt ?? false},
        payment_terms = ${configData.payment_terms || configData.due_date_days || 30},
        grace_period_days = ${configData.grace_period_days || 7},
        late_fee_type = ${configData.late_fee_type || "percentage"},
        late_fee_amount = ${configData.late_fee_amount || 0},
        credit_limit = ${configData.credit_limit || 0},
        auto_suspend_on_overdue = ${configData.auto_suspend_on_overdue ?? false},
        overdue_threshold_days = ${configData.overdue_threshold_days || 10},
        auto_generate_invoices = ${configData.auto_generate_invoices ?? configData.auto_create_invoices ?? true},
        auto_send_invoices = ${configData.auto_send_invoices ?? configData.send_billing_notifications ?? true},
        auto_send_reminders = ${configData.auto_send_reminders ?? configData.reminders_enabled ?? true},
        reminder_days_before = ${configData.reminder_days_before || configData.reminder_1_day || 3},
        reminder_days_after = ${configData.reminder_days_after || 7},
        notification_email = ${configData.notification_email || null},
        notification_phone = ${configData.notification_phone || null},
        notification_methods = ${JSON.stringify(configData.notification_methods || ["email"])},
        custom_invoice_template = ${configData.custom_invoice_template || null},
        custom_payment_terms = ${configData.custom_payment_terms || null},
        billing_notes = ${configData.billing_notes || null},
        updated_at = NOW()
      WHERE customer_id = ${customerId}
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: updatedConfig,
      message: "Billing configuration updated successfully",
    })
  } catch (error) {
    console.error("Error updating billing config:", error)
    return NextResponse.json({ success: false, error: "Failed to update billing config" }, { status: 500 })
  }
}

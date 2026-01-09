import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { authorization } = Object.fromEntries(request.headers.entries())

    if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const today = new Date()
    const results = {
      processed: 0,
      reminders_sent: 0,
      errors: 0,
      details: [] as any[],
    }

    // Get customers with pending invoices and reminder settings
    const customersForReminders = await sql`
      SELECT 
        c.id as customer_id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        i.id as invoice_id,
        i.invoice_number,
        i.amount,
        i.due_date,
        i.status,
        cbc.auto_send_reminders,
        cbc.reminder_days_before,
        cbc.reminder_days_after,
        cbc.notification_methods,
        cbc.notification_email,
        cbc.notification_phone
      FROM customers c
      JOIN customer_billing_configurations cbc ON c.id = cbc.customer_id
      JOIN invoices i ON c.id = i.customer_id
      WHERE cbc.auto_send_reminders = true
        AND i.status IN ('pending', 'overdue')
        AND c.status = 'active'
    `

    for (const customer of customersForReminders) {
      try {
        results.processed++

        const dueDate = new Date(customer.due_date)
        const daysDifference = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        let shouldSendReminder = false
        let reminderType = ""

        // Check if reminder should be sent
        if (daysDifference === customer.reminder_days_before && daysDifference > 0) {
          shouldSendReminder = true
          reminderType = "before_due"
        } else if (daysDifference === -customer.reminder_days_after && daysDifference < 0) {
          shouldSendReminder = true
          reminderType = "after_due"
        }

        if (shouldSendReminder) {
          // Check if reminder already sent for this invoice and type
          const existingReminder = await sql`
            SELECT id FROM payment_reminders 
            WHERE customer_id = ${customer.customer_id} 
              AND due_date = ${customer.due_date}
              AND reminder_type = ${reminderType}
              AND status = 'sent'
          `

          if (existingReminder.length === 0) {
            // Send reminder
            const notificationMethods = JSON.parse(customer.notification_methods || '["email"]')

            for (const method of notificationMethods) {
              const recipient =
                method === "email"
                  ? customer.notification_email || customer.email
                  : customer.notification_phone || customer.phone

              if (recipient) {
                await sql`
                  INSERT INTO messages (
                    recipient_id,
                    recipient_type,
                    message_type,
                    subject,
                    content,
                    status,
                    metadata,
                    created_at
                  ) VALUES (
                    ${customer.customer_id},
                    'customer',
                    ${method},
                    ${reminderType === "before_due" ? "Payment Reminder" : "Overdue Payment Notice"},
                    ${generateReminderContent(customer, reminderType)},
                    'scheduled',
                    ${JSON.stringify({ invoice_id: customer.invoice_id, reminder_type: reminderType })},
                    NOW()
                  )
                `
              }
            }

            // Record the reminder
            await sql`
              INSERT INTO payment_reminders (
                customer_id,
                reminder_type,
                amount,
                due_date,
                status,
                sent_at,
                created_at
              ) VALUES (
                ${customer.customer_id},
                ${reminderType},
                ${customer.amount},
                ${customer.due_date},
                'sent',
                NOW(),
                NOW()
              )
            `

            results.reminders_sent++
            results.details.push({
              customer_id: customer.customer_id,
              customer_name: `${customer.first_name} ${customer.last_name}`,
              invoice_number: customer.invoice_number,
              reminder_type: reminderType,
              status: "sent",
            })
          }
        }
      } catch (error) {
        results.errors++
        results.details.push({
          customer_id: customer.customer_id,
          status: "error",
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Processed ${results.processed} customers, sent ${results.reminders_sent} reminders`,
    })
  } catch (error) {
    console.error("Error in automated reminders:", error)
    return NextResponse.json({ error: "Automated reminders failed" }, { status: 500 })
  }
}

function generateReminderContent(customer: any, reminderType: string): string {
  const customerName = `${customer.first_name} ${customer.last_name}`
  const amount = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(customer.amount)
  const dueDate = new Date(customer.due_date).toLocaleDateString()

  if (reminderType === "before_due") {
    return `Dear ${customerName}, this is a friendly reminder that your invoice ${customer.invoice_number} for ${amount} is due on ${dueDate}. Please ensure payment is made on time to avoid any service interruption.`
  } else {
    return `Dear ${customerName}, your invoice ${customer.invoice_number} for ${amount} was due on ${dueDate} and is now overdue. Please make payment immediately to avoid service suspension.`
  }
}

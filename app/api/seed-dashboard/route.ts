import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'

export async function POST() {
  try {
    const sql = await getSql()
    
    console.log('[v0] Starting dashboard data seeding...')
    
    // Seed Customers
    for (let i = 1; i <= 50; i++) {
      await sql`
        INSERT INTO customers (
          account_number, first_name, last_name, email, phone,
          address, city, state, postal_code, country,
          status, created_at
        ) VALUES (
          ${`ACC${String(i).padStart(4, '0')}`},
          ${'Customer' + i},
          ${'User' + i},
          ${`customer${i}@example.com`},
          ${`+254700${String(i).padStart(6, '0')}`},
          ${`${i} Main Street`},
          'Nairobi',
          'Nairobi County',
          '00100',
          'Kenya',
          ${i <= 45 ? 'active' : 'pending'},
          ${new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)}
        )
        ON CONFLICT (account_number) DO NOTHING
      `
    }

    // Seed Service Plans
    const servicePlans = [
      { name: 'Basic Home', download: 10, upload: 5, price: 2500 },
      { name: 'Standard Home', download: 25, upload: 10, price: 4500 },
      { name: 'Premium Home', download: 50, upload: 25, price: 7500 },
      { name: 'Business Pro', download: 100, upload: 50, price: 15000 },
    ]
    
    for (const plan of servicePlans) {
      await sql`
        INSERT INTO service_plans (
          name, description, download_speed, upload_speed, price, status
        ) VALUES (
          ${plan.name},
          'Reliable internet service',
          ${plan.download},
          ${plan.upload},
          ${plan.price},
          'active'
        )
        ON CONFLICT DO NOTHING
      `
    }

    // Seed Customer Services
    const customers = await sql`SELECT id FROM customers LIMIT 40`
    const plans = await sql`SELECT id, price FROM service_plans`
    
    for (const customer of customers) {
      const plan = plans[Math.floor(Math.random() * plans.length)]
      await sql`
        INSERT INTO customer_services (
          customer_id, service_plan_id, status, start_date, monthly_fee
        ) VALUES (
          ${customer.id},
          ${plan.id},
          'active',
          ${new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000)},
          ${plan.price}
        )
        ON CONFLICT DO NOTHING
      `
    }

    // Seed Invoices
    const services = await sql`
      SELECT cs.customer_id, cs.monthly_fee 
      FROM customer_services cs 
      WHERE cs.status = 'active'
      LIMIT 40
    `
    
    for (const service of services) {
      for (let month = 0; month < 3; month++) {
        const invoiceDate = new Date()
        invoiceDate.setMonth(invoiceDate.getMonth() - month)
        const dueDate = new Date(invoiceDate)
        dueDate.setDate(dueDate.getDate() + 15)
        
        await sql`
          INSERT INTO invoices (
            customer_id, invoice_number, amount, due_date, status, created_at
          ) VALUES (
            ${service.customer_id},
            ${'INV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)},
            ${service.monthly_fee},
            ${dueDate},
            ${month === 0 ? 'pending' : 'paid'},
            ${invoiceDate}
          )
        `
      }
    }

    // Seed Payments
    const paidInvoices = await sql`
      SELECT id, customer_id, amount 
      FROM invoices 
      WHERE status = 'paid'
      LIMIT 80
    `
    
    for (const invoice of paidInvoices) {
      await sql`
        INSERT INTO payments (
          customer_id, amount, payment_method, status, payment_date
        ) VALUES (
          ${invoice.customer_id},
          ${invoice.amount},
          ${['mpesa', 'bank_transfer', 'cash'][Math.floor(Math.random() * 3)]},
          'completed',
          ${new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000)}
        )
      `
    }

    // Seed Support Tickets
    const ticketCustomers = await sql`SELECT id FROM customers LIMIT 15`
    const priorities = ['low', 'medium', 'high']
    const statuses = ['open', 'in_progress', 'resolved', 'closed']
    
    for (const customer of ticketCustomers) {
      await sql`
        INSERT INTO support_tickets (
          customer_id, title, description, priority, status, created_at
        ) VALUES (
          ${customer.id},
          ${'Support Request #' + Math.floor(Math.random() * 1000)},
          'Customer needs assistance with their service',
          ${priorities[Math.floor(Math.random() * priorities.length)]},
          ${statuses[Math.floor(Math.random() * statuses.length)]},
          ${new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)}
        )
      `
    }

    console.log('[v0] Dashboard data seeding completed!')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Dashboard data seeded successfully' 
    })
  } catch (error) {
    console.error('[v0] Error seeding dashboard:', error)
    return NextResponse.json({ 
      error: 'Failed to seed dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

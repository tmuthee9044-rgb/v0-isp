import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function POST() {
  try {
    const sql = await getSql()

    // Seed customers
    await sql`
      INSERT INTO customers (name, email, phone, status, created_at)
      SELECT 
        'Customer ' || generate_series,
        'customer' || generate_series || '@example.com',
        '+254700000' || LPAD(generate_series::text, 3, '0'),
        CASE WHEN random() < 0.9 THEN 'active' ELSE 'suspended' END,
        NOW() - (random() * 365 || ' days')::interval
      FROM generate_series(1, 500)
      ON CONFLICT DO NOTHING
    `

    // Seed invoices
    await sql`
      INSERT INTO invoices (customer_id, amount, status, due_date, created_at)
      SELECT 
        (SELECT id FROM customers ORDER BY random() LIMIT 1),
        (random() * 10000 + 1000)::numeric(10,2),
        CASE 
          WHEN random() < 0.7 THEN 'paid'
          WHEN random() < 0.9 THEN 'pending'
          ELSE 'overdue'
        END,
        NOW() + (random() * 30 || ' days')::interval,
        NOW() - (random() * 90 || ' days')::interval
      FROM generate_series(1, 1000)
      ON CONFLICT DO NOTHING
    `

    // Seed services
    await sql`
      INSERT INTO services (customer_id, name, status, monthly_fee)
      SELECT 
        (SELECT id FROM customers ORDER BY random() LIMIT 1),
        'Internet Package ' || (random() * 100)::int || 'Mbps',
        CASE WHEN random() < 0.95 THEN 'active' ELSE 'suspended' END,
        (random() * 5000 + 1000)::numeric(10,2)
      FROM generate_series(1, 800)
      ON CONFLICT DO NOTHING
    `

    // Seed support tickets
    await sql`
      INSERT INTO support_tickets (customer_id, subject, status, priority, created_at)
      SELECT 
        (SELECT id FROM customers ORDER BY random() LIMIT 1),
        'Support Request #' || generate_series,
        CASE 
          WHEN random() < 0.6 THEN 'resolved'
          WHEN random() < 0.8 THEN 'in_progress'
          ELSE 'open'
        END,
        CASE 
          WHEN random() < 0.6 THEN 'low'
          WHEN random() < 0.9 THEN 'medium'
          ELSE 'high'
        END,
        NOW() - (random() * 30 || ' days')::interval
      FROM generate_series(1, 200)
      ON CONFLICT DO NOTHING
    `

    // Seed network devices
    await sql`
      INSERT INTO network_devices (name, type, status, ip_address)
      SELECT 
        'Device-' || generate_series,
        CASE 
          WHEN random() < 0.5 THEN 'router'
          ELSE 'switch'
        END,
        CASE WHEN random() < 0.95 THEN 'online' ELSE 'offline' END,
        '192.168.' || (random() * 255)::int || '.' || (random() * 255)::int
      FROM generate_series(1, 50)
      ON CONFLICT DO NOTHING
    `

    return NextResponse.json({
      success: true,
      message: "Dashboard data seeded successfully",
    })
  } catch (error: any) {
    console.error("Seed error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function GET() {
  try {
    const sql = await getSql();
    
    // Check if tables have data
    const customerCount = await sql`SELECT COUNT(*) as count FROM customers`;
    const invoiceCount = await sql`SELECT COUNT(*) as count FROM invoices`;
    const paymentCount = await sql`SELECT COUNT(*) as count FROM payments`;
    const serviceCount = await sql`SELECT COUNT(*) as count FROM customer_services WHERE status = 'active'`;
    const ticketCount = await sql`SELECT COUNT(*) as count FROM support_tickets`;
    
    return NextResponse.json({
      customers: customerCount[0]?.count || 0,
      invoices: invoiceCount[0]?.count || 0,
      payments: paymentCount[0]?.count || 0,
      services: serviceCount[0]?.count || 0,
      tickets: ticketCount[0]?.count || 0,
      message: 'Database tables exist and are accessible'
    });
  } catch (error) {
    console.error('[v0] Error checking data:', error);
    return NextResponse.json(
      { error: 'Failed to check data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

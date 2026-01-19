import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()

    const payrollHistory = await sql`
      SELECT 
        TO_CHAR(pay_period_start, 'YYYY-MM') as period,
        EXTRACT(MONTH FROM pay_period_start)::INTEGER as period_month,
        EXTRACT(YEAR FROM pay_period_start)::INTEGER as period_year,
        COUNT(DISTINCT employee_id) as employee_count,
        SUM(gross_pay) as gross_pay,
        SUM(COALESCE(tax, 0) + COALESCE(nhif, 0) + COALESCE(nssf, 0) + COALESCE(deductions, 0)) as total_deductions,
        SUM(net_pay) as net_pay,
        status,
        MAX(created_at) as processed_date
      FROM payroll_records
      GROUP BY TO_CHAR(pay_period_start, 'YYYY-MM'), EXTRACT(MONTH FROM pay_period_start), EXTRACT(YEAR FROM pay_period_start), status
      ORDER BY TO_CHAR(pay_period_start, 'YYYY-MM') DESC
      LIMIT 12
    `

    return NextResponse.json({ success: true, payrollHistory: payrollHistory || [] })
  } catch (error) {
    console.error("Error fetching payroll history:", error)
    return NextResponse.json({ success: false, payrollHistory: [], error: String(error) })
  }
}

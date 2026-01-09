import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()

    const payrollHistory = await sql`
      SELECT 
        period,
        CAST(SPLIT_PART(period, '-', 2) AS INTEGER) as period_month,
        CAST(SPLIT_PART(period, '-', 1) AS INTEGER) as period_year,
        COUNT(DISTINCT employee_id) as employee_count,
        SUM(basic_salary + COALESCE(allowances, 0) + COALESCE(overtime, 0)) as gross_pay,
        SUM(paye + COALESCE(nssf, 0) + COALESCE(sha, 0) + COALESCE(other_deductions, 0)) as total_deductions,
        SUM(net_pay) as net_pay,
        status,
        MAX(processed_at) as processed_date
      FROM payroll_records
      GROUP BY period, status
      ORDER BY period DESC
      LIMIT 12
    `

    return NextResponse.json({ success: true, payrollHistory: payrollHistory || [] })
  } catch (error) {
    console.error("Error fetching payroll history:", error)
    return NextResponse.json({ success: false, payrollHistory: [], error: String(error) })
  }
}

import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()

    const payrollHistory = await sql`
      SELECT 
        period_month,
        period_year,
        COUNT(DISTINCT employee_id) as employee_count,
        SUM(basic_salary + COALESCE(allowances, 0)) as gross_pay,
        SUM(paye_tax + COALESCE(nssf_contribution, 0) + COALESCE(sha_contribution, 0)) as total_deductions,
        SUM(net_pay) as net_pay,
        status,
        processed_date
      FROM payroll_records
      GROUP BY period_month, period_year, status, processed_date
      ORDER BY period_year DESC, period_month DESC
      LIMIT 12
    `

    return NextResponse.json({ payrollHistory: payrollHistory || [] })
  } catch (error) {
    console.error("Error fetching payroll history:", error)
    return NextResponse.json({ payrollHistory: [] })
  }
}

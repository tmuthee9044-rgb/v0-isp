import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { month, year } = await req.json()
    const sql = await getSql()

    const period = `${year}-${String(month).padStart(2, "0")}`

    // Fetch payroll records for the specified period
    // payroll_records.employee_id is VARCHAR matching employees.employee_id (e.g. "EMP001")
    // payroll_records uses a "period" VARCHAR(7) column in YYYY-MM format
    const payrollRecords = await sql`
      SELECT 
        pr.*,
        e.first_name,
        e.last_name,
        e.position,
        e.employee_id as emp_no
      FROM payroll_records pr
      JOIN employees e ON pr.employee_id = e.employee_id
      WHERE pr.period = ${period}
      AND pr.status IN ('processed', 'paid')
      ORDER BY e.employee_id
    `

    if (!payrollRecords || payrollRecords.length === 0) {
      return NextResponse.json({ error: "No processed payroll records found for this period" }, { status: 404 })
    }

    const csvHeader =
      "Employee ID,Name,Position,Basic Salary,Allowances,Overtime,Gross Pay,PAYE,NSSF,SHA,Other Deductions,Total Deductions,Net Pay\n"

    const csvRows = payrollRecords
      .map((record: any) => {
        return [
          record.emp_no,
          `"${record.first_name} ${record.last_name}"`,
          `"${record.position || "N/A"}"`,
          record.basic_salary,
          record.allowances || 0,
          record.overtime || 0,
          record.gross_pay,
          record.paye,
          record.nssf || 0,
          record.sha || 0,
          record.other_deductions || 0,
          record.total_deductions,
          record.net_pay,
        ].join(",")
      })
      .join("\n")

    const csvContent = csvHeader + csvRows

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="payslips-${period}.csv"`,
      },
    })
  } catch (error) {
    console.error("Error exporting payslips:", error)
    return NextResponse.json({ error: "Failed to export payslips" }, { status: 500 })
  }
}

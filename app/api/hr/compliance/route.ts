import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function GET() {
  try {
    const sql = await getSql()

    // Get total employees
    const totalEmployees = await sql`
      SELECT COUNT(*) as count FROM employees WHERE status = 'active'
    `
    const employeeCount = Number.parseInt(totalEmployees[0]?.count || "0")

    // Get NSSF compliance - employees with NSSF numbers
    const nssfCompliant = await sql`
      SELECT COUNT(*) as count FROM employees 
      WHERE status = 'active' AND nssf_number IS NOT NULL AND nssf_number != ''
    `
    const nssfCount = Number.parseInt(nssfCompliant[0]?.count || "0")
    const nssfPercentage = employeeCount > 0 ? Math.round((nssfCount / employeeCount) * 100) : 0

    // Get SHA compliance - employees with SHA/NHIF numbers
    const shaCompliant = await sql`
      SELECT COUNT(*) as count FROM employees 
      WHERE status = 'active' AND sha_number IS NOT NULL AND sha_number != ''
    `
    const shaCount = Number.parseInt(shaCompliant[0]?.count || "0")
    const shaPercentage = employeeCount > 0 ? Math.round((shaCount / employeeCount) * 100) : 0

    // Get KRA PIN compliance
    const kraCompliant = await sql`
      SELECT COUNT(*) as count FROM employees 
      WHERE status = 'active' AND kra_pin IS NOT NULL AND kra_pin != ''
    `
    const kraCount = Number.parseInt(kraCompliant[0]?.count || "0")

    // Get contracts expiring within 30 days
    const expiringContracts = await sql`
      SELECT COUNT(*) as count FROM employees 
      WHERE status = 'active' 
        AND contract_end_date IS NOT NULL 
        AND contract_end_date <= NOW() + INTERVAL '30 days'
        AND contract_end_date >= NOW()
    `
    const expiringCount = Number.parseInt(expiringContracts[0]?.count || "0")

    // Get monthly statutory deductions from payroll
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()

    const payrollStats = await sql`
      SELECT 
        COALESCE(SUM(paye), 0) as total_paye,
        COALESCE(SUM(nssf), 0) as total_nssf,
        COALESCE(SUM(nhif), 0) as total_nhif
      FROM payroll
      WHERE EXTRACT(MONTH FROM pay_period_start) = ${currentMonth}
        AND EXTRACT(YEAR FROM pay_period_start) = ${currentYear}
    `

    const totalPaye = Number.parseFloat(payrollStats[0]?.total_paye || "0")
    const totalNssf = Number.parseFloat(payrollStats[0]?.total_nssf || "0")
    const totalSha = Number.parseFloat(payrollStats[0]?.total_nhif || "0")
    const totalDeductions = totalPaye + totalNssf + totalSha

    return NextResponse.json({
      success: true,
      compliance: {
        nssf: {
          compliant: nssfCount,
          total: employeeCount,
          percentage: nssfPercentage,
        },
        sha: {
          compliant: shaCount,
          total: employeeCount,
          percentage: shaPercentage,
        },
        kra: {
          compliant: kraCount,
          total: employeeCount,
        },
        expiringContracts: expiringCount,
      },
      statutory: {
        totalPaye,
        totalNssf,
        totalSha,
        totalDeductions,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error fetching compliance data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        compliance: {
          nssf: { compliant: 0, total: 0, percentage: 0 },
          sha: { compliant: 0, total: 0, percentage: 0 },
          kra: { compliant: 0, total: 0 },
          expiringContracts: 0,
        },
        statutory: {
          totalPaye: 0,
          totalNssf: 0,
          totalSha: 0,
          totalDeductions: 0,
        },
      },
      { status: 500 },
    )
  }
}

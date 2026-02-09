"use server"

import { getSql } from "@/lib/db"
import { revalidatePath } from "next/cache"

export interface PayrollCalculation {
  employeeId: string
  employeeName: string
  basicSalary: number
  allowances: number
  overtime: number
  grossPay: number
  paye: number
  nssf: number
  sha: number
  otherDeductions: number
  totalDeductions: number
  netPay: number
}

export interface PayrollSummary {
  totalEmployees: number
  totalGrossPay: number
  totalDeductions: number
  totalNetPay: number
  totalPaye: number
  totalNssf: number
  totalSha: number
}

// Calculate PAYE based on Kenyan tax brackets
function calculatePaye(grossPay: number): number {
  let paye = 0
  const monthlyGross = grossPay

  // 2024 PAYE rates
  if (monthlyGross <= 24000) {
    paye = monthlyGross * 0.1
  } else if (monthlyGross <= 32333) {
    paye = 2400 + (monthlyGross - 24000) * 0.25
  } else if (monthlyGross <= 500000) {
    paye = 2400 + 2083.25 + (monthlyGross - 32333) * 0.3
  } else if (monthlyGross <= 800000) {
    paye = 2400 + 2083.25 + 140300.1 + (monthlyGross - 500000) * 0.325
  } else {
    paye = 2400 + 2083.25 + 140300.1 + 97500 + (monthlyGross - 800000) * 0.35
  }

  // Personal relief
  paye = Math.max(0, paye - 2400)

  return Math.round(paye)
}

// Calculate NSSF contribution
function calculateNssf(grossPay: number): number {
  const pensionableEarnings = Math.min(grossPay, 18000) // Tier I limit
  const tierIContribution = pensionableEarnings * 0.06

  // Tier II (if gross pay > 18000)
  let tierIIContribution = 0
  if (grossPay > 18000) {
    const tierIIEarnings = Math.min(grossPay - 18000, 18000) // Max 18000 for Tier II
    tierIIContribution = tierIIEarnings * 0.06
  }

  return Math.round(tierIContribution + tierIIContribution)
}

// Calculate SHA contribution
function calculateSha(grossPay: number): number {
  // SHA rates based on salary bands (2024 rates)
  if (grossPay <= 5999) return 150
  if (grossPay <= 7999) return 300
  if (grossPay <= 11999) return 400
  if (grossPay <= 14999) return 500
  if (grossPay <= 19999) return 600
  if (grossPay <= 24999) return 750
  if (grossPay <= 29999) return 850
  if (grossPay <= 34999) return 900
  if (grossPay <= 39999) return 950
  if (grossPay <= 44999) return 1000
  if (grossPay <= 49999) return 1100
  if (grossPay <= 59999) return 1200
  if (grossPay <= 69999) return 1300
  if (grossPay <= 79999) return 1400
  if (grossPay <= 89999) return 1500
  if (grossPay <= 99999) return 1600

  // For salaries above 100,000, use 2.75% of gross pay
  return Math.round(grossPay * 0.0275)
}

export async function generatePayroll(
  period: string,
  employeeIds: string[],
): Promise<{
  success: boolean
  data?: { calculations: PayrollCalculation[]; summary: PayrollSummary }
  error?: string
}> {
  try {
    console.log("[v0] Generating payroll for period:", period, "employees:", employeeIds.length)

    const sql = await getSql()

    const employees = await sql`
      SELECT 
        id,
        employee_id,
        first_name,
        last_name,
        salary as basic_salary,
        allowances
      FROM employees 
      WHERE employee_id = ANY(${employeeIds}) 
      AND status = 'active'
    `

    const employeeList = Array.isArray(employees) ? employees : employees.rows || []

    console.log("[v0] Found active employees:", employeeList.length)

    if (!employeeList || employeeList.length === 0) {
      return {
        success: false,
        error: "No active employees found",
      }
    }

    const calculations: PayrollCalculation[] = []
    let totalGrossPay = 0
    let totalDeductions = 0
    let totalNetPay = 0
    let totalPaye = 0
    let totalNssf = 0
    let totalSha = 0

    for (const employee of employeeList) {
      const basicSalary = Number.parseFloat(employee.basic_salary) || 0
      const allowances = Number.parseFloat(employee.allowances) || 0
      const overtime = 0

      const grossPay = basicSalary + allowances + overtime
      const paye = calculatePaye(grossPay)
      const nssf = calculateNssf(grossPay)
      const sha = calculateSha(grossPay)
      const otherDeductions = 0

      const totalEmployeeDeductions = paye + nssf + sha + otherDeductions
      const netPay = grossPay - totalEmployeeDeductions

      const calculation: PayrollCalculation = {
        employeeId: employee.employee_id,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        basicSalary,
        allowances,
        overtime,
        grossPay,
        paye,
        nssf,
        sha,
        otherDeductions,
        totalDeductions: totalEmployeeDeductions,
        netPay,
      }

      calculations.push(calculation)

      const periodStart = `${period}-01`
      const periodEnd = `${period}-31`
      const employeeName = `${employee.first_name} ${employee.last_name}`

      // Delete existing record first, then insert to avoid ON CONFLICT constraint issues
      // Use employee.employee_id (VARCHAR) as the reference, not employee.id (INTEGER)
      try {
        await sql`
          DELETE FROM payroll_records 
          WHERE employee_id = ${employee.employee_id}
          AND period = ${period}
        `
      } catch (deleteErr) {
        console.log("[v0] Delete existing record error (may not exist):", deleteErr)
      }
      
      try {
        await sql`
          INSERT INTO payroll_records (
            employee_id, employee_name, period, basic_salary, 
            allowances, overtime, gross_pay, paye, nssf, sha,
            other_deductions, total_deductions, net_pay, status, created_at
          ) VALUES (
            ${employee.employee_id}, ${employeeName}, 
            ${period}, ${basicSalary},
            ${allowances}, 0, ${grossPay}, 
            ${paye}, ${nssf}, ${sha},
            0, ${totalEmployeeDeductions}, ${netPay}, 'pending', NOW()
          )
        `
        console.log("[v0] Inserted payroll record for:", employee.employee_id)
      } catch (insertErr) {
        console.error("[v0] Insert payroll record error for", employee.employee_id, ":", insertErr)
        throw insertErr
      }

      totalGrossPay += grossPay
      totalDeductions += totalEmployeeDeductions
      totalNetPay += netPay
      totalPaye += paye
      totalNssf += nssf
      totalSha += sha
    }

    const summary: PayrollSummary = {
      totalEmployees: calculations.length,
      totalGrossPay,
      totalDeductions,
      totalNetPay,
      totalPaye,
      totalNssf,
      totalSha,
    }

    console.log("[v0] Payroll generated successfully:", summary)

    revalidatePath("/hr")

    return {
      success: true,
      data: {
        calculations,
        summary,
      },
    }
  } catch (error) {
    console.error("[v0] Error generating payroll:", error)
    return {
      success: false,
      error: "Failed to generate payroll",
    }
  }
}

export async function processPayroll(
  period: string,
  employeeIds: string[],
): Promise<{
  success: boolean
  message: string
}> {
  try {
    console.log("[v0] Processing payroll for period:", period, "employees:", employeeIds.length)

    const sql = await getSql()

    await sql`
      UPDATE payroll_records 
      SET 
        status = 'processed',
        updated_at = NOW()
      WHERE TO_CHAR(pay_period_start, 'YYYY-MM') = ${period}
      AND employee_id = ANY(${employeeIds})
    `

    revalidatePath("/hr")

    console.log("[v0] Payroll processed successfully")

    return {
      success: true,
      message: `Payroll processed successfully for ${employeeIds.length} employees`,
    }
  } catch (error) {
    console.error("[v0] Error processing payroll:", error)
    return {
      success: false,
      message: "Failed to process payroll",
    }
  }
}

export async function getPayrollHistory(): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> {
  try {
    const sql = await getSql()

    const result = await sql`
      SELECT 
        TO_CHAR(pay_period_start, 'YYYY-MM') as period,
        COUNT(*) as employee_count,
        SUM(gross_pay) as total_gross_pay,
        SUM(deductions) as total_deductions,
        SUM(net_pay) as total_net_pay,
        status,
        MAX(created_at) as processed_at
      FROM payroll_records 
      GROUP BY TO_CHAR(pay_period_start, 'YYYY-MM'), status
      ORDER BY TO_CHAR(pay_period_start, 'YYYY-MM') DESC
      LIMIT 12
    `

    const payrollHistory = Array.isArray(result) ? result : result.rows || []

    return {
      success: true,
      data: payrollHistory,
    }
  } catch (error) {
    console.error("Error fetching payroll history:", error)
    return {
      success: false,
      error: "Failed to fetch payroll history",
    }
  }
}

export async function getEmployeesForPayroll(): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> {
  try {
    const sql = await getSql()

    const result = await sql`
      SELECT 
        employee_id,
        first_name,
        last_name,
        position,
        salary as basic_salary,
        allowances,
        status
      FROM employees 
      WHERE status = 'active'
      ORDER BY employee_id
    `

    const employees = Array.isArray(result) ? result : result.rows || []

    const employeesWithName = employees.map((employee: any) => ({
      ...employee,
      name: `${employee.first_name} ${employee.last_name}`,
    }))

    console.log("[v0] Fetched employees for payroll:", employeesWithName.length)

    return {
      success: true,
      data: employeesWithName,
    }
  } catch (error) {
    console.error("[v0] Error fetching employees for payroll:", error)
    return {
      success: false,
      error: "Failed to fetch employees",
    }
  }
}

export async function createEmployee(formData: FormData) {
  try {
    console.warn("createEmployee action deprecated - use /api/employees POST endpoint")
    return { success: false, error: "Please use the API endpoint instead" }
  } catch (error) {
    console.error("Error creating employee:", error)
    return { success: false, error: "Failed to create employee" }
  }
}

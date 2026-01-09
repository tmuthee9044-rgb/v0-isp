"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { DollarSign, FileText, Calculator, Download, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  generatePayroll,
  processPayroll,
  getEmployeesForPayroll,
  type PayrollCalculation,
  type PayrollSummary,
} from "@/app/actions/hr-actions"

interface PayrollModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PayrollModal({ open, onOpenChange }: PayrollModalProps) {
  const [selectedMonth, setSelectedMonth] = useState("2024-01")
  const [isCalculating, setIsCalculating] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [payrollCalculations, setPayrollCalculations] = useState<PayrollCalculation[]>([])
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null)
  const [isCalculated, setIsCalculated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load employees when modal opens
  useEffect(() => {
    if (open) {
      loadEmployees()
    }
  }, [open])

  const loadEmployees = async () => {
    try {
      const result = await getEmployeesForPayroll()
      if (result.success && result.data) {
        setEmployees(result.data)
        // Auto-select all active employees
        setSelectedEmployees(result.data.map((emp) => emp.employee_id))
      } else {
        setError(result.error || "Failed to load employees")
      }
    } catch (error) {
      setError("Failed to load employees")
    }
  }

  const handleSelectEmployee = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees((prev) => [...prev, employeeId])
    } else {
      setSelectedEmployees((prev) => prev.filter((id) => id !== employeeId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployees(employees.map((emp) => emp.employee_id))
    } else {
      setSelectedEmployees([])
    }
  }

  const handleCalculatePayroll = async () => {
    if (selectedEmployees.length === 0) {
      setError("Please select at least one employee")
      return
    }

    setIsCalculating(true)
    setError(null)

    try {
      const result = await generatePayroll(selectedMonth, selectedEmployees)

      if (result.success && result.data) {
        setPayrollCalculations(result.data.calculations)
        setPayrollSummary(result.data.summary)
        setIsCalculated(true)
      } else {
        setError(result.error || "Failed to calculate payroll")
      }
    } catch (error) {
      setError("Failed to calculate payroll")
    } finally {
      setIsCalculating(false)
    }
  }

  const handleProcessPayroll = async () => {
    if (!isCalculated || selectedEmployees.length === 0) {
      setError("Please calculate payroll first")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const result = await processPayroll(selectedMonth, selectedEmployees)

      if (result.success) {
        // Reset form and close modal
        setPayrollCalculations([])
        setPayrollSummary(null)
        setIsCalculated(false)
        setSelectedEmployees([])
        onOpenChange(false)
      } else {
        setError(result.message)
      }
    } catch (error) {
      setError("Failed to process payroll")
    } finally {
      setIsProcessing(false)
    }
  }

  const resetCalculations = () => {
    setPayrollCalculations([])
    setPayrollSummary(null)
    setIsCalculated(false)
    setError(null)
  }

  // Generate month options
  const generateMonthOptions = () => {
    const options = []
    const currentDate = new Date()

    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const label = date.toLocaleDateString("en-US", { year: "numeric", month: "long" })
      options.push({ value, label })
    }

    return options
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payroll Processing</DialogTitle>
          <DialogDescription>Generate and process monthly payroll for employees</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center space-x-4">
            <div className="space-y-2">
              <Label htmlFor="payrollMonth">Payroll Month</Label>
              <Select
                value={selectedMonth}
                onValueChange={(value) => {
                  setSelectedMonth(value)
                  resetCalculations()
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {generateMonthOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCalculatePayroll}
                disabled={isCalculating || selectedEmployees.length === 0}
              >
                <Calculator className="mr-2 h-4 w-4" />
                {isCalculating ? "Calculating..." : "Calculate Payroll"}
              </Button>
              {isCalculated && (
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              )}
            </div>
          </div>

          {payrollSummary && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{payrollSummary.totalEmployees}</div>
                  <p className="text-xs text-muted-foreground">Selected for processing</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gross Pay</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">KSh {(payrollSummary.totalGrossPay || 0).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Total gross amount</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Deductions</CardTitle>
                  <FileText className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">KSh {(payrollSummary.totalDeductions || 0).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">PAYE, NSSF, SHA</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Pay</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">KSh {(payrollSummary.totalNetPay || 0).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Total net amount</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Employee Payroll Details</CardTitle>
              <CardDescription>
                {isCalculated
                  ? "Review calculated payroll before processing"
                  : "Select employees to include in payroll processing"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!isCalculated && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="selectAll"
                      checked={selectedEmployees.length === employees.length && employees.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="selectAll" className="text-sm font-medium">
                      Select All Employees ({employees.length})
                    </Label>
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      {!isCalculated && <TableHead className="w-12">Select</TableHead>}
                      <TableHead>Employee</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Basic Salary</TableHead>
                      <TableHead>Allowances</TableHead>
                      <TableHead>Gross Pay</TableHead>
                      {isCalculated && (
                        <>
                          <TableHead>PAYE</TableHead>
                          <TableHead>NSSF</TableHead>
                          <TableHead>SHA</TableHead>
                          <TableHead>Net Pay</TableHead>
                        </>
                      )}
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(isCalculated
                      ? payrollCalculations
                      : employees.filter((emp) => selectedEmployees.includes(emp.employee_id))
                    ).map((item) => {
                      const employee = isCalculated ? null : item
                      const calculation = isCalculated ? (item as PayrollCalculation) : null

                      return (
                        <TableRow key={isCalculated ? calculation?.employeeId : employee?.employee_id}>
                          {!isCalculated && (
                            <TableCell>
                              <Checkbox
                                checked={selectedEmployees.includes(employee?.employee_id)}
                                onCheckedChange={(checked) =>
                                  handleSelectEmployee(employee?.employee_id, checked as boolean)
                                }
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {isCalculated ? calculation?.employeeName : employee?.name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {isCalculated ? calculation?.employeeId : employee?.employee_id}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{isCalculated ? "N/A" : employee?.position}</TableCell>
                          <TableCell>
                            KSh{" "}
                            {(isCalculated
                              ? calculation?.basicSalary
                              : Number.parseFloat(employee?.basic_salary || "0")
                            ).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            KSh{" "}
                            {(isCalculated
                              ? calculation?.allowances
                              : Number.parseFloat(employee?.allowances || "0")
                            ).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            KSh{" "}
                            {(isCalculated
                              ? calculation?.grossPay
                              : Number.parseFloat(employee?.basic_salary || "0") +
                                Number.parseFloat(employee?.allowances || "0")
                            ).toLocaleString()}
                          </TableCell>
                          {isCalculated && (
                            <>
                              <TableCell>KSh {(calculation?.paye || 0).toLocaleString()}</TableCell>
                              <TableCell>KSh {(calculation?.nssf || 0).toLocaleString()}</TableCell>
                              <TableCell>KSh {(calculation?.sha || 0).toLocaleString()}</TableCell>
                              <TableCell className="font-medium">
                                KSh {(calculation?.netPay || 0).toLocaleString()}
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                            <Badge variant={isCalculated ? "default" : "secondary"}>
                              {isCalculated ? "Calculated" : "Selected"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {isCalculated && payrollSummary && (
            <Card>
              <CardHeader>
                <CardTitle>Statutory Deductions Summary</CardTitle>
                <CardDescription>Breakdown of statutory contributions for selected employees</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Total PAYE:</span>
                      <span className="text-sm">KSh {(payrollSummary.totalPaye || 0).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Pay As You Earn tax deductions</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Total NSSF:</span>
                      <span className="text-sm">KSh {(payrollSummary.totalNssf || 0).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">National Social Security Fund contributions</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Total SHA:</span>
                      <span className="text-sm">KSh {(payrollSummary.totalSha || 0).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Social Health Authority contributions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!isCalculated ? (
            <Button onClick={handleCalculatePayroll} disabled={selectedEmployees.length === 0 || isCalculating}>
              {isCalculating ? "Calculating..." : `Calculate Payroll (${selectedEmployees.length} employees)`}
            </Button>
          ) : (
            <Button onClick={handleProcessPayroll} disabled={isProcessing}>
              {isProcessing ? "Processing..." : `Process Payroll (${payrollCalculations.length} employees)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

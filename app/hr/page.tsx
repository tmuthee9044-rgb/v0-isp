"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  UserCheck,
  Plus,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Award,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Clock,
  TrendingUp,
  Shield,
} from "lucide-react"
import { AddEmployeeModal } from "@/components/add-employee-modal"
import { EmployeeDetailsModal } from "@/components/employee-details-modal"
import { PayrollModal } from "@/components/payroll-modal"
import { LeaveRequestModal } from "@/components/leave-request-modal"
import { PerformanceReviewModal } from "@/components/performance-review-modal"
import { formatCurrency, formatCurrencyCompact } from "@/lib/currency"

export default function HRPage() {
  const [selectedTab, setSelectedTab] = useState("overview")
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false)
  const [showPayroll, setShowPayroll] = useState(false)
  const [showLeaveRequest, setShowLeaveRequest] = useState(false)
  const [showPerformanceReview, setShowPerformanceReview] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [editingEmployee, setEditingEmployee] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<any[]>([])
  const [leaveRequests, setLeaveRequests] = useState<any[]>([])
  const [leaveStats, setLeaveStats] = useState({ pending: 0, approved: 0, onLeave: 0, approvedDays: 0 })
  const [payrollHistory, setPayrollHistory] = useState<any[]>([])
  const [performanceReviews, setPerformanceReviews] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [complianceData, setComplianceData] = useState<any>({
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
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [employeesRes, activitiesRes, leaveRes, payrollRes, performanceRes, departmentsRes, complianceRes] =
          await Promise.all([
            fetch("/api/employees", { next: { revalidate: 60 } }),
            fetch("/api/hr/activities"),
            fetch("/api/hr/leave-requests"),
            fetch("/api/hr/payroll-history"),
            fetch("/api/hr/performance-reviews"),
            fetch("/api/hr/departments"),
            fetch("/api/hr/compliance"),
          ])

        const [
          employeesData,
          activitiesData,
          leaveData,
          payrollData,
          performanceData,
          departmentsData,
          complianceDataRes,
        ] = await Promise.all([
          employeesRes.ok ? employeesRes.json() : { employees: [] },
          activitiesRes.ok ? activitiesRes.json() : { activities: [] },
          leaveRes.ok
            ? leaveRes.json()
            : { leaveRequests: [], stats: { pending: 0, approved: 0, onLeave: 0, approvedDays: 0 } },
          payrollRes.ok ? payrollRes.json() : { payrollHistory: [] },
          performanceRes.ok ? performanceRes.json() : { reviews: [] },
          departmentsRes.ok ? departmentsRes.json() : { departments: [] },
          complianceRes.ok ? complianceRes.json() : null,
        ])

        if (employeesData.success) {
          setEmployees(employeesData.employees || [])
        }

        if (activitiesData.success) {
          setActivities(activitiesData.activities || [])
        }

        if (leaveData.success) {
          setLeaveRequests(leaveData.leaveRequests || [])
          setLeaveStats({
            pending: leaveData.stats?.pending || 0,
            approved: leaveData.stats?.approved || 0,
            onLeave: leaveData.stats?.onLeave || 0,
            approvedDays: leaveData.stats?.approvedDays || 0,
          })
        }

        if (payrollData.success) {
          setPayrollHistory(payrollData.payrollHistory || [])
        }

        if (departmentsData.success) {
          setDepartments(departmentsData.departments || [])
        }

        // Assuming performanceData also has a success flag and reviews property
        if (performanceData.success) {
          setPerformanceReviews(performanceData.reviews || [])
        }

        if (complianceDataRes?.success) {
          setComplianceData(complianceDataRes)
        }

        setLoading(false)
      } catch (error) {
        console.error("Error fetching data:", error)
        setEmployees([])
        setActivities([])
        setLeaveRequests([])
        setPayrollHistory([])
        setPerformanceReviews([])
        setDepartments([]) // Reset departments on error
        setComplianceData({
          // Reset compliance data on error
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
        })
        setLoading(false)
      }
    }

    fetchData()

    const handleEditEvent = (event: any) => {
      setEditingEmployee(event.detail.employee)
      setShowAddEmployee(true)
    }

    const handleLeaveAdded = () => {
      console.log("[v0] Leave added event received, refreshing leave requests")
      fetchLeaveRequests()
    }

    const handleReviewAdded = () => {
      console.log("[v0] Review added event received, refreshing performance reviews")
      fetchPerformanceReviews()
    }

    window.addEventListener("editEmployee", handleEditEvent)
    window.addEventListener("leaveAdded", handleLeaveAdded)
    window.addEventListener("reviewAdded", handleReviewAdded)
    window.addEventListener("leaveRequestAdded", handleLeaveAdded)

    return () => {
      window.removeEventListener("editEmployee", handleEditEvent)
      window.removeEventListener("leaveAdded", handleLeaveAdded)
      window.removeEventListener("reviewAdded", handleReviewAdded)
      window.removeEventListener("leaveRequestAdded", handleLeaveAdded)
    }
  }, [])

  const payrollSummary = {
    totalEmployees: employees.length,
    totalGrossPay: employees.reduce((sum, emp) => sum + (emp.salary || 0), 0),
    totalDeductions: employees.reduce((sum, emp) => sum + (emp.salary || 0) * 0.25, 0),
    totalNetPay: employees.reduce((sum, emp) => sum + (emp.salary || 0) * 0.75, 0),
    totalPaye: employees.reduce((sum, emp) => sum + (emp.salary || 0) * 0.15, 0),
    totalNssf: employees.reduce((sum, emp) => sum + (emp.salary || 0) * 0.05, 0),
    totalSha: employees.reduce((sum, emp) => sum + (emp.salary || 0) * 0.05, 0),
  }

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = departmentFilter === "all" || employee.department === departmentFilter
    return matchesSearch && matchesDepartment
  })

  const handleViewEmployee = (employee: any) => {
    setSelectedEmployee(employee)
    setShowEmployeeDetails(true)
  }

  const handleEditEmployee = (employee: any) => {
    setEditingEmployee(employee)
    setShowAddEmployee(true)
  }

  const handleModalClose = (open: boolean) => {
    setShowAddEmployee(open)
    if (!open) {
      setEditingEmployee(null)
    }
  }

  const fetchLeaveRequests = async () => {
    const res = await fetch("/api/hr/leave-requests")
    if (res.ok) {
      const data = await res.json()
      setLeaveRequests(data.leaveRequests || [])
      setLeaveStats({
        pending: data.stats?.pending || 0,
        approved: data.stats?.approved || 0,
        onLeave: data.stats?.onLeave || 0,
        approvedDays: data.stats?.approvedDays || 0,
      })
    }
  }

  const fetchPerformanceReviews = async () => {
    const res = await fetch("/api/hr/performance-reviews")
    if (res.ok) {
      const data = await res.json()
      setPerformanceReviews(data.reviews || [])
    }
  }

  const handleExportPayslips = async () => {
    try {
      const response = await fetch("/api/hr/export-payslips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `payslips-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const error = await response.json()
        console.error("Error exporting payslips:", error)
        alert(error.error || "Failed to export payslips")
      }
    } catch (error) {
      console.error("Error exporting payslips:", error)
      alert("Failed to export payslips")
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading employees...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Human Resources Management</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setShowAddEmployee(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="leave">Leave Management</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employees.length}</div>
                <p className="text-xs text-muted-foreground">Active employees</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employees.filter((emp) => emp.status === "active").length}</div>
                <p className="text-xs text-muted-foreground">Currently active</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On Leave</CardTitle>
                <Calendar className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employees.filter((emp) => emp.status === "on_leave").length}</div>
                <p className="text-xs text-muted-foreground">Currently on leave</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Payroll</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrencyCompact(payrollSummary.totalNetPay)}</div>
                <p className="text-xs text-muted-foreground">Net pay this month</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Department Distribution</CardTitle>
                <CardDescription>Employee count by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {departments.length > 0 ? (
                    departments.map((dept, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{dept.name}</span>{" "}
                        {/* Assuming department object has a 'name' property */}
                        <span className="text-sm font-medium">{dept.employeeCount} employees</span>{" "}
                        {/* Assuming department object has an 'employeeCount' property */}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No department data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
                <CardDescription>Latest HR activities and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activities.length > 0 ? (
                    activities.map((activity, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            activity.severity === "high"
                              ? "bg-red-500"
                              : activity.severity === "medium"
                                ? "bg-yellow-500"
                                : activity.severity === "low"
                                  ? "bg-blue-500"
                                  : "bg-green-500"
                          }`}
                        ></div>
                        <span className="text-sm">{activity.description}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent activities</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Employee Directory</CardTitle>
              <CardDescription>Comprehensive employee information and management</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.employee_id}</TableCell>
                      <TableCell>{`${employee.first_name} ${employee.last_name}`}</TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            employee.status === "active"
                              ? "default"
                              : employee.status === "on_leave"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {employee.status?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{employee.salary ? formatCurrency(employee.salary) : "N/A"}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewEmployee(employee)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEditEmployee(employee)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Payroll Management</h3>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => setShowPayroll(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Generate Payroll
              </Button>
              <Button variant="outline" onClick={handleExportPayslips}>
                <Download className="mr-2 h-4 w-4" />
                Export Payslips
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Gross Pay</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(payrollSummary.totalGrossPay)}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total PAYE</CardTitle>
                <FileText className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(payrollSummary.totalPaye)}</div>
                <p className="text-xs text-muted-foreground">15% average rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total NSSF</CardTitle>
                <Shield className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(payrollSummary.totalNssf)}</div>
                <p className="text-xs text-muted-foreground">6% contribution</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total SHA</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(payrollSummary.totalSha)}</div>
                <p className="text-xs text-muted-foreground">Health insurance</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payroll History</CardTitle>
              <CardDescription>Monthly payroll processing records</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Gross Pay</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollHistory.length > 0 ? (
                    payrollHistory.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>{`${new Date(0, record.period_month - 1).toLocaleString("default", { month: "long" })} ${record.period_year}`}</TableCell>
                        <TableCell>{record.employee_count}</TableCell>
                        <TableCell>{formatCurrency(record.gross_pay)}</TableCell>
                        <TableCell>{formatCurrency(record.total_deductions)}</TableCell>
                        <TableCell>{formatCurrency(record.net_pay)}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === "processed" ? "default" : "secondary"}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No payroll history found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Leave Management</h3>
            <Button onClick={() => setShowLeaveRequest(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Leave Request
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leaveStats.pending}</div>
                <p className="text-xs text-muted-foreground">Awaiting approval</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved This Month</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leaveStats.approved}</div>
                <p className="text-xs text-muted-foreground">Total days: {leaveStats.approvedDays}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Currently On Leave</CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leaveStats.onLeave}</div>
                <p className="text-xs text-muted-foreground">Employees on leave</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Leave Requests</CardTitle>
              <CardDescription>Manage employee leave applications</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.length > 0 ? (
                    leaveRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{`${request.first_name} ${request.last_name}`}</TableCell>
                        <TableCell>{request.leave_type}</TableCell>
                        <TableCell>{new Date(request.start_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(request.end_date).toLocaleDateString()}</TableCell>
                        <TableCell>{request.days_requested}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              request.status === "approved"
                                ? "default"
                                : request.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No leave requests found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Performance Management</h3>
            <Button onClick={() => setShowPerformanceReview(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Review
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Excellent</CardTitle>
                <Award className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {employees.filter((emp) => emp.performance_rating === "excellent").length}
                </div>
                <p className="text-xs text-muted-foreground">33% of employees</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Good</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {employees.filter((emp) => emp.performance_rating === "good").length}
                </div>
                <p className="text-xs text-muted-foreground">50% of employees</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Satisfactory</CardTitle>
                <Users className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {employees.filter((emp) => emp.performance_rating === "satisfactory").length}
                </div>
                <p className="text-xs text-muted-foreground">12.5% of employees</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Needs Improvement</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {employees.filter((emp) => emp.performance_rating === "needs_improvement").length}
                </div>
                <p className="text-xs text-muted-foreground">4.2% of employees</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Reviews</CardTitle>
              <CardDescription>Employee performance evaluation records</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Review Period</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Goals Met</TableHead>
                    <TableHead>Next Review</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceReviews.length > 0 ? (
                    performanceReviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell className="font-medium">{`${review.first_name} ${review.last_name}`}</TableCell>
                        <TableCell>{review.position}</TableCell>
                        <TableCell>
                          {review.review_period || new Date(review.review_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              review.rating === "excellent"
                                ? "default"
                                : review.rating === "good"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {review.rating}
                          </Badge>
                        </TableCell>
                        <TableCell>{review.goals_met_percentage || 0}%</TableCell>
                        <TableCell>
                          {review.next_review_date ? new Date(review.next_review_date).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No performance reviews found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Compliance & Statutory Requirements</h3>
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">NSSF Compliance</CardTitle>
                <Shield className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{complianceData.compliance.nssf.percentage}%</div>
                <p className="text-xs text-muted-foreground">
                  {complianceData.compliance.nssf.compliant}/{complianceData.compliance.nssf.total} employees registered
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SHA Compliance</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{complianceData.compliance.sha.percentage}%</div>
                <p className="text-xs text-muted-foreground">
                  {complianceData.compliance.sha.compliant}/{complianceData.compliance.sha.total} employees covered
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">KRA PIN Status</CardTitle>
                <FileText className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {complianceData.compliance.kra.compliant}/{complianceData.compliance.kra.total}
                </div>
                <p className="text-xs text-muted-foreground">All PINs verified</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contract Status</CardTitle>
                <Users className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{complianceData.compliance.expiringContracts}</div>
                <p className="text-xs text-muted-foreground">Contracts expiring soon</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Statutory Deductions Summary</CardTitle>
                <CardDescription>Monthly statutory contributions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">PAYE (Pay As You Earn)</span>
                    <span className="text-sm">{formatCurrency(complianceData.statutory.totalPaye)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">NSSF Contributions</span>
                    <span className="text-sm">{formatCurrency(complianceData.statutory.totalNssf)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">SHA Contributions</span>
                    <span className="text-sm">{formatCurrency(complianceData.statutory.totalSha)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-sm font-medium">Total Statutory</span>
                    <span className="text-sm font-bold">
                      {formatCurrency(complianceData.statutory.totalDeductions)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Alerts</CardTitle>
                <CardDescription>Important compliance notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {employees.filter(
                    (emp) =>
                      emp.contract_end_date &&
                      new Date(emp.contract_end_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                  ).length > 0 && (
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">
                        {
                          employees.filter(
                            (emp) =>
                              emp.contract_end_date &&
                              new Date(emp.contract_end_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                          ).length
                        }{" "}
                        employment contracts expire in 30 days
                      </span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">
                      NSSF monthly returns due in{" "}
                      {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 9).getDate() -
                        new Date().getDate()}{" "}
                      days
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-4 w-4 text-green-500" />
                    <span className="text-sm">All SHA contributions up to date</span>
                  </div>
                  {new Date().getMonth() === 11 && (
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Annual leave policy review required</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <AddEmployeeModal open={showAddEmployee} onOpenChange={handleModalClose} employee={editingEmployee} />

      <EmployeeDetailsModal
        open={showEmployeeDetails}
        onOpenChange={setShowEmployeeDetails}
        employee={selectedEmployee}
      />

      <PayrollModal open={showPayroll} onOpenChange={setShowPayroll} />

      <LeaveRequestModal open={showLeaveRequest} onOpenChange={setShowLeaveRequest} />

      <PerformanceReviewModal open={showPerformanceReview} onOpenChange={setShowPerformanceReview} />
    </div>
  )
}

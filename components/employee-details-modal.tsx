"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Phone, Briefcase, DollarSign, Shield, FileText, Edit, Download } from "lucide-react"
import { formatCurrency } from "@/lib/currency"

interface EmployeeDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: any
}

export function EmployeeDetailsModal({ open, onOpenChange, employee }: EmployeeDetailsModalProps) {
  if (!employee) return null

  const employeeName = employee.name || `${employee.first_name || ""} ${employee.last_name || ""}`.trim()
  const employeeId = employee.employee_id || employee.id
  const salary = employee.salary || 0

  const handleEdit = () => {
    onOpenChange(false)
    // Trigger edit by dispatching a custom event that the parent can listen to
    window.dispatchEvent(new CustomEvent("editEmployee", { detail: employee }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{employeeName}</DialogTitle>
              <DialogDescription>
                {employeeId} • {employee.position}
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge
                variant={
                  employee.status === "active"
                    ? "default"
                    : employee.status === "on_leave"
                      ? "secondary"
                      : "destructive"
                }
              >
                {employee.status?.replace("_", " ") || "active"}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="compensation">Compensation</TabsTrigger>
            <TabsTrigger value="statutory">Statutory</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{employee.email || "N/A"}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{employee.phone || "N/A"}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">ID: {employeeId}</span>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium">Emergency Contact</p>
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Briefcase className="mr-2 h-5 w-5" />
                    Employment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Department</p>
                    <p className="text-sm text-muted-foreground">{employee.department || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Hire Date</p>
                    <p className="text-sm text-muted-foreground">
                      {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Contract Type</p>
                    <p className="text-sm text-muted-foreground">Permanent</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium">Leave Balance</p>
                    <p className="text-sm text-muted-foreground">21 days remaining</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{formatCurrency(salary)}</div>
                    <p className="text-xs text-muted-foreground">Monthly Salary</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">21</div>
                    <p className="text-xs text-muted-foreground">Leave Days</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {employee.hire_date
                        ? Math.floor(
                            (new Date().getTime() - new Date(employee.hire_date).getTime()) /
                              (1000 * 60 * 60 * 24 * 365.25),
                          )
                        : 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Years Service</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      <Badge variant="default">Good</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Performance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employment" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Job Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Employee ID</p>
                    <p className="text-sm text-muted-foreground">{employeeId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Position</p>
                    <p className="text-sm text-muted-foreground">{employee.position || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Department</p>
                    <p className="text-sm text-muted-foreground">{employee.department || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Reporting Manager</p>
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Employment Terms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Employment Type</p>
                    <p className="text-sm text-muted-foreground">Full-time</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Contract Type</p>
                    <p className="text-sm text-muted-foreground">Permanent</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Start Date</p>
                    <p className="text-sm text-muted-foreground">
                      {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Work Location</p>
                    <p className="text-sm text-muted-foreground">Head Office, Nairobi</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Employment History</CardTitle>
                <CardDescription>Key employment milestones and changes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Started as {employee.position}</p>
                      <p className="text-xs text-muted-foreground">
                        {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compensation" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Salary Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Basic Salary</p>
                    <p className="text-lg font-bold">{formatCurrency(salary)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Monthly Allowances</p>
                    <p className="text-sm text-muted-foreground">KSh 5,000</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Gross Monthly Pay</p>
                    <p className="text-lg font-bold">{formatCurrency(salary + 5000)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Banking Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Bank Name</p>
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Account Number</p>
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Payroll Frequency</p>
                    <p className="text-sm text-muted-foreground">Monthly</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Salary History</CardTitle>
                <CardDescription>Salary changes and adjustments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Current Salary</p>
                      <p className="text-xs text-muted-foreground">
                        Effective {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    <p className="text-sm font-bold">{formatCurrency(salary)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statutory" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Statutory Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">KRA PIN</p>
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">NSSF Number</p>
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">SHA Number</p>
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Deductions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">PAYE</span>
                    <span className="text-sm font-medium">{formatCurrency(salary * 0.15)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">NSSF</span>
                    <span className="text-sm font-medium">{formatCurrency(salary * 0.06)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">SHA</span>
                    <span className="text-sm font-medium">{formatCurrency(salary * 0.0275)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span className="text-sm">Total Deductions</span>
                    <span className="text-sm">{formatCurrency(salary * 0.2375)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
                <CardDescription>Statutory registration and compliance status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">KRA Registration</span>
                    </div>
                    <Badge variant="default">Compliant</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">NSSF Registration</span>
                    </div>
                    <Badge variant="default">Compliant</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">SHA Registration</span>
                    </div>
                    <Badge variant="default">Compliant</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Current Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Overall Rating</p>
                    <Badge variant="default" className="mt-1">
                      Good
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Last Review</p>
                    <p className="text-sm text-muted-foreground">Q4 2023</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Next Review</p>
                    <p className="text-sm text-muted-foreground">Q1 2024</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Goals Achievement</p>
                    <p className="text-sm text-muted-foreground">85% completed</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Key Achievements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">• Excellent work performance</div>
                  <div className="text-sm">• Meets all deadlines</div>
                  <div className="text-sm">• Good team collaboration</div>
                  <div className="text-sm">• Professional development ongoing</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Performance History</CardTitle>
                <CardDescription>Historical performance ratings and reviews</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Q4 2023</p>
                      <p className="text-xs text-muted-foreground">Annual Review</p>
                    </div>
                    <Badge variant="default">Good</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Q2 2023</p>
                      <p className="text-xs text-muted-foreground">Mid-year Review</p>
                    </div>
                    <Badge variant="secondary">Good</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

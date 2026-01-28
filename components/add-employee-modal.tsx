"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { ResponsiveModal } from "@/components/responsive-modal"

interface AddEmployeeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee?: any
}

export function AddEmployeeModal({ open, onOpenChange, employee }: AddEmployeeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startDate, setStartDate] = useState<Date>()

  // Only include fields that exist in the database
  const [formData, setFormData] = useState({
    firstName: employee?.first_name || "",
    lastName: employee?.last_name || "",
    email: employee?.email || "",
    phone: employee?.phone || "",
    employeeId: employee?.employee_id || "",
    position: employee?.position || "",
    department: employee?.department || "",
    basicSalary: employee?.salary?.toString() || "",
  })

  useEffect(() => {
    if (employee) {
      if (employee.hire_date) {
        setStartDate(new Date(employee.hire_date))
      }
      setFormData({
        firstName: employee.first_name || "",
        lastName: employee.last_name || "",
        email: employee.email || "",
        phone: employee.phone || "",
        employeeId: employee.employee_id || "",
        position: employee.position || "",
        department: employee.department || "",
        basicSalary: employee.salary?.toString() || "",
      })
    }
  }, [employee])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const submitData = new FormData()

      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value)
      })

      if (startDate) {
        submitData.append("startDate", startDate.toISOString())
      }

      const url = employee ? `/api/employees/${employee.id}` : "/api/employees"
      const method = employee ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        body: submitData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${employee ? "update" : "add"} employee`)
      }

      const result = await response.json()
      console.log(`Employee ${employee ? "updated" : "added"} successfully:`, result)

      if (!employee) {
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          employeeId: "",
          position: "",
          department: "",
          basicSalary: "",
        })
        setStartDate(undefined)
      }

      onOpenChange(false)
      window.location.reload()
    } catch (error) {
      console.error(`Error ${employee ? "updating" : "adding"} employee:`, error)
      alert(error instanceof Error ? error.message : `Failed to ${employee ? "update" : "add"} employee`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={employee ? "Edit Employee" : "Add New Employee"}
      description={
        employee ? "Update the employee's information" : "Enter the employee's information"
      }
      className="max-w-2xl"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Employee Information</CardTitle>
          <CardDescription>Basic employee details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                placeholder="Enter first name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                placeholder="Enter last name"
                required
              />
            </div>
          </div>

          {/* Contact Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="employee@company.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+254712345678"
              />
            </div>
          </div>

          {/* Employment Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                value={formData.employeeId}
                onChange={(e) => handleInputChange("employeeId", e.target.value)}
                placeholder="EMP001 (auto-generated if empty)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position *</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => handleInputChange("position", e.target.value)}
                placeholder="Network Engineer"
                required
              />
            </div>
          </div>

          {/* Department and Salary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select value={formData.department} onValueChange={(value) => handleInputChange("department", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Technical">Technical</SelectItem>
                  <SelectItem value="Support">Support</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="basicSalary">Basic Salary (KSh)</Label>
              <Input
                id="basicSalary"
                type="number"
                value={formData.basicSalary}
                onChange={(e) => handleInputChange("basicSalary", e.target.value)}
                placeholder="85000"
              />
            </div>
          </div>

          {/* Hire Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hire Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select hire date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <div className="p-3 border-b">
                    <div className="flex items-center justify-between space-x-2">
                      <Select
                        value={startDate?.getFullYear().toString() || new Date().getFullYear().toString()}
                        onValueChange={(year) => {
                          const newDate = new Date(startDate || new Date())
                          newDate.setFullYear(Number.parseInt(year))
                          setStartDate(newDate)
                        }}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={startDate?.getMonth().toString() || new Date().getMonth().toString()}
                        onValueChange={(month) => {
                          const newDate = new Date(startDate || new Date())
                          newDate.setMonth(Number.parseInt(month))
                          setStartDate(newDate)
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "January",
                            "February",
                            "March",
                            "April",
                            "May",
                            "June",
                            "July",
                            "August",
                            "September",
                            "October",
                            "November",
                            "December",
                          ].map((month, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    defaultMonth={startDate || new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (employee ? "Updating..." : "Adding...") : (employee ? "Update Employee" : "Add Employee")}
        </Button>
      </div>
    </ResponsiveModal>
  )
}

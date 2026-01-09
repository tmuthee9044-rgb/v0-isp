"use client"

import type React from "react"

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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon, Info } from "lucide-react"
import { format, differenceInDays } from "date-fns"

interface LeaveRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeaveRequestModal({ open, onOpenChange }: LeaveRequestModalProps) {
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [leaveType, setLeaveType] = useState("")
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [employees, setEmployees] = useState<any[]>([])
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (open) {
      fetchEmployees()
    }
  }, [open])

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees")
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.employees || [])
      }
    } catch (error) {
      console.error("Error fetching employees:", error)
    }
  }

  const leaveTypes = [
    {
      value: "annual",
      label: "Annual Leave",
      description: "Regular vacation leave (21 days per year)",
      maxDays: 21,
    },
    {
      value: "sick",
      label: "Sick Leave",
      description: "Medical leave with doctor's certificate",
      maxDays: 30,
    },
    {
      value: "maternity",
      label: "Maternity Leave",
      description: "90 days maternity leave as per Kenyan law",
      maxDays: 90,
    },
    {
      value: "paternity",
      label: "Paternity Leave",
      description: "14 days paternity leave as per Kenyan law",
      maxDays: 14,
    },
    {
      value: "compassionate",
      label: "Compassionate Leave",
      description: "Leave for family emergencies or bereavement",
      maxDays: 7,
    },
    {
      value: "study",
      label: "Study Leave",
      description: "Educational or training purposes",
      maxDays: 30,
    },
    {
      value: "unpaid",
      label: "Unpaid Leave",
      description: "Leave without pay",
      maxDays: 365,
    },
  ]

  const selectedEmployeeData = employees.find((emp) => emp.employee_id === selectedEmployee)
  const selectedLeaveType = leaveTypes.find((type) => type.value === leaveType)
  const leaveDays = startDate && endDate ? differenceInDays(endDate, startDate) + 1 : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/leave-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          leaveType,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          days: leaveDays,
          reason,
        }),
      })

      if (response.ok) {
        // Reset form and close modal
        setSelectedEmployee("")
        setLeaveType("")
        setStartDate(undefined)
        setEndDate(undefined)
        setReason("")
        onOpenChange(false)
      } else {
        console.error("Failed to submit leave request")
      }
    } catch (error) {
      console.error("Error submitting leave request:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Leave Request</DialogTitle>
          <DialogDescription>Submit a leave application for employee approval</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employee">Employee *</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.employee_id} value={employee.employee_id}>
                      {employee.name} ({employee.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaveType">Leave Type *</Label>
              <Select value={leaveType} onValueChange={setLeaveType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedLeaveType && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{selectedLeaveType.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{selectedLeaveType.description}</p>
                <p className="text-sm font-medium mt-2">Maximum allowed: {selectedLeaveType.maxDays} days</p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {leaveDays > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Leave Days:</span>
                  <span className="text-lg font-bold">{leaveDays} days</span>
                </div>
                {selectedEmployeeData && leaveType === "annual" && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">Remaining Balance:</span>
                    <span className="text-sm">21 days (estimated)</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Leave *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for the leave request..."
              required
            />
          </div>

          {leaveType === "maternity" && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    Maternity leave is 90 days as per Kenyan Employment Act. Please attach medical certificate.
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {leaveType === "paternity" && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Info className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    Paternity leave is 14 days as per Kenyan Employment Act. Birth certificate required.
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Leave Policy Reminder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Annual leave requests should be submitted at least 2 weeks in advance</p>
                <p>• Sick leave requires medical certificate for periods over 3 days</p>
                <p>• Emergency leave may be granted at management discretion</p>
                <p>• All leave is subject to operational requirements and approval</p>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !selectedEmployee ||
                !leaveType ||
                !startDate ||
                !endDate ||
                leaveDays <= 0 ||
                !reason.trim()
              }
            >
              {isSubmitting ? "Submitting..." : "Submit Leave Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

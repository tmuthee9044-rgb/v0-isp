"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Clock, CheckCircle, TrendingUp, Star } from "lucide-react"

interface EmployeePerformanceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: any[]
}

export function EmployeePerformanceModal({ open, onOpenChange, employees }: EmployeePerformanceModalProps) {
  const [selectedEmployee, setSelectedEmployee] = useState("all")
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days ago
    end_date: new Date().toISOString().split("T")[0], // today
  })
  const { toast } = useToast()

  const fetchPerformanceData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        ...(selectedEmployee !== "all" && { employee_id: selectedEmployee }),
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      })

      const response = await fetch(`/api/support/performance?${params}`)
      const data = await response.json()

      if (response.ok) {
        setPerformanceData(data.performance || [])
      } else {
        throw new Error(data.error || "Failed to fetch performance data")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load performance data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchPerformanceData()
    }
  }, [open, selectedEmployee, dateRange])

  const getPerformanceColor = (rate: number) => {
    if (rate >= 90) return "text-green-600"
    if (rate >= 75) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Employee Performance Dashboard</DialogTitle>
          <DialogDescription>Track support ticket resolution performance and metrics</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="employee">Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {employees.map((employee: any) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.name} - {employee.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={dateRange.start_date}
                onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={dateRange.end_date}
                onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              />
            </div>
          </div>

          {/* Performance Cards */}
          {loading ? (
            <div className="text-center py-8">Loading performance data...</div>
          ) : (
            <div className="grid gap-4">
              {performanceData.map((employee) => (
                <Card key={employee.employee_id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{employee.employee_name}</CardTitle>
                        <CardDescription>{employee.department}</CardDescription>
                      </div>
                      <Badge variant="outline" className={getPerformanceColor(employee.resolution_rate)}>
                        {employee.resolution_rate}% Resolution Rate
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="text-2xl font-bold">{employee.resolved_tickets}</div>
                          <div className="text-xs text-muted-foreground">Resolved</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="text-2xl font-bold">
                            {employee.avg_resolution_time_hours
                              ? `${Number(employee.avg_resolution_time_hours).toFixed(1)}h`
                              : "N/A"}
                          </div>
                          <div className="text-xs text-muted-foreground">Avg Resolution</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        <div>
                          <div className="text-2xl font-bold">{employee.high_priority_resolved}</div>
                          <div className="text-xs text-muted-foreground">High Priority</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-600" />
                        <div>
                          <div className="text-2xl font-bold">{employee.urgent_resolved}</div>
                          <div className="text-xs text-muted-foreground">Urgent Resolved</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Total Tickets: {employee.total_tickets}</span>
                        <span>Open: {employee.open_tickets}</span>
                        <span>In Progress: {employee.in_progress_tickets}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {performanceData.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  No performance data found for the selected criteria
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={fetchPerformanceData} disabled={loading}>
            Refresh Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

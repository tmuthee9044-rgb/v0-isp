"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Users, UserCheck, Clock, DollarSign, TrendingUp, AlertTriangle, Calendar } from "lucide-react"

interface HRMetrics {
  totalEmployees: number
  activeEmployees: number
  pendingLeave: number
  monthlyPayroll: number
  attendanceRate: number
  turnoverRate: number
}

interface EnhancedHRDashboardProps {
  metrics: HRMetrics
}

export function EnhancedHRDashboard({ metrics }: EnhancedHRDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
            <Progress value={85} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">Above target (95%)</p>
            <Progress value={metrics.attendanceRate} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingLeave}</div>
            <p className="text-xs text-muted-foreground">Leave requests + reviews</p>
            <div className="flex items-center mt-2">
              <Button variant="outline" size="sm" className="text-xs bg-transparent">
                Review Now
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh {(metrics.monthlyPayroll / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">Current month estimate</p>
            <Progress value={75} className="mt-2 h-1" />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and Alerts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
              Action Required
            </CardTitle>
            <CardDescription>Items that need your immediate attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Overdue Performance Reviews</p>
                  <p className="text-xs text-muted-foreground">2 employees pending review</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Review
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Leave Requests Pending</p>
                  <p className="text-xs text-muted-foreground">3 requests awaiting approval</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Approve
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Payroll Due</p>
                  <p className="text-xs text-muted-foreground">February payroll processing due in 3 days</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Process
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-green-500" />
              HR Insights
            </CardTitle>
            <CardDescription>Key metrics and trends</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Employee Satisfaction</span>
                <span className="font-medium">4.2/5.0</span>
              </div>
              <Progress value={84} className="h-2" />
              <p className="text-xs text-muted-foreground">Based on latest survey (Jan 2024)</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Training Completion</span>
                <span className="font-medium">78%</span>
              </div>
              <Progress value={78} className="h-2" />
              <p className="text-xs text-muted-foreground">Q1 2024 mandatory training</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Retention Rate</span>
                <span className="font-medium">94%</span>
              </div>
              <Progress value={94} className="h-2" />
              <p className="text-xs text-muted-foreground">12-month rolling average</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events and Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Upcoming Events & Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">28</div>
                <div className="text-xs text-blue-600">FEB</div>
              </div>
              <div>
                <p className="text-sm font-medium">Payroll Processing</p>
                <p className="text-xs text-muted-foreground">Monthly payroll deadline</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">05</div>
                <div className="text-xs text-green-600">MAR</div>
              </div>
              <div>
                <p className="text-sm font-medium">Team Building</p>
                <p className="text-xs text-muted-foreground">Quarterly team event</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">15</div>
                <div className="text-xs text-purple-600">MAR</div>
              </div>
              <div>
                <p className="text-sm font-medium">Performance Reviews</p>
                <p className="text-xs text-muted-foreground">Q1 review cycle begins</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

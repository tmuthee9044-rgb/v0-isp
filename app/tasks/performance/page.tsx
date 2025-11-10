"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Award, TrendingUp, Target, Clock, CheckCircle, Calendar, Download, Users, Star, Trophy } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export default function TaskPerformancePage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [selectedEmployee, setSelectedEmployee] = useState("all")

  const performanceData = {
    overall: {
      totalTasks: 156,
      completedTasks: 142,
      onTimeCompletion: 89,
      avgCompletionTime: 4.2,
      productivityScore: 8.7,
      qualityScore: 9.1,
    },
    employees: [
      {
        id: 1,
        name: "Sarah Johnson",
        position: "Customer Support Manager",
        department: "Support",
        tasksCompleted: 28,
        tasksAssigned: 30,
        onTimeRate: 96,
        avgCompletionTime: 3.8,
        qualityScore: 9.5,
        productivityScore: 9.2,
        improvementTrend: "up",
        badges: ["Top Performer", "Quality Champion"],
      },
      {
        id: 2,
        name: "John Smith",
        position: "Network Engineer",
        department: "Technical",
        tasksCompleted: 24,
        tasksAssigned: 26,
        onTimeRate: 92,
        avgCompletionTime: 4.5,
        qualityScore: 9.0,
        productivityScore: 8.8,
        improvementTrend: "up",
        badges: ["Technical Expert"],
      },
      {
        id: 3,
        name: "Mike Wilson",
        position: "Sales Manager",
        department: "Sales",
        tasksCompleted: 18,
        tasksAssigned: 20,
        onTimeRate: 90,
        avgCompletionTime: 4.0,
        qualityScore: 8.8,
        productivityScore: 8.5,
        improvementTrend: "stable",
        badges: ["Consistent Performer"],
      },
      {
        id: 4,
        name: "Grace Wanjiku",
        position: "HR Officer",
        department: "HR",
        tasksCompleted: 22,
        tasksAssigned: 25,
        onTimeRate: 88,
        avgCompletionTime: 4.8,
        qualityScore: 8.9,
        productivityScore: 8.3,
        improvementTrend: "up",
        badges: ["Rising Star"],
      },
      {
        id: 5,
        name: "David Kimani",
        position: "Operations Coordinator",
        department: "Operations",
        tasksCompleted: 20,
        tasksAssigned: 24,
        onTimeRate: 83,
        avgCompletionTime: 5.2,
        qualityScore: 8.2,
        productivityScore: 7.8,
        improvementTrend: "down",
        badges: [],
      },
    ],
    departments: [
      {
        name: "Support",
        employees: 6,
        tasksCompleted: 45,
        avgProductivity: 9.0,
        avgQuality: 9.2,
        onTimeRate: 94,
      },
      {
        name: "Technical",
        employees: 8,
        tasksCompleted: 52,
        avgProductivity: 8.5,
        avgQuality: 8.8,
        onTimeRate: 87,
      },
      {
        name: "Sales",
        employees: 5,
        tasksCompleted: 28,
        avgProductivity: 8.2,
        avgQuality: 8.5,
        onTimeRate: 85,
      },
      {
        name: "Operations",
        employees: 4,
        tasksCompleted: 32,
        avgProductivity: 8.0,
        avgQuality: 8.3,
        onTimeRate: 82,
      },
      {
        name: "HR",
        employees: 3,
        tasksCompleted: 25,
        avgProductivity: 8.3,
        avgQuality: 8.7,
        onTimeRate: 88,
      },
    ],
    trends: {
      productivity: [7.8, 8.1, 8.3, 8.5, 8.7],
      quality: [8.5, 8.7, 8.9, 9.0, 9.1],
      onTime: [82, 84, 86, 88, 89],
    },
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "down":
        return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
      default:
        return <Target className="h-4 w-4 text-blue-600" />
    }
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 9) return "text-green-600"
    if (score >= 8) return "text-blue-600"
    if (score >= 7) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Task Performance Analytics</h2>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Custom Range
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="individual">Individual Performance</TabsTrigger>
          <TabsTrigger value="departments">Department Analysis</TabsTrigger>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Completion Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round((performanceData.overall.completedTasks / performanceData.overall.totalTasks) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {performanceData.overall.completedTasks} of {performanceData.overall.totalTasks} tasks
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
                <Target className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceData.overall.onTimeCompletion}%</div>
                <p className="text-xs text-muted-foreground">+3% from last period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceData.overall.avgCompletionTime} days</div>
                <p className="text-xs text-muted-foreground">-0.3 days improvement</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
                <Star className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceData.overall.qualityScore}/10</div>
                <p className="text-xs text-muted-foreground">Excellent performance</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Employees with highest performance scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceData.employees
                    .sort((a, b) => b.productivityScore - a.productivityScore)
                    .slice(0, 5)
                    .map((employee, index) => (
                      <div key={employee.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-sm text-muted-foreground">{employee.department}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${getPerformanceColor(employee.productivityScore)}`}>
                            {employee.productivityScore}/10
                          </div>
                          <div className="text-sm text-muted-foreground">{employee.tasksCompleted} tasks</div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key performance indicators overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Team Productivity</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={performanceData.overall.productivityScore * 10} className="w-20 h-2" />
                      <span className="text-sm">{performanceData.overall.productivityScore}/10</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Quality Standards</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={performanceData.overall.qualityScore * 10} className="w-20 h-2" />
                      <span className="text-sm">{performanceData.overall.qualityScore}/10</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">On-Time Delivery</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={performanceData.overall.onTimeCompletion} className="w-20 h-2" />
                      <span className="text-sm">{performanceData.overall.onTimeCompletion}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Task Completion</span>
                    <div className="flex items-center space-x-2">
                      <Progress
                        value={(performanceData.overall.completedTasks / performanceData.overall.totalTasks) * 100}
                        className="w-20 h-2"
                      />
                      <span className="text-sm">
                        {Math.round(
                          (performanceData.overall.completedTasks / performanceData.overall.totalTasks) * 100,
                        )}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          <div className="flex items-center space-x-2">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {performanceData.employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id.toString()}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Individual Performance Analysis</CardTitle>
              <CardDescription>Detailed performance metrics for each team member</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Tasks Completed</TableHead>
                    <TableHead>Completion Rate</TableHead>
                    <TableHead>On-Time Rate</TableHead>
                    <TableHead>Quality Score</TableHead>
                    <TableHead>Productivity</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead>Badges</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceData.employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">{employee.position}</div>
                        </div>
                      </TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>
                        {employee.tasksCompleted}/{employee.tasksAssigned}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress
                            value={(employee.tasksCompleted / employee.tasksAssigned) * 100}
                            className="w-16 h-2"
                          />
                          <span className="text-sm">
                            {Math.round((employee.tasksCompleted / employee.tasksAssigned) * 100)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{employee.onTimeRate}%</TableCell>
                      <TableCell>
                        <span className={getPerformanceColor(employee.qualityScore)}>{employee.qualityScore}/10</span>
                      </TableCell>
                      <TableCell>
                        <span className={getPerformanceColor(employee.productivityScore)}>
                          {employee.productivityScore}/10
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {getTrendIcon(employee.improvementTrend)}
                          <span className="text-sm capitalize">{employee.improvementTrend}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {employee.badges.map((badge) => (
                            <Badge key={badge} variant="secondary" className="text-xs">
                              {badge}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {performanceData.departments.map((dept) => (
              <Card key={dept.name}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {dept.name}
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription>{dept.employees} employees</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Tasks Completed</span>
                      <span className="font-medium">{dept.tasksCompleted}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Avg Productivity</span>
                      <span className={`font-medium ${getPerformanceColor(dept.avgProductivity)}`}>
                        {dept.avgProductivity}/10
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Avg Quality</span>
                      <span className={`font-medium ${getPerformanceColor(dept.avgQuality)}`}>
                        {dept.avgQuality}/10
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">On-Time Rate</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={dept.onTimeRate} className="w-16 h-2" />
                        <span className="text-sm">{dept.onTimeRate}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Productivity Trend</CardTitle>
                <CardDescription>Last 5 periods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {performanceData.trends.productivity.map((score, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">Period {index + 1}</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={score * 10} className="w-16 h-2" />
                        <span className="text-sm">{score}/10</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality Trend</CardTitle>
                <CardDescription>Last 5 periods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {performanceData.trends.quality.map((score, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">Period {index + 1}</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={score * 10} className="w-16 h-2" />
                        <span className="text-sm">{score}/10</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>On-Time Delivery Trend</CardTitle>
                <CardDescription>Last 5 periods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {performanceData.trends.onTime.map((rate, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">Period {index + 1}</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={rate} className="w-16 h-2" />
                        <span className="text-sm">{rate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Insights</CardTitle>
              <CardDescription>Key observations and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Trophy className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Top Achievement</div>
                    <div className="text-sm text-muted-foreground">
                      Support department achieved 94% on-time delivery rate, highest across all departments
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Positive Trend</div>
                    <div className="text-sm text-muted-foreground">
                      Overall quality scores have improved by 0.6 points over the last 5 periods
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Improvement Opportunity</div>
                    <div className="text-sm text-muted-foreground">
                      Operations department shows potential for improvement in task completion times
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Award className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Recognition</div>
                    <div className="text-sm text-muted-foreground">
                      Sarah Johnson maintains consistent top performance with 96% on-time completion
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

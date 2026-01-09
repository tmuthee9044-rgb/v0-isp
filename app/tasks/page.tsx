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
  CheckSquare,
  Plus,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Calendar,
  TrendingUp,
  Target,
  Award,
  BarChart3,
} from "lucide-react"
import { CreateTaskModal } from "@/components/create-task-modal"
import { TaskDetailsModal } from "@/components/task-details-modal"
import { AssignTaskModal } from "@/components/assign-task-modal"
import { Progress } from "@/components/ui/progress"

export default function TasksPage() {
  const [selectedTab, setSelectedTab] = useState("overview")
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showTaskDetails, setShowTaskDetails] = useState(false)
  const [showAssignTask, setShowAssignTask] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  const [tasks, setTasks] = useState<any[]>([])
  const [taskStats, setTaskStats] = useState<any>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    avgCompletionTime: 0,
    onTimeCompletion: 0,
  })
  const [departmentStats, setDepartmentStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch real data from database
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        // Fetch tasks
        const tasksRes = await fetch("/api/tasks")
        const tasksData = await tasksRes.json()
        setTasks(tasksData.tasks || [])

        // Fetch statistics
        const statsRes = await fetch("/api/tasks/stats")
        const statsData = await statsRes.json()
        setTaskStats(statsData.stats || {})
        setDepartmentStats(statsData.department_stats || [])
      } catch (error) {
        console.error("[v0] Error fetching tasks data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  const handleViewTask = (task: any) => {
    setSelectedTask(task)
    setShowTaskDetails(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "in_progress":
        return "secondary"
      case "pending":
        return "outline"
      case "overdue":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Task Management</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setShowAssignTask(true)} variant="outline">
            <Users className="mr-2 h-4 w-4" />
            Assign Task
          </Button>
          <Button onClick={() => setShowCreateTask(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">All Tasks</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taskStats.total}</div>
                <p className="text-xs text-muted-foreground">+3 from last week</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taskStats.inProgress}</div>
                <p className="text-xs text-muted-foreground">40% of total tasks</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taskStats.completed}</div>
                <p className="text-xs text-muted-foreground">{taskStats.onTimeCompletion}% on time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taskStats.overdue}</div>
                <p className="text-xs text-muted-foreground">Needs attention</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Department Task Distribution</CardTitle>
                <CardDescription>Task allocation across departments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departmentStats.map((dept) => (
                    <div key={dept.department} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{dept.department}</span>
                        <span className="text-sm text-muted-foreground">
                          {dept.completed}/{dept.total} completed
                        </span>
                      </div>
                      <Progress value={(dept.completed / dept.total) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Task Activity</CardTitle>
                <CardDescription>Latest task updates and completions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Monthly Sales Report completed by Mike Wilson</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Network Infrastructure Upgrade 65% complete</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Customer Support Training assigned to Sarah Johnson</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm">Security Audit is overdue - needs attention</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Task List</CardTitle>
              <CardDescription>Comprehensive task management and tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{task.title}</div>
                          <div className="text-sm text-muted-foreground">{task.category}</div>
                        </div>
                      </TableCell>
                      <TableCell>{task.assignedTo}</TableCell>
                      <TableCell>{task.department}</TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(task.status)}>{task.status.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress value={task.progress} className="w-16 h-2" />
                          <span className="text-sm">{task.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{task.dueDate}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewTask(task)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
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

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taskStats.avgCompletionTime} days</div>
                <p className="text-xs text-muted-foreground">-0.5 days from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On-Time Completion</CardTitle>
                <Target className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taskStats.onTimeCompletion}%</div>
                <p className="text-xs text-muted-foreground">+5% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                <Award className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Sarah J.</div>
                <p className="text-xs text-muted-foreground">95% completion rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Productivity Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8.7/10</div>
                <p className="text-xs text-muted-foreground">Team average</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Employee Performance Rankings</CardTitle>
                <CardDescription>Based on task completion and quality</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "Sarah Johnson", score: 95, tasks: 12, onTime: 100 },
                    { name: "John Smith", score: 92, tasks: 15, onTime: 93 },
                    { name: "Mike Wilson", score: 88, tasks: 8, onTime: 87 },
                    { name: "Grace Wanjiku", score: 85, tasks: 10, onTime: 80 },
                    { name: "David Kimani", score: 82, tasks: 6, onTime: 83 },
                  ].map((employee, index) => (
                    <div key={employee.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {employee.tasks} tasks, {employee.onTime}% on time
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{employee.score}%</div>
                        <div className="text-sm text-muted-foreground">Score</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>Monthly performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Task Completion Rate</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={87} className="w-20 h-2" />
                      <span className="text-sm">87%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Quality Score</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={92} className="w-20 h-2" />
                      <span className="text-sm">92%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">On-Time Delivery</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={85} className="w-20 h-2" />
                      <span className="text-sm">85%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Team Collaboration</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={90} className="w-20 h-2" />
                      <span className="text-sm">90%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Task Categories</CardTitle>
                <CardDescription>Distribution by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Infrastructure</span>
                    <span className="text-sm font-medium">35%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Training</span>
                    <span className="text-sm font-medium">20%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Reporting</span>
                    <span className="text-sm font-medium">15%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Security</span>
                    <span className="text-sm font-medium">15%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Process Improvement</span>
                    <span className="text-sm font-medium">15%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Priority Distribution</CardTitle>
                <CardDescription>Tasks by priority level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">High Priority</span>
                    <span className="text-sm font-medium">40%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Medium Priority</span>
                    <span className="text-sm font-medium">45%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Low Priority</span>
                    <span className="text-sm font-medium">15%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workload Distribution</CardTitle>
                <CardDescription>Tasks per employee</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">John Smith</span>
                    <span className="text-sm font-medium">15 tasks</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sarah Johnson</span>
                    <span className="text-sm font-medium">12 tasks</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Grace Wanjiku</span>
                    <span className="text-sm font-medium">10 tasks</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Mike Wilson</span>
                    <span className="text-sm font-medium">8 tasks</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Performance Reports</h3>
            <div className="flex items-center space-x-2">
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Date Range
              </Button>
              <Button>
                <BarChart3 className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Summary</CardTitle>
                <CardDescription>January 2024 performance overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tasks Created</span>
                    <span className="text-sm">23</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tasks Completed</span>
                    <span className="text-sm">18</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Completion Time</span>
                    <span className="text-sm">5.2 days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">On-Time Completion Rate</span>
                    <span className="text-sm">87%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Team Productivity Score</span>
                    <span className="text-sm">8.7/10</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Performance</CardTitle>
                <CardDescription>Comparative analysis by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departmentStats.map((dept) => (
                    <div key={dept.department} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{dept.department}</span>
                        <span className="text-sm">{Math.round((dept.completed / dept.total) * 100)}% completion</span>
                      </div>
                      <Progress value={(dept.completed / dept.total) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <CreateTaskModal open={showCreateTask} onOpenChange={setShowCreateTask} />

      <TaskDetailsModal open={showTaskDetails} onOpenChange={setShowTaskDetails} task={selectedTask} />

      <AssignTaskModal open={showAssignTask} onOpenChange={setShowAssignTask} />
    </div>
  )
}

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  Search,
  Play,
  Pause,
  MessageSquare,
  Upload,
  Calendar,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { TaskUpdateModal } from "@/components/task-update-modal"

export default function MyTasksPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)

  // Mock current user - in real app, this would come from auth context
  const currentUser = "John Smith"

  const myTasks = [
    {
      id: 1,
      title: "Network Infrastructure Upgrade",
      description: "Upgrade core network switches in main data center",
      assignedBy: "Network Manager",
      category: "Infrastructure",
      priority: "high",
      status: "in_progress",
      progress: 65,
      dueDate: "2024-02-15",
      createdDate: "2024-01-10",
      estimatedHours: 40,
      actualHours: 26,
      tags: ["network", "infrastructure", "critical"],
      comments: [
        {
          id: 1,
          author: "Network Manager",
          message: "Please prioritize the core switches first",
          timestamp: "2024-01-12 10:30",
        },
        {
          id: 2,
          author: "John Smith",
          message: "Core switches completed, moving to access switches",
          timestamp: "2024-01-20 14:15",
        },
      ],
      attachments: [
        { id: 1, name: "network_diagram.pdf", size: "2.3 MB" },
        { id: 2, name: "upgrade_checklist.xlsx", size: "1.1 MB" },
      ],
    },
    {
      id: 2,
      title: "Security Patch Deployment",
      description: "Deploy latest security patches to all servers",
      assignedBy: "IT Manager",
      category: "Security",
      priority: "high",
      status: "pending",
      progress: 0,
      dueDate: "2024-02-10",
      createdDate: "2024-02-01",
      estimatedHours: 16,
      actualHours: 0,
      tags: ["security", "patches", "servers"],
      comments: [],
      attachments: [],
    },
    {
      id: 3,
      title: "Database Performance Optimization",
      description: "Optimize database queries and indexing for better performance",
      assignedBy: "Database Administrator",
      category: "Performance",
      priority: "medium",
      status: "completed",
      progress: 100,
      dueDate: "2024-01-25",
      createdDate: "2024-01-15",
      estimatedHours: 24,
      actualHours: 22,
      tags: ["database", "performance", "optimization"],
      comments: [
        {
          id: 1,
          author: "Database Administrator",
          message: "Focus on the customer queries first",
          timestamp: "2024-01-16 09:00",
        },
      ],
      attachments: [],
    },
  ]

  const filteredTasks = myTasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    return matchesSearch && matchesStatus
  })

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

  const handleUpdateTask = (task: any) => {
    setSelectedTask(task)
    setShowUpdateModal(true)
  }

  const taskStats = {
    total: myTasks.length,
    pending: myTasks.filter((t) => t.status === "pending").length,
    inProgress: myTasks.filter((t) => t.status === "in_progress").length,
    completed: myTasks.filter((t) => t.status === "completed").length,
    overdue: myTasks.filter((t) => t.status === "overdue").length,
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">My Tasks</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Schedule
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.total}</div>
            <p className="text-xs text-muted-foreground">Assigned to you</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Currently working on</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.completed}</div>
            <p className="text-xs text-muted-foreground">Successfully finished</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.pending}</div>
            <p className="text-xs text-muted-foreground">Not started yet</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search my tasks..."
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
      </div>

      <div className="grid gap-4">
        {filteredTasks.map((task) => (
          <Card key={task.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{task.title}</CardTitle>
                  <CardDescription>{task.description}</CardDescription>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                    <Badge variant={getStatusColor(task.status)}>{task.status.replace("_", " ")}</Badge>
                    <span className="text-sm text-muted-foreground">Due: {task.dueDate}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {task.status === "pending" && (
                    <Button size="sm" onClick={() => handleUpdateTask(task)}>
                      <Play className="mr-2 h-4 w-4" />
                      Start
                    </Button>
                  )}
                  {task.status === "in_progress" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleUpdateTask(task)}>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </Button>
                      <Button size="sm" onClick={() => handleUpdateTask(task)}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Complete
                      </Button>
                    </>
                  )}
                  {task.status === "completed" && (
                    <Button size="sm" variant="outline" disabled>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Completed
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm">{task.progress}%</span>
                </div>
                <Progress value={task.progress} className="h-2" />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Category</span>
                      <span className="text-sm">{task.category}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Assigned By</span>
                      <span className="text-sm">{task.assignedBy}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Estimated Hours</span>
                      <span className="text-sm">{task.estimatedHours}h</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Actual Hours</span>
                      <span className="text-sm">{task.actualHours}h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Created</span>
                      <span className="text-sm">{task.createdDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Comments</span>
                      <span className="text-sm">{task.comments.length}</span>
                    </div>
                  </div>
                </div>

                {task.tags.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Tags:</span>
                    {task.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-4">
                    <Button variant="outline" size="sm" onClick={() => handleUpdateTask(task)}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Comment ({task.comments.length})
                    </Button>
                    <Button variant="outline" size="sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Attach File
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleUpdateTask(task)}>
                    Update Progress
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TaskUpdateModal open={showUpdateModal} onOpenChange={setShowUpdateModal} task={selectedTask} />
    </div>
  )
}

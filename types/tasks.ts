export interface Task {
  id: number
  title: string
  description: string
  assignedTo: string
  assignedBy: string
  assignedToId?: string
  assignedById?: string
  department: string
  category: string
  priority: "low" | "medium" | "high" | "critical"
  status: "pending" | "in_progress" | "completed" | "overdue" | "cancelled"
  progress: number
  dueDate: string
  createdDate: string
  updatedDate?: string
  completedDate?: string
  estimatedHours: number
  actualHours: number
  tags: string[]
  attachments?: TaskAttachment[]
  comments?: TaskComment[]
  subtasks?: SubTask[]
  dependencies?: string[]
  created_at: string
  updated_at: string
}

export interface TaskComment {
  id: number
  taskId: number
  author: string
  authorId?: string
  message: string
  timestamp: string
  created_at: string
}

export interface TaskAttachment {
  id: number
  taskId: number
  name: string
  size: string
  url: string
  uploadedBy: string
  uploadedAt: string
}

export interface SubTask {
  id: number
  parentTaskId: number
  title: string
  description?: string
  status: "pending" | "completed"
  assignedTo?: string
  dueDate?: string
  created_at: string
}

export interface TaskTemplate {
  id: number
  name: string
  description: string
  category: string
  estimatedHours: number
  priority: "low" | "medium" | "high" | "critical"
  tags: string[]
  checklist: TaskChecklistItem[]
  created_at: string
}

export interface TaskChecklistItem {
  id: number
  title: string
  description?: string
  required: boolean
  completed: boolean
}

export interface TaskPerformanceMetrics {
  employeeId: string
  employeeName: string
  period: string
  tasksAssigned: number
  tasksCompleted: number
  tasksOverdue: number
  avgCompletionTime: number
  onTimeCompletionRate: number
  qualityScore: number
  productivityScore: number
  improvementTrend: "up" | "down" | "stable"
  created_at: string
}

export interface DepartmentPerformance {
  department: string
  period: string
  totalEmployees: number
  totalTasks: number
  completedTasks: number
  avgProductivityScore: number
  avgQualityScore: number
  onTimeCompletionRate: number
  created_at: string
}

export interface TaskCategory {
  id: number
  name: string
  description: string
  color: string
  icon?: string
  created_at: string
}

export interface TaskPriority {
  level: "low" | "medium" | "high" | "critical"
  name: string
  color: string
  escalationDays: number
}

export interface TaskWorkflow {
  id: number
  name: string
  description: string
  steps: WorkflowStep[]
  category: string
  created_at: string
}

export interface WorkflowStep {
  id: number
  workflowId: number
  stepNumber: number
  title: string
  description: string
  assignedRole: string
  estimatedHours: number
  required: boolean
}

export interface TaskNotification {
  id: number
  taskId: number
  recipientId: string
  type: "assignment" | "due_soon" | "overdue" | "completed" | "comment" | "status_change"
  message: string
  read: boolean
  created_at: string
}

export interface TaskReport {
  id: number
  title: string
  description: string
  reportType: "individual" | "department" | "overall" | "custom"
  period: string
  filters: Record<string, any>
  data: Record<string, any>
  generatedBy: string
  created_at: string
}

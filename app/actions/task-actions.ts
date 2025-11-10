"use server"

import { sql } from "@vercel/postgres"
import { revalidatePath } from "next/cache"
import type { Task, TaskComment, TaskAttachment } from "@/types/tasks"

export async function createTask(formData: FormData): Promise<{
  success: boolean
  message: string
  taskId?: number
}> {
  try {
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const assignedTo = formData.get("assignedTo") as string
    const assignedBy = formData.get("assignedBy") as string
    const department = formData.get("department") as string
    const category = formData.get("category") as string
    const priority = formData.get("priority") as string
    const dueDate = formData.get("dueDate") as string
    const estimatedHours = Number.parseFloat(formData.get("estimatedHours") as string) || 0
    const tags = formData.get("tags") as string

    const tagsArray = tags ? tags.split(",").map((tag) => tag.trim()) : []

    const result = await sql`
      INSERT INTO tasks (
        title, description, assigned_to, assigned_by, department, 
        category, priority, due_date, estimated_hours, tags
      ) VALUES (
        ${title}, ${description}, ${assignedTo}, ${assignedBy}, 
        ${department}, ${category}, ${priority}, ${dueDate}, 
        ${estimatedHours}, ${tagsArray}
      )
      RETURNING id
    `

    revalidatePath("/tasks")
    revalidatePath("/tasks/my-tasks")

    return {
      success: true,
      message: "Task created successfully",
      taskId: result.rows[0].id,
    }
  } catch (error) {
    console.error("Error creating task:", error)
    return {
      success: false,
      message: "Failed to create task",
    }
  }
}

export async function updateTask(
  taskId: number,
  updates: Partial<Task>,
): Promise<{
  success: boolean
  message: string
}> {
  try {
    const updateFields = []
    const values = []
    let paramIndex = 1

    // Build dynamic update query
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const dbField = key.replace(/([A-Z])/g, "_$1").toLowerCase()
        updateFields.push(`${dbField} = $${paramIndex}`)
        values.push(value)
        paramIndex++
      }
    }

    if (updateFields.length === 0) {
      return {
        success: false,
        message: "No fields to update",
      }
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(taskId)

    const query = `
      UPDATE tasks 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex}
    `

    await sql.query(query, values)

    revalidatePath("/tasks")
    revalidatePath("/tasks/my-tasks")
    revalidatePath("/tasks/performance")

    return {
      success: true,
      message: "Task updated successfully",
    }
  } catch (error) {
    console.error("Error updating task:", error)
    return {
      success: false,
      message: "Failed to update task",
    }
  }
}

export async function updateTaskProgress(
  taskId: number,
  progress: number,
  actualHours?: number,
  comment?: string,
): Promise<{
  success: boolean
  message: string
}> {
  try {
    // Update task progress
    await sql`
      UPDATE tasks 
      SET 
        progress = ${progress},
        actual_hours = COALESCE(${actualHours}, actual_hours),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${taskId}
    `

    // Add comment if provided
    if (comment) {
      await sql`
        INSERT INTO task_comments (task_id, author, message)
        VALUES (${taskId}, 'Current User', ${comment})
      `
    }

    revalidatePath("/tasks")
    revalidatePath("/tasks/my-tasks")

    return {
      success: true,
      message: "Task progress updated successfully",
    }
  } catch (error) {
    console.error("Error updating task progress:", error)
    return {
      success: false,
      message: "Failed to update task progress",
    }
  }
}

export async function assignTask(
  taskId: number,
  assignedTo: string,
  assignedBy: string,
  department: string,
): Promise<{
  success: boolean
  message: string
}> {
  try {
    await sql`
      UPDATE tasks 
      SET 
        assigned_to = ${assignedTo},
        assigned_by = ${assignedBy},
        department = ${department},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${taskId}
    `

    // Create notification
    await sql`
      INSERT INTO task_notifications (task_id, recipient_id, type, message)
      VALUES (
        ${taskId}, 
        ${assignedTo}, 
        'assignment', 
        'You have been assigned a new task'
      )
    `

    revalidatePath("/tasks")
    revalidatePath("/tasks/my-tasks")

    return {
      success: true,
      message: "Task assigned successfully",
    }
  } catch (error) {
    console.error("Error assigning task:", error)
    return {
      success: false,
      message: "Failed to assign task",
    }
  }
}

export async function addTaskComment(
  taskId: number,
  author: string,
  message: string,
): Promise<{
  success: boolean
  message: string
}> {
  try {
    await sql`
      INSERT INTO task_comments (task_id, author, message)
      VALUES (${taskId}, ${author}, ${message})
    `

    revalidatePath("/tasks")
    revalidatePath("/tasks/my-tasks")

    return {
      success: true,
      message: "Comment added successfully",
    }
  } catch (error) {
    console.error("Error adding comment:", error)
    return {
      success: false,
      message: "Failed to add comment",
    }
  }
}

export async function getTasks(filters?: {
  assignedTo?: string
  status?: string
  priority?: string
  department?: string
}): Promise<{
  success: boolean
  data?: Task[]
  error?: string
}> {
  try {
    let query = `
      SELECT 
        t.*,
        tc.name as category_name,
        tc.color as category_color,
        (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comment_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
      FROM tasks t
      LEFT JOIN task_categories tc ON t.category_id = tc.id
      WHERE 1=1
    `

    const values = []
    let paramIndex = 1

    if (filters?.assignedTo) {
      query += ` AND t.assigned_to = $${paramIndex}`
      values.push(filters.assignedTo)
      paramIndex++
    }

    if (filters?.status) {
      query += ` AND t.status = $${paramIndex}`
      values.push(filters.status)
      paramIndex++
    }

    if (filters?.priority) {
      query += ` AND t.priority = $${paramIndex}`
      values.push(filters.priority)
      paramIndex++
    }

    if (filters?.department) {
      query += ` AND t.department = $${paramIndex}`
      values.push(filters.department)
      paramIndex++
    }

    query += ` ORDER BY t.created_at DESC`

    const result = await sql.query(query, values)

    return {
      success: true,
      data: result.rows as Task[],
    }
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return {
      success: false,
      error: "Failed to fetch tasks",
    }
  }
}

export async function getTaskById(taskId: number): Promise<{
  success: boolean
  data?: Task & {
    comments: TaskComment[]
    attachments: TaskAttachment[]
  }
  error?: string
}> {
  try {
    // Get task details
    const taskResult = await sql`
      SELECT t.*, tc.name as category_name, tc.color as category_color
      FROM tasks t
      LEFT JOIN task_categories tc ON t.category_id = tc.id
      WHERE t.id = ${taskId}
    `

    if (taskResult.rows.length === 0) {
      return {
        success: false,
        error: "Task not found",
      }
    }

    // Get comments
    const commentsResult = await sql`
      SELECT * FROM task_comments 
      WHERE task_id = ${taskId} 
      ORDER BY created_at ASC
    `

    // Get attachments
    const attachmentsResult = await sql`
      SELECT * FROM task_attachments 
      WHERE task_id = ${taskId} 
      ORDER BY uploaded_at ASC
    `

    const task = taskResult.rows[0] as Task
    const comments = commentsResult.rows as TaskComment[]
    const attachments = attachmentsResult.rows as TaskAttachment[]

    return {
      success: true,
      data: {
        ...task,
        comments,
        attachments,
      },
    }
  } catch (error) {
    console.error("Error fetching task:", error)
    return {
      success: false,
      error: "Failed to fetch task",
    }
  }
}

export async function deleteTask(taskId: number): Promise<{
  success: boolean
  message: string
}> {
  try {
    await sql`DELETE FROM tasks WHERE id = ${taskId}`

    revalidatePath("/tasks")
    revalidatePath("/tasks/my-tasks")

    return {
      success: true,
      message: "Task deleted successfully",
    }
  } catch (error) {
    console.error("Error deleting task:", error)
    return {
      success: false,
      message: "Failed to delete task",
    }
  }
}

export async function getTaskPerformanceMetrics(
  employeeId?: string,
  period?: string,
): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> {
  try {
    let query = `
      SELECT * FROM task_performance_metrics
      WHERE 1=1
    `

    const values = []
    let paramIndex = 1

    if (employeeId) {
      query += ` AND employee_id = $${paramIndex}`
      values.push(employeeId)
      paramIndex++
    }

    if (period) {
      query += ` AND period = $${paramIndex}`
      values.push(period)
      paramIndex++
    }

    query += ` ORDER BY period DESC, productivity_score DESC`

    const result = await sql.query(query, values)

    return {
      success: true,
      data: result.rows,
    }
  } catch (error) {
    console.error("Error fetching performance metrics:", error)
    return {
      success: false,
      error: "Failed to fetch performance metrics",
    }
  }
}

export async function calculateMonthlyPerformance(period: string): Promise<{
  success: boolean
  message: string
}> {
  try {
    // Get all employees who had tasks in the period
    const employeesResult = await sql`
      SELECT DISTINCT assigned_to_id, assigned_to
      FROM tasks 
      WHERE TO_CHAR(created_date, 'YYYY-MM') = ${period}
      AND assigned_to_id IS NOT NULL
    `

    // Calculate performance for each employee
    for (const employee of employeesResult.rows) {
      await sql`SELECT calculate_performance_metrics(${employee.assigned_to_id}, ${period})`
    }

    revalidatePath("/tasks/performance")

    return {
      success: true,
      message: "Performance metrics calculated successfully",
    }
  } catch (error) {
    console.error("Error calculating performance:", error)
    return {
      success: false,
      message: "Failed to calculate performance metrics",
    }
  }
}

export async function getTaskCategories(): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> {
  try {
    const result = await sql`
      SELECT * FROM task_categories 
      ORDER BY name ASC
    `

    return {
      success: true,
      data: result.rows,
    }
  } catch (error) {
    console.error("Error fetching task categories:", error)
    return {
      success: false,
      error: "Failed to fetch task categories",
    }
  }
}

export async function getTaskNotifications(
  recipientId: string,
  unreadOnly = false,
): Promise<{
  success: boolean
  data?: any[]
  error?: string
}> {
  try {
    let query = `
      SELECT tn.*, t.title as task_title
      FROM task_notifications tn
      JOIN tasks t ON tn.task_id = t.id
      WHERE tn.recipient_id = ${recipientId}
    `

    if (unreadOnly) {
      query += ` AND tn.read = false`
    }

    query += ` ORDER BY tn.created_at DESC LIMIT 50`

    const result = await sql.query(query)

    return {
      success: true,
      data: result.rows,
    }
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return {
      success: false,
      error: "Failed to fetch notifications",
    }
  }
}

export async function markNotificationAsRead(notificationId: number): Promise<{
  success: boolean
  message: string
}> {
  try {
    await sql`
      UPDATE task_notifications 
      SET read = true 
      WHERE id = ${notificationId}
    `

    return {
      success: true,
      message: "Notification marked as read",
    }
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return {
      success: false,
      message: "Failed to mark notification as read",
    }
  }
}

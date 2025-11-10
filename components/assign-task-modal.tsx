"use client"

import type React from "react"

import { useState } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface AssignTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssignTaskModal({ open, onOpenChange }: AssignTaskModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const employees = [
    { id: "EMP001", name: "John Smith", department: "Technical", workload: 15 },
    { id: "EMP002", name: "Sarah Johnson", department: "Support", workload: 12 },
    { id: "EMP003", name: "Mike Wilson", department: "Sales", workload: 8 },
    { id: "EMP004", name: "Grace Wanjiku", department: "HR", workload: 10 },
    { id: "EMP005", name: "David Kimani", department: "Operations", workload: 6 },
  ]

  const existingTasks = [
    { id: 1, title: "Network Infrastructure Upgrade", assignedTo: "John Smith" },
    { id: 2, title: "Customer Support Training", assignedTo: "Sarah Johnson" },
    { id: 3, title: "Security Audit", assignedTo: "Grace Wanjiku" },
    { id: 4, title: "Customer Onboarding Process", assignedTo: "David Kimani" },
  ]

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData(e.currentTarget)

      // In real app, this would call assignTask API
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Success",
        description: "Task assigned successfully",
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign task",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Existing Task</DialogTitle>
          <DialogDescription>Reassign an existing task to a different team member.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="taskId">Select Task</Label>
              <Select name="taskId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a task to reassign" />
                </SelectTrigger>
                <SelectContent>
                  {existingTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id.toString()}>
                      {task.title} (Currently: {task.assignedTo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="assignedTo">Assign To</Label>
              <Select name="assignedTo" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.name}>
                      <div className="flex items-center justify-between w-full">
                        <span>
                          {employee.name} - {employee.department}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">({employee.workload} tasks)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Reason for Reassignment</Label>
              <Textarea id="reason" name="reason" placeholder="Explain why this task is being reassigned..." rows={3} />
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Team Workload Overview</h4>
              <div className="space-y-2">
                {employees.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between text-sm">
                    <span>{employee.name}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-background rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${Math.min((employee.workload / 20) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12">{employee.workload}/20</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Assigning..." : "Assign Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

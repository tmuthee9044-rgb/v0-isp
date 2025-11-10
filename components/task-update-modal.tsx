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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"

interface TaskUpdateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: any
}

export function TaskUpdateModal({ open, onOpenChange, task }: TaskUpdateModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(task?.progress || 0)
  const [status, setStatus] = useState(task?.status || "pending")
  const { toast } = useToast()

  if (!task) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData(e.currentTarget)

      // In real app, this would call updateTaskProgress API
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Success",
        description: "Task updated successfully",
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task",
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
          <DialogTitle>Update Task Progress</DialogTitle>
          <DialogDescription>Update the progress and status of "{task.title}"</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Current Progress: {progress}%</Label>
              <div className="px-2">
                <Slider
                  value={[progress]}
                  onValueChange={(value) => setProgress(value[0])}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus} name="status">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="actualHours">Actual Hours Worked</Label>
              <Input
                id="actualHours"
                name="actualHours"
                type="number"
                min="0"
                step="0.5"
                defaultValue={task.actualHours}
                placeholder="0"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="comment">Progress Update Comment</Label>
              <Textarea
                id="comment"
                name="comment"
                placeholder="Describe what you've accomplished or any blockers..."
                rows={4}
              />
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Task Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Estimated Hours:</span>
                  <span>{task.estimatedHours}h</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Actual Hours:</span>
                  <span>{task.actualHours}h</span>
                </div>
                <div className="flex justify-between">
                  <span>Due Date:</span>
                  <span>{task.dueDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Priority:</span>
                  <span className="capitalize">{task.priority}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

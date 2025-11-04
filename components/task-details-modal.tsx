"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar, Clock, User, Tag, MessageSquare, Paperclip, CheckCircle, Play, Pause, Edit } from "lucide-react"

interface TaskDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: any
}

export function TaskDetailsModal({ open, onOpenChange, task }: TaskDetailsModalProps) {
  const [newComment, setNewComment] = useState("")

  if (!task) return null

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

  const handleAddComment = () => {
    if (newComment.trim()) {
      // In real app, this would call an API
      console.log("Adding comment:", newComment)
      setNewComment("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{task.title}</span>
            <div className="flex items-center space-x-2">
              <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
              <Badge variant={getStatusColor(task.status)}>{task.status.replace("_", " ")}</Badge>
            </div>
          </DialogTitle>
          <DialogDescription>Task details and progress tracking</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Task Description */}
            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">{task.description}</p>
            </div>

            {/* Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Progress</h4>
                <span className="text-sm font-medium">{task.progress}%</span>
              </div>
              <Progress value={task.progress} className="h-2" />
            </div>

            {/* Task Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Assigned To</div>
                    <div className="text-sm text-muted-foreground">{task.assignedTo}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Due Date</div>
                    <div className="text-sm text-muted-foreground">{task.dueDate}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Estimated Hours</div>
                    <div className="text-sm text-muted-foreground">{task.estimatedHours}h</div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">Department</div>
                  <div className="text-sm text-muted-foreground">{task.department}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Category</div>
                  <div className="text-sm text-muted-foreground">{task.category}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Actual Hours</div>
                  <div className="text-sm text-muted-foreground">{task.actualHours}h</div>
                </div>
              </div>
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <Tag className="h-4 w-4 mr-2" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Comments Section */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Comments ({task.comments?.length || 0})
              </h4>

              {task.comments && task.comments.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {task.comments.map((comment: any) => (
                    <div key={comment.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{comment.author}</span>
                        <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">No comments yet.</p>
              )}

              {/* Add Comment */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                  Add Comment
                </Button>
              </div>
            </div>

            {/* Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center">
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attachments ({task.attachments.length})
                </h4>
                <div className="space-y-2">
                  {task.attachments.map((attachment: any) => (
                    <div key={attachment.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{attachment.name}</span>
                        <span className="text-xs text-muted-foreground">({attachment.size})</span>
                      </div>
                      <Button variant="outline" size="sm">
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            {task.status === "pending" && (
              <Button size="sm">
                <Play className="mr-2 h-4 w-4" />
                Start Task
              </Button>
            )}
            {task.status === "in_progress" && (
              <>
                <Button size="sm" variant="outline">
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </Button>
                <Button size="sm">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete
                </Button>
              </>
            )}
            <Button size="sm" variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit Task
            </Button>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, AlertCircle, Clock, Zap } from "lucide-react"

interface CreateTicketModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: number
  customerName: string
}

export function CreateTicketModal({ open, onOpenChange, customerId, customerName }: CreateTicketModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("")
  const [category, setCategory] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const categories = [
    { value: "technical", label: "Technical Issue" },
    { value: "billing", label: "Billing Inquiry" },
    { value: "service", label: "Service Request" },
    { value: "complaint", label: "Complaint" },
    { value: "general", label: "General Inquiry" },
  ]

  const priorities = [
    { value: "low", label: "Low", color: "bg-blue-100 text-blue-800", icon: Clock },
    { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
    { value: "high", label: "High", color: "bg-red-100 text-red-800", icon: Zap },
  ]

  const commonIssues = [
    {
      title: "Slow Internet Connection",
      description: "Customer experiencing slower than expected internet speeds",
      category: "technical",
      priority: "medium",
    },
    {
      title: "Service Interruption",
      description: "Complete loss of internet connectivity",
      category: "technical",
      priority: "high",
    },
    {
      title: "WiFi Configuration Help",
      description: "Customer needs assistance with WiFi setup or password reset",
      category: "service",
      priority: "low",
    },
    {
      title: "Billing Inquiry",
      description: "Questions about charges or payment methods",
      category: "billing",
      priority: "low",
    },
  ]

  const handleQuickCreate = (issue: (typeof commonIssues)[0]) => {
    setTitle(issue.title)
    setDescription(issue.description)
    setCategory(issue.category)
    setPriority(issue.priority)
  }

  const handleSubmit = async () => {
    if (!title || !description || !priority || !category) return

    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      console.log("Creating ticket:", {
        customerId,
        title,
        description,
        priority,
        category,
      })

      onOpenChange(false)
      setTitle("")
      setDescription("")
      setPriority("")
      setCategory("")
    } catch (error) {
      console.error("Error creating ticket:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>Create a new support ticket for {customerName}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ticket Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="ticket-title">Title</Label>
                  <Input
                    id="ticket-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief description of the issue"
                  />
                </div>

                <div>
                  <Label htmlFor="ticket-category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ticket-priority">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <div className="flex items-center gap-2">
                            <p.icon className="w-4 h-4" />
                            {p.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ticket-description">Description</Label>
                  <Textarea
                    id="ticket-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed description of the issue or request"
                    rows={6}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={!title || !description || !priority || !category || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Ticket
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Create</CardTitle>
                <CardDescription>Common issues for faster ticket creation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {commonIssues.map((issue, index) => (
                    <Card
                      key={index}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleQuickCreate(issue)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium text-sm">{issue.title}</h4>
                            <p className="text-xs text-muted-foreground">{issue.description}</p>
                          </div>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-xs">
                              {categories.find((c) => c.value === issue.category)?.label}
                            </Badge>
                            <Badge className={`text-xs ${priorities.find((p) => p.value === issue.priority)?.color}`}>
                              {priorities.find((p) => p.value === issue.priority)?.label}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer:</span>
                    <span className="font-medium">{customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer ID:</span>
                    <span className="font-medium">{customerId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

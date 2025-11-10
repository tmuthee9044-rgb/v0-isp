"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Zap, Play, Pause, Trash2, Plus, Target, Settings, RefreshCw, CheckCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Workflow {
  id: number
  name: string
  description: string
  trigger_type: string
  trigger_conditions: any
  actions: any[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function AutomationPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger_type: "",
    trigger_conditions: {},
    actions: [],
  })

  const fetchWorkflows = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/automation/workflows")
      const data = await response.json()

      if (data.success) {
        setWorkflows(data.workflows)
      } else {
        toast({
          title: "Error",
          description: "Failed to load workflows",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching workflows:", error)
      toast({
        title: "Error",
        description: "Failed to load workflows",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const handleCreateWorkflow = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/automation/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Workflow created successfully",
        })
        setIsCreateDialogOpen(false)
        setFormData({ name: "", description: "", trigger_type: "", trigger_conditions: {}, actions: [] })
        fetchWorkflows()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create workflow",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating workflow:", error)
      toast({
        title: "Error",
        description: "Failed to create workflow",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleWorkflow = async (workflowId: number) => {
    try {
      const response = await fetch(`/api/automation/workflows/${workflowId}/toggle`, {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: `Workflow ${data.workflow.is_active ? "activated" : "paused"}`,
        })
        fetchWorkflows()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to toggle workflow",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error toggling workflow:", error)
      toast({
        title: "Error",
        description: "Failed to toggle workflow",
        variant: "destructive",
      })
    }
  }

  const handleDeleteWorkflow = async (workflowId: number) => {
    if (!confirm("Are you sure you want to delete this workflow?")) return

    try {
      const response = await fetch(`/api/automation/workflows/${workflowId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Workflow deleted successfully",
        })
        fetchWorkflows()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete workflow",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting workflow:", error)
      toast({
        title: "Error",
        description: "Failed to delete workflow",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      )
    }
    return (
      <Badge variant="secondary">
        <Pause className="w-3 h-3 mr-1" />
        Paused
      </Badge>
    )
  }

  const stats = {
    total: workflows.length,
    active: workflows.filter((w) => w.is_active).length,
    paused: workflows.filter((w) => !w.is_active).length,
  }

  const triggers = [
    { name: "Customer Registration", description: "When a new customer registers", category: "Customer" },
    { name: "Payment Received", description: "When payment is confirmed", category: "Billing" },
    { name: "Payment Failed", description: "When payment fails", category: "Billing" },
    { name: "Bill Generated", description: "When a new bill is generated", category: "Billing" },
    { name: "Service Activated", description: "When service is activated", category: "Service" },
    { name: "Support Ticket Created", description: "When a new ticket is created", category: "Support" },
    { name: "Network Alert", description: "When network issues are detected", category: "Network" },
    { name: "Scheduled Time", description: "At specific times/intervals", category: "Schedule" },
  ]

  const actions = [
    { name: "Send Email", description: "Send email to customer or staff", category: "Communication" },
    { name: "Send SMS", description: "Send SMS notification", category: "Communication" },
    { name: "Update Customer Status", description: "Change customer account status", category: "Customer" },
    { name: "Suspend Service", description: "Suspend customer service", category: "Service" },
    { name: "Activate Service", description: "Activate customer service", category: "Service" },
    { name: "Create Task", description: "Create a task for staff", category: "Task" },
    { name: "Generate Report", description: "Generate and send reports", category: "Reporting" },
    { name: "Update Billing", description: "Update billing information", category: "Billing" },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Automation</h2>
          <p className="text-muted-foreground">Configure automated workflows and tasks for your ISP operations</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchWorkflows} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Workflow
          </Button>
        </div>
      </div>

      <Tabs defaultValue="workflows" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <CardTitle>Active Workflows</CardTitle>
                </div>
              </div>
              <CardDescription>Manage your automated workflows and their execution status</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : workflows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No workflows found. Create your first workflow to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workflow</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workflows.map((workflow) => (
                      <TableRow key={workflow.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{workflow.name}</div>
                            <div className="text-sm text-muted-foreground">{workflow.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{workflow.trigger_type}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(workflow.is_active)}</TableCell>
                        <TableCell className="text-sm">{new Date(workflow.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleToggleWorkflow(workflow.id)}>
                              {workflow.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteWorkflow(workflow.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Workflow Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Workflows</span>
                    <span className="text-2xl font-bold">{stats.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active</span>
                    <span className="text-lg font-semibold text-green-600">{stats.active}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Paused</span>
                    <span className="text-lg font-semibold text-yellow-600">{stats.paused}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="triggers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Available Triggers</span>
              </CardTitle>
              <CardDescription>Events that can start automated workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {triggers.map((trigger, index) => (
                  <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-medium">{trigger.name}</Label>
                      <Badge variant="outline">{trigger.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{trigger.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Available Actions</span>
              </CardTitle>
              <CardDescription>Actions that can be performed by automated workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {actions.map((action, index) => (
                  <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-medium">{action.name}</Label>
                      <Badge variant="outline">{action.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Workflow Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>Set up a new automated workflow for your ISP operations</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name</Label>
              <Input
                id="name"
                placeholder="Enter workflow name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this workflow does"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trigger">Trigger Type</Label>
              <Select
                value={formData.trigger_type}
                onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger" />
                </SelectTrigger>
                <SelectContent>
                  {triggers.map((trigger, index) => (
                    <SelectItem key={index} value={trigger.name}>
                      {trigger.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkflow} disabled={isLoading || !formData.name || !formData.trigger_type}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

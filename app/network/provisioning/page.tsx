"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Play, Pause, RotateCcw, CheckCircle, XCircle, Clock, Wifi, User } from "lucide-react"
import { toast } from "sonner"

interface Customer {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  status: string
}

interface ServicePlan {
  id: number
  name: string
  download_speed: number
  upload_speed: number
  price: number
  description: string
}

interface NetworkRouter {
  id: number
  name: string
  hostname: string
  type: string
  status: string
  location_name: string
}

interface ProvisioningRequest {
  id: number
  customer_id: number
  customer_name: string
  service_plan_id: number
  service_plan_name: string
  router_id: number
  router_name: string
  ip_address: string
  status: "pending" | "in_progress" | "completed" | "failed" | "suspended"
  created_at: string
  updated_at: string
  error_message?: string
  retry_count: number
}

export default function ProvisioningPage() {
  const [requests, setRequests] = useState<ProvisioningRequest[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [servicePlans, setServicePlans] = useState<ServicePlan[]>([])
  const [routers, setRouters] = useState<NetworkRouter[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [processingRequest, setProcessingRequest] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    customer_id: "",
    service_plan_id: "",
    router_id: "",
    allocation_mode: "dynamic" as const,
  })

  useEffect(() => {
    fetchProvisioningRequests()
    fetchCustomers()
    fetchServicePlans()
    fetchRouters()
  }, [])

  const fetchProvisioningRequests = async () => {
    try {
      const response = await fetch("/api/network/provisioning")
      if (response.ok) {
        const data = await response.json()
        setRequests(data)
      }
    } catch (error) {
      console.error("Error fetching provisioning requests:", error)
      toast.error("Failed to fetch provisioning requests")
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers")
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
      }
    } catch (error) {
      console.error("Error fetching customers:", error)
    }
  }

  const fetchServicePlans = async () => {
    try {
      const response = await fetch("/api/service-plans")
      if (response.ok) {
        const data = await response.json()
        setServicePlans(data.plans || [])
      }
    } catch (error) {
      console.error("Error fetching service plans:", error)
    }
  }

  const fetchRouters = async () => {
    try {
      const response = await fetch("/api/network/routers")
      if (response.ok) {
        const data = await response.json()
        setRouters(data.filter((r: NetworkRouter) => r.status === "connected"))
      }
    } catch (error) {
      console.error("Error fetching routers:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch("/api/network/provisioning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success("Provisioning request created successfully")
        setIsAddDialogOpen(false)
        resetForm()
        fetchProvisioningRequests()
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to create provisioning request")
      }
    } catch (error) {
      console.error("Error creating provisioning request:", error)
      toast.error("Failed to create provisioning request")
    }
  }

  const processRequest = async (requestId: number) => {
    setProcessingRequest(requestId)
    try {
      const response = await fetch(`/api/network/provisioning/${requestId}/process`, {
        method: "POST",
      })

      if (response.ok) {
        const result = await response.json()
        toast.success("Service provisioned successfully")
        fetchProvisioningRequests()
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to process provisioning request")
      }
    } catch (error) {
      console.error("Error processing request:", error)
      toast.error("Failed to process provisioning request")
    } finally {
      setProcessingRequest(null)
    }
  }

  const suspendService = async (requestId: number) => {
    try {
      const response = await fetch(`/api/network/provisioning/${requestId}/suspend`, {
        method: "POST",
      })

      if (response.ok) {
        toast.success("Service suspended successfully")
        fetchProvisioningRequests()
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to suspend service")
      }
    } catch (error) {
      console.error("Error suspending service:", error)
      toast.error("Failed to suspend service")
    }
  }

  const retryRequest = async (requestId: number) => {
    setProcessingRequest(requestId)
    try {
      const response = await fetch(`/api/network/provisioning/${requestId}/retry`, {
        method: "POST",
      })

      if (response.ok) {
        toast.success("Retrying provisioning request")
        fetchProvisioningRequests()
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to retry request")
      }
    } catch (error) {
      console.error("Error retrying request:", error)
      toast.error("Failed to retry request")
    } finally {
      setProcessingRequest(null)
    }
  }

  const resetForm = () => {
    setFormData({
      customer_id: "",
      service_plan_id: "",
      router_id: "",
      allocation_mode: "dynamic",
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      in_progress: { color: "bg-blue-100 text-blue-800", icon: Play },
      completed: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      failed: { color: "bg-red-100 text-red-800", icon: XCircle },
      suspended: { color: "bg-gray-100 text-gray-800", icon: Pause },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge variant="secondary" className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    )
  }

  const getStatusCounts = () => {
    return {
      pending: requests.filter((r) => r.status === "pending").length,
      in_progress: requests.filter((r) => r.status === "in_progress").length,
      completed: requests.filter((r) => r.status === "completed").length,
      failed: requests.filter((r) => r.status === "failed").length,
      suspended: requests.filter((r) => r.status === "suspended").length,
    }
  }

  const statusCounts = getStatusCounts()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Service Provisioning</h1>
          <p className="text-muted-foreground">Manage customer service provisioning and network configuration</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm()
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Provisioning Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Provisioning Request</DialogTitle>
              <DialogDescription>Set up network service provisioning for a customer</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, customer_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.first_name} {customer.last_name} ({customer.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service_plan">Service Plan</Label>
                  <Select
                    value={formData.service_plan_id}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, service_plan_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicePlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id.toString()}>
                          {plan.name} - {plan.download_speed}/{plan.upload_speed} Mbps (KES {plan.price})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="router">Router</Label>
                    <Select
                      value={formData.router_id}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, router_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select router" />
                      </SelectTrigger>
                      <SelectContent>
                        {routers.map((router) => (
                          <SelectItem key={router.id} value={router.id.toString()}>
                            {router.name} ({router.hostname})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="allocation_mode">IP Allocation</Label>
                    <Select
                      value={formData.allocation_mode}
                      onValueChange={(value: any) => setFormData((prev) => ({ ...prev, allocation_mode: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dynamic">Dynamic (Auto-assign)</SelectItem>
                        <SelectItem value="static">Static (Manual)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Request</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Play className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.in_progress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <Pause className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.suspended}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provisioning Requests</CardTitle>
          <CardDescription>Manage customer service provisioning requests and network configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Service Plan</TableHead>
                <TableHead>Router</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{request.customer_name}</div>
                        <div className="text-sm text-muted-foreground">ID: {request.customer_id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{request.service_plan_name}</div>
                      <div className="text-sm text-muted-foreground">Plan ID: {request.service_plan_id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{request.router_name}</div>
                        <div className="text-sm text-muted-foreground">Router {request.router_id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono text-sm">{request.ip_address || "Not assigned"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getStatusBadge(request.status)}
                      {request.error_message && (
                        <div className="text-xs text-red-600 max-w-xs truncate" title={request.error_message}>
                          {request.error_message}
                        </div>
                      )}
                      {request.retry_count > 0 && (
                        <div className="text-xs text-muted-foreground">Retries: {request.retry_count}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {request.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => processRequest(request.id)}
                          disabled={processingRequest === request.id}
                        >
                          {processingRequest === request.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900"></div>
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                      {request.status === "failed" && request.retry_count < 3 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryRequest(request.id)}
                          disabled={processingRequest === request.id}
                        >
                          {processingRequest === request.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900"></div>
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                      {request.status === "completed" && (
                        <Button size="sm" variant="outline" onClick={() => suspendService(request.id)}>
                          <Pause className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {requests.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No provisioning requests yet.</p>
              <p className="text-sm text-muted-foreground">Create your first provisioning request to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

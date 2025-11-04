"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus,
  Edit,
  Trash2,
  Wifi,
  Globe,
  Shield,
  Settings,
  Clock,
  AlertCircle,
  CheckCircle,
  History,
  XCircle,
  Pause,
  Play,
  Router,
  Activity,
  AlertTriangle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  getCustomerServices,
  addCustomerService,
  updateCustomerService,
  deleteCustomerService,
} from "@/app/actions/customer-service-actions"
import { ActivityLogger } from "@/lib/activity-logger"
import AddServiceModal from "@/components/add-service-modal"

interface CustomerServicesTabProps {
  customerId: string
}

interface CustomerService {
  id: number
  customer_id: number
  service_plan_id: number
  status: string
  monthly_fee: number
  start_date: string
  end_date: string | null
  ip_address: string | null
  device_id: string | null
  connection_type: string | null
  config_id: string | null
  created_at: string
  service_name: string
  service_description: string
  download_speed: string
  upload_speed: string
  data_limit: string
  plan_price: number
  router_id: number | null
  suspended_at: string | null
  router_sync_status: string | null
}

interface ServicePlan {
  id: number
  name: string
  description: string
  price: number
  download_speed: string
  upload_speed: string
  data_limit: string
}

export function CustomerServicesTab({ customerId }: { customerId: number }) {
  const [services, setServices] = useState<any[]>([])
  const [servicePlans, setServicePlans] = useState<ServicePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<CustomerService | null>(null)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [selectedServiceType, setSelectedServiceType] = useState("")
  const [pppoeCredentials, setPppoeCredentials] = useState({ username: "", password: "" })
  const { toast } = useToast()
  const [customer, setCustomer] = useState<any>(null)
  const [serviceHistory, setServiceHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [monthlyFeeOverride, setMonthlyFeeOverride] = useState<string>("")
  const [suspensionLoading, setSuspensionLoading] = useState<{ [key: number]: boolean }>({})
  const [showSuspensionDialog, setShowSuspensionDialog] = useState(false)
  const [suspensionAction, setSuspensionAction] = useState<{
    serviceId: number
    action: "suspend" | "reactivate"
  } | null>(null)
  const [suspensionReason, setSuspensionReason] = useState("")
  const [routerLogs, setRouterLogs] = useState<any[]>([])
  const [showRouterLogs, setShowRouterLogs] = useState(false)

  useEffect(() => {
    fetchServices()
    fetchCustomer()
    loadServicePlans()
  }, [customerId])

  const fetchCustomer = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`)
      if (response.ok) {
        const data = await response.json()
        setCustomer(data.customer)
      }
    } catch (error) {
      console.error("Error fetching customer:", error)
    }
  }

  const loadServicePlans = async () => {
    try {
      const response = await fetch("/api/service-plans")
      if (response.ok) {
        const data = await response.json()
        setServicePlans(data.plans || [])
      }
    } catch (error) {
      console.error("Error loading service plans:", error)
    }
  }

  const handleServiceTypeChange = (value: string) => {
    setSelectedServiceType(value)
    if (value !== "pppoe") {
      setPppoeCredentials({ username: "", password: "" })
    }
  }

  const handleAddService = async (formData: FormData) => {
    try {
      const result = await addCustomerService(customerId, formData)

      if (result.success) {
        toast({
          title: "Success",
          description: "Service added successfully",
        })
        setIsAddModalOpen(false)
        fetchServices()

        // Log activity
        await ActivityLogger.log({
          action: "service_added",
          resource: "customer_service",
          resourceId: result.serviceId,
          details: {
            customerId,
            serviceType: formData.get("service_type"),
          },
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add service",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding service:", error)
      toast({
        title: "Error",
        description: "Failed to add service",
        variant: "destructive",
      })
    }
  }

  const handleEditService = async (formData: FormData) => {
    if (!editingService) return

    const result = await updateCustomerService(editingService.id, formData)
    if (result.success) {
      toast({
        title: "Success",
        description: "Service updated successfully",
      })
      setIsEditDialogOpen(false)
      setEditingService(null)
      fetchServices()
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update service",
        variant: "destructive",
      })
    }
  }

  const handleDeleteService = async (serviceId: number) => {
    if (!confirm("Are you sure you want to delete this service?")) return

    const result = await deleteCustomerService(serviceId)
    if (result.success) {
      toast({
        title: "Success",
        description: "Service deleted successfully",
      })
      fetchServices()
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete service",
        variant: "destructive",
      })
    }
  }

  const sendWelcomeEmail = async (customerId: number) => {
    try {
      await fetch(`/api/customers/${customerId}/welcome`, { method: "POST" })
      toast({ title: "Welcome email sent successfully" })
    } catch (error) {
      console.error("Error sending welcome email:", error)
    }
  }

  const pushToRouter = async (serviceId: number) => {
    try {
      await fetch(`/api/services/${serviceId}/push-router`, { method: "POST" })
      toast({ title: "Configuration pushed to router" })
    } catch (error) {
      console.error("Error pushing to router:", error)
    }
  }

  const generateFirstInvoice = async (customerId: number, serviceId: number) => {
    try {
      await fetch(`/api/customers/${customerId}/generate-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      })
      toast({ title: "First invoice generated" })
    } catch (error) {
      console.error("Error generating invoice:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200"
      case "suspended":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "terminated":
        return "bg-red-100 text-red-800 border-red-200"
      case "pending":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const loadServiceHistory = async (serviceId: number) => {
    try {
      const response = await fetch(`/api/services/${serviceId}/history`)
      if (response.ok) {
        const data = await response.json()
        setServiceHistory(data.history || [])
      }
    } catch (error) {
      console.error("Error loading service history:", error)
    }
  }

  const openEditDialog = async (service: any) => {
    setEditingService(service)
    setIsEditDialogOpen(true)
  }

  const fetchServices = async () => {
    try {
      const data = await getCustomerServices(customerId)
      setServices(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load customer services",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSuspendService = async (serviceId: number, reason: string) => {
    setSuspensionLoading((prev) => ({ ...prev, [serviceId]: true }))

    try {
      const response = await fetch(`/api/customers/${customerId}/actions/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          reason,
          suspensionType: "manual",
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Service Suspended",
          description: `Service suspended successfully. ${result.routerResults?.length || 0} router operations completed.`,
        })
        fetchServices()

        // Show router results if any failed
        const failedOperations = result.routerResults?.filter((r: any) => !r.success) || []
        if (failedOperations.length > 0) {
          toast({
            title: "Router Sync Warning",
            description: `${failedOperations.length} router operations failed. Check logs for details.`,
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Suspension Failed",
          description: result.error || "Failed to suspend service",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error suspending service:", error)
      toast({
        title: "Error",
        description: "Failed to suspend service",
        variant: "destructive",
      })
    } finally {
      setSuspensionLoading((prev) => ({ ...prev, [serviceId]: false }))
    }
  }

  const handleReactivateService = async (serviceId: number, reason: string) => {
    setSuspensionLoading((prev) => ({ ...prev, [serviceId]: true }))

    try {
      const response = await fetch(`/api/customers/${customerId}/actions/unsuspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          reactivationReason: reason,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Service Reactivated",
          description: `Service reactivated successfully. ${result.routerResults?.length || 0} router operations completed.`,
        })
        fetchServices()

        // Show router results if any failed
        const failedOperations = result.routerResults?.filter((r: any) => !r.success) || []
        if (failedOperations.length > 0) {
          toast({
            title: "Router Sync Warning",
            description: `${failedOperations.length} router operations failed. Check logs for details.`,
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Reactivation Failed",
          description: result.error || "Failed to reactivate service",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error reactivating service:", error)
      toast({
        title: "Error",
        description: "Failed to reactivate service",
        variant: "destructive",
      })
    } finally {
      setSuspensionLoading((prev) => ({ ...prev, [serviceId]: false }))
    }
  }

  const openSuspensionDialog = (serviceId: number, action: "suspend" | "reactivate") => {
    setSuspensionAction({ serviceId, action })
    setSuspensionReason("")
    setShowSuspensionDialog(true)
  }

  const confirmSuspensionAction = async () => {
    if (!suspensionAction || !suspensionReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a reason for this action",
        variant: "destructive",
      })
      return
    }

    if (suspensionAction.action === "suspend") {
      await handleSuspendService(suspensionAction.serviceId, suspensionReason)
    } else {
      await handleReactivateService(suspensionAction.serviceId, suspensionReason)
    }

    setShowSuspensionDialog(false)
    setSuspensionAction(null)
  }

  const loadRouterLogs = async (serviceId?: number) => {
    try {
      const url = serviceId
        ? `/api/customers/${customerId}/provisioning-status?serviceId=${serviceId}`
        : `/api/customers/${customerId}/provisioning-status`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setRouterLogs(data.recentLogs || [])
      }
    } catch (error) {
      console.error("Error loading router logs:", error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "suspended":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "terminated":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getRouterSyncStatus = (service: any) => {
    if (!service.router_sync_status) return null

    switch (service.router_sync_status) {
      case "synced":
        return (
          <div className="flex items-center text-xs text-green-600">
            <Router className="h-3 w-3 mr-1" />
            Synced
          </div>
        )
      case "failed":
        return (
          <div className="flex items-center text-xs text-red-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Sync Failed
          </div>
        )
      case "pending":
        return (
          <div className="flex items-center text-xs text-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return <div>Loading services...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Customer Services</h3>
          <p className="text-sm text-gray-500">Manage all services for this customer</p>
        </div>
        <Button
          onClick={() => {
            console.log("[v0] Add Service button clicked, customerId:", customerId)
            console.log("[v0] Customer data:", customer)
            console.log("[v0] Current modal state:", isAddModalOpen)
            setIsAddModalOpen(true)
            console.log("[v0] Modal state set to true")
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wifi className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Services Found</h3>
            <p className="text-gray-500 text-center mb-4">This customer doesn't have any active services yet.</p>
            <Button
              onClick={() => {
                console.log("[v0] Add First Service button clicked")
                console.log("[v0] Customer data for modal:", customer)
                setIsAddModalOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Active Services ({services.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Monthly Fee</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{service.service_name}</div>
                        <div className="text-sm text-gray-500">
                          {service.download_speed}/{service.upload_speed} • {service.data_limit}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(service.status)}
                          <Badge className={getStatusColor(service.status)}>{service.status}</Badge>
                        </div>
                        {getRouterSyncStatus(service)}
                        {service.suspended_at && (
                          <div className="text-xs text-gray-500">
                            Suspended: {new Date(service.suspended_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>KES {service.monthly_fee ? service.monthly_fee.toLocaleString() : "0"}</TableCell>
                    <TableCell>{new Date(service.start_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {service.end_date ? new Date(service.end_date).toLocaleDateString() : "Ongoing"}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {service.status === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openSuspensionDialog(service.id, "suspend")}
                            disabled={suspensionLoading[service.id]}
                            className="text-yellow-600 hover:text-yellow-700"
                          >
                            {suspensionLoading[service.id] ? (
                              <Clock className="h-4 w-4 animate-spin" />
                            ) : (
                              <Pause className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        {service.status === "suspended" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openSuspensionDialog(service.id, "reactivate")}
                            disabled={suspensionLoading[service.id]}
                            className="text-green-600 hover:text-green-700"
                          >
                            {suspensionLoading[service.id] ? (
                              <Clock className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            loadRouterLogs(service.id)
                            setShowRouterLogs(true)
                          }}
                        >
                          <Activity className="h-4 w-4" />
                        </Button>

                        <Button size="sm" variant="outline" onClick={() => openEditDialog(service)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteService(service.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {customer && (
        <AddServiceModal
          open={isAddModalOpen}
          onOpenChange={(open) => {
            console.log("[v0] Modal onOpenChange called with:", open)
            setIsAddModalOpen(open)
          }}
          customerId={customerId}
          customerData={{
            name:
              customer.name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Unknown Customer",
            email: customer.email || "",
            phone: customer.phone || "",
            portal_username: customer.portal_username || "",
          }}
        />
      )}

      {!customer && (
        <AddServiceModal
          open={isAddModalOpen}
          onOpenChange={(open) => {
            console.log("[v0] Fallback modal onOpenChange called with:", open)
            setIsAddModalOpen(open)
          }}
          customerId={customerId}
          customerData={{
            name: "Loading...",
            email: "",
            phone: "",
            portal_username: "",
          }}
        />
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Edit className="w-5 h-5 mr-2" />
                Edit Service
              </div>
              {editingService && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    loadServiceHistory(editingService.id)
                    setShowHistory(!showHistory)
                  }}
                >
                  <History className="w-4 h-4 mr-2" />
                  History
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {showHistory && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Change History</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {serviceHistory.map((entry, index) => (
                  <div key={index} className="text-xs border-l-2 border-blue-200 pl-2">
                    <div className="font-medium">
                      {entry.action} - {entry.timestamp}
                    </div>
                    <div className="text-gray-600">By: {entry.admin_name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {editingService && (
            <form action={handleEditService} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="service_type">Service Type</Label>
                    <Select name="service_type" defaultValue={editingService.connection_type || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internet">
                          <div className="flex items-center">
                            <Globe className="w-4 h-4 mr-2" />
                            Internet
                          </div>
                        </SelectItem>
                        <SelectItem value="voip">
                          <div className="flex items-center">
                            <Settings className="w-4 h-4 mr-2" />
                            VOIP
                          </div>
                        </SelectItem>
                        <SelectItem value="hosting">
                          <div className="flex items-center">
                            <Shield className="w-4 h-4 mr-2" />
                            Hosting
                          </div>
                        </SelectItem>
                        <SelectItem value="vpn">
                          <div className="flex items-center">
                            <Shield className="w-4 h-4 mr-2" />
                            VPN
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="service_plan_id">Service Plan</Label>
                    <Select name="service_plan_id" defaultValue={editingService.service_plan_id?.toString() || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {servicePlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id.toString()}>
                            <div>
                              <div className="font-medium">{plan.name}</div>
                              <div className="text-xs text-gray-500">
                                {plan.download_speed}/{plan.upload_speed} • KES {plan.price?.toLocaleString() || 0}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="monthly_fee">Monthly Fee (KES)</Label>
                    <Input
                      name="monthly_fee"
                      type="number"
                      step="0.01"
                      defaultValue={editingService.monthly_fee || 0}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      name="start_date"
                      type="date"
                      defaultValue={
                        editingService.start_date ? new Date(editingService.start_date).toISOString().split("T")[0] : ""
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="end_date">End Date (Optional)</Label>
                    <Input
                      name="end_date"
                      type="date"
                      defaultValue={
                        editingService.end_date ? new Date(editingService.end_date).toISOString().split("T")[0] : ""
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue={editingService.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                            Active
                          </div>
                        </SelectItem>
                        <SelectItem value="suspended">
                          <div className="flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2 text-yellow-500" />
                            Suspended
                          </div>
                        </SelectItem>
                        <SelectItem value="terminated">
                          <div className="flex items-center">
                            <XCircle className="w-4 h-4 mr-2 text-red-500" />
                            Terminated
                          </div>
                        </SelectItem>
                        <SelectItem value="pending">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-blue-500" />
                            Pending Activation
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Update Service
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showSuspensionDialog} onOpenChange={setShowSuspensionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {suspensionAction?.action === "suspend" ? (
                <>
                  <Pause className="w-5 h-5 mr-2 text-yellow-500" />
                  Suspend Service
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2 text-green-500" />
                  Reactivate Service
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {suspensionAction?.action === "suspend"
                ? "This will suspend the service on the router and prevent customer access. Please provide a reason:"
                : "This will reactivate the service on the router and restore customer access. Please provide a reason:"}
            </p>

            <div>
              <Label htmlFor="suspensionReason">Reason</Label>
              <Input
                id="suspensionReason"
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder={
                  suspensionAction?.action === "suspend"
                    ? "e.g., Non-payment, Policy violation, Maintenance"
                    : "e.g., Payment received, Issue resolved, Manual reactivation"
                }
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowSuspensionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmSuspensionAction}
              className={
                suspensionAction?.action === "suspend"
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {suspensionAction?.action === "suspend" ? "Suspend Service" : "Reactivate Service"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRouterLogs} onOpenChange={setShowRouterLogs}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Router Activity Logs
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {routerLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Router className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No router activity logs found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {routerLogs.map((log, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant={log.status === "success" ? "default" : "destructive"}>{log.action}</Badge>
                        <span className="text-sm text-gray-600">{log.service_type}</span>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(log.executed_at).toLocaleString()}</span>
                    </div>

                    {log.command_sent && (
                      <div className="text-xs bg-gray-50 p-2 rounded font-mono">
                        <strong>Command:</strong> {log.command_sent}
                      </div>
                    )}

                    {log.response_received && (
                      <div className="text-xs bg-blue-50 p-2 rounded">
                        <strong>Response:</strong> {log.response_received}
                      </div>
                    )}

                    {log.error_message && (
                      <div className="text-xs bg-red-50 p-2 rounded text-red-700">
                        <strong>Error:</strong> {log.error_message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

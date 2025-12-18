"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ArrowLeft,
  Plus,
  User,
  Wifi,
  CreditCard,
  BarChart3,
  FileText,
  MessageSquare,
  Headphones,
  Package,
  ClipboardList,
  Download,
  Upload,
  Edit,
  Play,
  Trash2,
} from "lucide-react"
import { CustomerBillingTab } from "@/components/customer-billing-tab"
import { CustomerStatisticsTab } from "@/components/customer-statistics-tab"
import { CustomerDocumentsTab } from "@/components/customer-documents-tab"
import { CustomerSupportTab } from "@/components/customer-support-tab"
import { CustomerCommunicationsTab } from "@/components/customer-communications-tab"
import CustomerEquipmentAssignment from "@/components/customer-equipment-assignment"
import { CustomerAuditLogTab } from "@/components/customer-audit-log-tab"
import AddServiceModal from "@/components/add-service-modal"
import { deleteCustomerService, updateServiceStatus } from "@/app/actions/customer-service-actions"
import { useToast } from "@/hooks/use-toast"

interface Customer {
  id: number
  account_number: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  postal_code: string
  country: string
  business_name?: string
  customer_type: string
  status: string
  created_at: string
  balance?: number
  portal_username?: string
  services?: Service[]
}

interface Service {
  id: number
  service_name: string
  service_type: string
  monthly_fee: number
  status: string
  start_date: string
  download_speed?: number
  upload_speed?: number
}

export default function CustomerPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const customerId = Number.parseInt(params.id)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("customer-info")
  const [addServiceModalOpen, setAddServiceModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!isNaN(customerId)) {
      fetchCustomerData()
    }

    const handleServiceAdded = (event: CustomEvent) => {
      console.log("[v0] === serviceAdded event received ===")
      console.log("[v0] Event customer ID:", event.detail.customerId)
      console.log("[v0] Current customer ID:", customerId)
      console.log("[v0] Timestamp:", new Date().toISOString())

      if (event.detail.customerId === customerId) {
        console.log("[v0] Refreshing customer data...")
        fetchCustomerData()
      }
    }

    window.addEventListener("serviceAdded", handleServiceAdded as EventListener)

    return () => {
      window.removeEventListener("serviceAdded", handleServiceAdded as EventListener)
    }
  }, [customerId])

  const fetchCustomerData = async () => {
    console.log("[v0] === fetchCustomerData called ===")
    console.log("[v0] Customer ID:", customerId)
    console.log("[v0] Timestamp:", new Date().toISOString())

    try {
      const response = await fetch(`/api/customers/${customerId}`)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Customer data fetched, services count:", data.services?.length || 0)
        setCustomer(data)
        setServices(data.services || [])
      }
    } catch (error) {
      console.error("Error fetching customer:", error)
    } finally {
      setLoading(false)
    }
  }

  if (isNaN(customerId)) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Invalid customer ID</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/customers")} className="mt-4">
          Back to Customers
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customer details...</p>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Customer not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  const customerName = customer.business_name || `${customer.first_name} ${customer.last_name}`
  const activeServices = services.filter((s) => s.status === "active" || s.status === "pending").length

  const handleEditService = (service: Service) => {
    setEditingService(service)
    setAddServiceModalOpen(true)
  }

  const handleActivateService = async (serviceId: number) => {
    if (!confirm("Are you sure you want to activate this service?")) {
      return
    }

    try {
      const result = await updateServiceStatus(serviceId, "active")

      if (result.success) {
        toast({
          title: "Success",
          description: "Service activated successfully",
        })
        fetchCustomerData()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to activate service",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error activating service:", error)
      toast({
        title: "Error",
        description: "Failed to activate service",
        variant: "destructive",
      })
    }
  }

  const handleDeleteService = async (serviceId: number) => {
    if (!confirm("Are you sure you want to delete this service? This action cannot be undone.")) {
      return
    }

    try {
      const result = await deleteCustomerService(serviceId)

      if (result.success) {
        toast({
          title: "Success",
          description: "Service deleted successfully",
        })
        fetchCustomerData()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete service",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting service:", error)
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/customers")}>
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{customerName}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Account: {customer.account_number}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="text-xs sm:text-sm bg-transparent">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Create </span>Ticket
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddServiceModalOpen(true)}
            className="text-xs sm:text-sm"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Add </span>Service
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Status</p>
            <Badge className="bg-black text-white hover:bg-black/90 text-xs">{customer.status}</Badge>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Type</p>
            <p className="text-sm sm:text-base lg:text-lg font-semibold truncate">
              {customer.customer_type || "company"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Balance</p>
            <p className="text-sm sm:text-base lg:text-lg font-semibold">KES {customer.balance || 0}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Services</p>
            <p className="text-sm sm:text-base lg:text-lg font-semibold">{activeServices} Active</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="bg-muted/50 inline-flex w-max sm:w-full">
            <TabsTrigger value="customer-info" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Customer </span>Info
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
              <Wifi className="h-3 w-3 sm:h-4 sm:w-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="statistics" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              Docs
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
              <Headphones className="h-3 w-3 sm:h-4 sm:w-4" />
              Support
            </TabsTrigger>
            <TabsTrigger value="communications" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
              <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="equipment" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
              <Package className="h-3 w-3 sm:h-4 sm:w-4" />
              Equipment
            </TabsTrigger>
            <TabsTrigger value="audit-log" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
              <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Audit </span>Log
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="customer-info" className="space-y-4">
          <Card>
            <CardContent className="pt-4 sm:pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Full Name</p>
                <p className="font-medium text-sm sm:text-base">{customerName}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Email</p>
                <p className="font-medium text-sm sm:text-base break-all">{customer.email}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Phone</p>
                <p className="font-medium text-sm sm:text-base">{customer.phone}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Address</p>
                <p className="font-medium text-sm sm:text-base">{customer.address}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">City</p>
                <p className="font-medium text-sm sm:text-base">{customer.city}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Country</p>
                <p className="font-medium text-sm sm:text-base">{customer.country}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4 sm:space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 sm:h-5 sm:w-5" />
                  <h2 className="text-lg sm:text-xl font-semibold">Internet Services</h2>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">Active and historical subscriptions</p>
              </div>
              <Button onClick={() => setAddServiceModalOpen(true)} size="sm" className="text-xs sm:text-sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Add Service
              </Button>
            </div>

            {services.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-sm sm:text-base text-muted-foreground">
                  No services found for this customer
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {services.map((service) => (
                  <Card key={service.id} className="border-l-4 border-l-gray-800">
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                            <h3 className="text-base sm:text-lg font-semibold">{service.service_name}</h3>
                            <Badge variant="secondary" className="bg-gray-600 text-white text-xs">
                              {service.status}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground">Service Plan</p>
                        </div>
                        <div className="flex flex-wrap gap-4 sm:gap-8">
                          <div className="text-left sm:text-right">
                            <p className="text-base sm:text-lg font-semibold">
                              KES {Number(service.monthly_fee || 0).toFixed(2)}/mo
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">Monthly Fee</p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="font-medium text-sm sm:text-base">
                              {new Date(service.start_date).toLocaleDateString()}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">Start Date</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 sm:gap-8 mb-4">
                        <div className="flex items-center gap-2">
                          <Download className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm sm:text-base lg:text-lg font-semibold">
                              {service.download_speed || 0} Mbps
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">Download</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Upload className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm sm:text-base lg:text-lg font-semibold">
                              {service.upload_speed || 0} Mbps
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">Upload</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
                        <Badge variant="secondary" className="bg-gray-600 text-white text-xs sm:text-sm">
                          {service.status}
                        </Badge>
                        <div className="flex-1"></div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditService(service)}
                          className="text-xs sm:text-sm"
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden xs:inline">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleActivateService(service.id)}
                          disabled={service.status === "active"}
                          className="text-xs sm:text-sm"
                        >
                          <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden xs:inline">Activate</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteService(service.id)}
                          className="text-xs sm:text-sm"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden xs:inline">Delete</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <CustomerBillingTab customerId={customerId} />
        </TabsContent>

        <TabsContent value="statistics">
          <CustomerStatisticsTab customerId={customerId} />
        </TabsContent>

        <TabsContent value="documents">
          <CustomerDocumentsTab customerId={customerId} />
        </TabsContent>

        <TabsContent value="support">
          <CustomerSupportTab customerId={customerId} />
        </TabsContent>

        <TabsContent value="communications">
          <CustomerCommunicationsTab customerId={customerId} />
        </TabsContent>

        <TabsContent value="equipment">
          <CustomerEquipmentAssignment customerId={customerId} />
        </TabsContent>

        <TabsContent value="audit-log">
          <CustomerAuditLogTab customerId={customerId} />
        </TabsContent>
      </Tabs>

      {customer && (
        <AddServiceModal
          open={addServiceModalOpen}
          onOpenChange={(open) => {
            setAddServiceModalOpen(open)
            if (!open) {
              setEditingService(null)
            }
          }}
          customerId={customerId}
          customerData={{
            name: customerName,
            email: customer.email,
            phone: customer.phone,
            portal_username: customer.portal_username || "",
          }}
          editMode={!!editingService}
          editingService={editingService || undefined}
        />
      )}
    </div>
  )
}

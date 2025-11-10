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
      fetchCustomer()
      fetchServices()
    }
  }, [customerId])

  const fetchCustomer = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`)
      if (response.ok) {
        const data = await response.json()
        setCustomer(data)
      }
    } catch (error) {
      console.error("Error fetching customer:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async () => {
    try {
      const response = await fetch(`/api/customer-services?customer_id=${customerId}`)
      if (response.ok) {
        const data = await response.json()
        setServices(data.services || [])
      }
    } catch (error) {
      console.error("Error fetching services:", error)
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
        fetchServices()
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
        fetchServices()
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/customers")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{customerName}</h1>
            <p className="text-sm text-muted-foreground">Account: {customer.account_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create Ticket
          </Button>
          <Button variant="outline" onClick={() => setAddServiceModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Status</p>
            <Badge className="bg-black text-white hover:bg-black/90">{customer.status}</Badge>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Type</p>
            <p className="text-lg font-semibold">{customer.customer_type || "company"}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Balance</p>
            <p className="text-lg font-semibold">KES {customer.balance || 0}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Services</p>
            <p className="text-lg font-semibold">{activeServices} Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="customer-info" className="gap-2">
            <User className="h-4 w-4" />
            Customer Info
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2">
            <Wifi className="h-4 w-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="statistics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-2">
            <Headphones className="h-4 w-4" />
            Support
          </TabsTrigger>
          <TabsTrigger value="communications" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Communications
          </TabsTrigger>
          <TabsTrigger value="equipment" className="gap-2">
            <Package className="h-4 w-4" />
            Equipment
          </TabsTrigger>
          <TabsTrigger value="audit-log" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customer-info" className="space-y-4">
          <Card>
            <CardContent className="pt-6 grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Full Name</p>
                <p className="font-medium">{customerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                <p className="font-medium">{customer.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Phone</p>
                <p className="font-medium">{customer.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Address</p>
                <p className="font-medium">{customer.address}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">City</p>
                <p className="font-medium">{customer.city}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Country</p>
                <p className="font-medium">{customer.country}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Internet Services</h2>
                </div>
                <p className="text-sm text-muted-foreground">Active and historical internet service subscriptions</p>
              </div>
              <Button onClick={() => setAddServiceModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </div>

            {services.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No services found for this customer
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {services.map((service) => (
                  <Card key={service.id} className="border-l-4 border-l-gray-800">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-semibold">{service.service_name}</h3>
                            <Badge variant="secondary" className="bg-gray-600 text-white">
                              {service.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Service Plan</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">
                            KES {Number(service.monthly_fee || 0).toFixed(2)}/month
                          </p>
                          <p className="text-sm text-muted-foreground">Monthly Fee</p>
                        </div>
                        <div className="text-right ml-8">
                          <Badge variant="secondary" className="bg-gray-600 text-white mb-1">
                            {service.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground">Status</p>
                        </div>
                        <div className="text-right ml-8">
                          <p className="font-medium">{new Date(service.start_date).toLocaleDateString()}</p>
                          <p className="text-sm text-muted-foreground">Start Date</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8 mb-4">
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-lg font-semibold">{service.download_speed || 0} Mbps</p>
                            <p className="text-sm text-muted-foreground">Download Speed</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-lg font-semibold">{service.upload_speed || 0} Mbps</p>
                            <p className="text-sm text-muted-foreground">Upload Speed</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-4 border-t">
                        <Badge variant="secondary" className="bg-gray-600 text-white">
                          {service.status}
                        </Badge>
                        <div className="flex-1"></div>
                        <Button variant="ghost" size="sm" onClick={() => handleEditService(service)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleActivateService(service.id)}
                          disabled={service.status === "active"}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Activate
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteService(service.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
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
              fetchServices()
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

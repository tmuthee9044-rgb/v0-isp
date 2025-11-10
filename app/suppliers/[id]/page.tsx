"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  Edit,
  Package,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  FileText,
  Download,
  Send,
  Trash2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Supplier {
  id: number
  supplier_code: string
  company_name: string
  contact_person: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  supplier_type: string
  status: string
  total_orders: number
  total_order_value: number
  active_orders: number
  created_at: string
}

interface PurchaseOrder {
  id: number
  order_number: string
  status: string
  total_amount: number
  created_at: string
  items: any[]
}

interface SupplierInvoice {
  id: number
  invoice_number: string
  invoice_date: string
  due_date: string
  total_amount: number
  paid_amount: number
  status: string
  po_number: string
  items: any[]
}

export default function SupplierDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const supplierId = params.id as string

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Supplier>>({})
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [receivingItems, setReceivingItems] = useState<{ [key: number]: number }>({})

  const [showEditInvoiceModal, setShowEditInvoiceModal] = useState(false)
  const [showEmailInvoiceModal, setShowEmailInvoiceModal] = useState(false)
  const [showDeleteInvoiceDialog, setShowDeleteInvoiceDialog] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null)
  const [editInvoiceForm, setEditInvoiceForm] = useState({
    due_date: "",
    notes: "",
    status: "",
  })
  const [emailForm, setEmailForm] = useState({
    recipient_email: "",
    subject: "",
    message: "",
  })

  useEffect(() => {
    if (supplierId) {
      fetchSupplierDetails()
      fetchPurchaseOrders()
      fetchSupplierInvoices()
    }
  }, [supplierId])

  const fetchSupplierDetails = async () => {
    try {
      console.log("[v0] Fetching supplier details for ID:", supplierId)
      const response = await fetch(`/api/suppliers/${supplierId}`)

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        let errorMessage = `HTTP ${response.status}`

        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch (jsonError) {
            console.error("[v0] Failed to parse error JSON:", jsonError)
          }
        } else {
          // Handle HTML error pages
          const errorText = await response.text()
          console.error("[v0] Non-JSON error response:", errorText)
          errorMessage = "Server returned an error page instead of JSON data"
        }

        throw new Error(errorMessage)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text()
        console.error("[v0] Expected JSON but got:", contentType, responseText.substring(0, 100))
        throw new Error("Server returned non-JSON response")
      }

      const data = await response.json()
      console.log("[v0] Supplier data received:", data)

      if (data.success && data.supplier) {
        setSupplier(data.supplier)
        setEditForm(data.supplier)
      } else {
        throw new Error(data.error || "Failed to load supplier")
      }
    } catch (error) {
      console.error("Error fetching supplier details:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load supplier details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPurchaseOrders = async () => {
    try {
      console.log("[v0] Fetching purchase orders for supplier:", supplierId)
      const response = await fetch(`/api/purchase-orders?supplier_id=${supplierId}`)

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        let errorMessage = `HTTP ${response.status}`

        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch (jsonError) {
            console.error("[v0] Failed to parse error JSON:", jsonError)
          }
        } else {
          // Handle HTML error pages
          const errorText = await response.text()
          console.error("[v0] Non-JSON error response:", errorText)
          errorMessage = "Server returned an error page instead of JSON data"
        }

        throw new Error(errorMessage)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text()
        console.error("[v0] Expected JSON but got:", contentType, responseText.substring(0, 100))
        throw new Error("Server returned non-JSON response")
      }

      const data = await response.json()
      console.log("[v0] Purchase orders data received:", data)

      if (data.success) {
        setPurchaseOrders(data.purchase_orders || [])
      } else {
        throw new Error(data.error || "Failed to load purchase orders")
      }
    } catch (error) {
      console.error("Error fetching purchase orders:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load purchase orders",
        variant: "destructive",
      })
    }
  }

  const fetchSupplierInvoices = async () => {
    try {
      console.log("[v0] Fetching supplier invoices for supplier:", supplierId)
      const response = await fetch(`/api/suppliers/${supplierId}/invoices`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Supplier invoices data received:", data)

      if (data.success) {
        setSupplierInvoices(data.invoices || [])
      }
    } catch (error) {
      console.error("Error fetching supplier invoices:", error)
      toast({
        title: "Error",
        description: "Failed to load supplier invoices",
        variant: "destructive",
      })
    }
  }

  const handleUpdateSupplier = async () => {
    try {
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        setShowEditModal(false)
        fetchSupplierDetails()
        toast.success("Supplier updated successfully")
      } else {
        toast.error("Failed to update supplier")
      }
    } catch (error) {
      console.error("Error updating supplier:", error)
      toast.error("Failed to update supplier")
    }
  }

  const handleReceivePO = async (po: PurchaseOrder) => {
    try {
      // Prepare items array with quantities
      const items = po.items.map((item) => ({
        purchase_order_item_id: item.id,
        quantity_received: receivingItems[item.id] || item.quantity, // Use specified quantity or full quantity
      }))

      console.log("[v0] Receiving PO with items:", items)

      const response = await fetch(`/api/purchase-orders/${po.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          user_id: 1, // TODO: Get from session
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to receive purchase order")
      }

      const data = await response.json()
      toast({
        title: "Success",
        description: `Purchase order received and invoice ${data.data.invoice_number} generated`,
      })

      // Reset state and refresh data
      setShowReceiveModal(false)
      setSelectedPO(null)
      setReceivingItems({})
      fetchPurchaseOrders()
      fetchSupplierInvoices()
    } catch (error) {
      console.error("Error receiving PO:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to receive purchase order",
        variant: "destructive",
      })
    }
  }

  const openReceiveModal = (po: PurchaseOrder) => {
    setSelectedPO(po)
    // Initialize receiving quantities with ordered quantities
    const initialQuantities: { [key: number]: number } = {}
    po.items.forEach((item) => {
      initialQuantities[item.id] = item.quantity
    })
    setReceivingItems(initialQuantities)
    setShowReceiveModal(true)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { variant: "secondary" as const, icon: Clock },
      APPROVED: { variant: "default" as const, icon: CheckCircle },
      RECEIVED: { variant: "default" as const, icon: Package },
      CANCELLED: { variant: "destructive" as const, icon: XCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  const handleEditInvoice = async () => {
    if (!selectedInvoice) return

    try {
      const response = await fetch(`/api/suppliers/${supplierId}/invoices/${selectedInvoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editInvoiceForm),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update invoice")
      }

      toast({
        title: "Success",
        description: "Invoice updated successfully",
      })

      setShowEditInvoiceModal(false)
      setSelectedInvoice(null)
      fetchSupplierInvoices()
    } catch (error) {
      console.error("Error updating invoice:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update invoice",
        variant: "destructive",
      })
    }
  }

  const handleEmailInvoice = async () => {
    if (!selectedInvoice) return

    try {
      const response = await fetch(`/api/suppliers/${supplierId}/invoices/${selectedInvoice.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailForm),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to send invoice email")
      }

      const data = await response.json()

      toast({
        title: "Success",
        description: data.message,
      })

      setShowEmailInvoiceModal(false)
      setSelectedInvoice(null)
      setEmailForm({ recipient_email: "", subject: "", message: "" })
    } catch (error) {
      console.error("Error sending invoice email:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send invoice email",
        variant: "destructive",
      })
    }
  }

  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return

    try {
      const response = await fetch(`/api/suppliers/${supplierId}/invoices/${selectedInvoice.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete invoice")
      }

      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      })

      setShowDeleteInvoiceDialog(false)
      setSelectedInvoice(null)
      fetchSupplierInvoices()
    } catch (error) {
      console.error("Error deleting invoice:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete invoice",
        variant: "destructive",
      })
    }
  }

  const openEditInvoiceModal = (invoice: SupplierInvoice) => {
    setSelectedInvoice(invoice)
    setEditInvoiceForm({
      due_date: invoice.due_date,
      notes: "",
      status: invoice.status,
    })
    setShowEditInvoiceModal(true)
  }

  const openEmailInvoiceModal = (invoice: SupplierInvoice) => {
    setSelectedInvoice(invoice)
    setEmailForm({
      recipient_email: supplier?.email || "",
      subject: `Invoice ${invoice.invoice_number}`,
      message: `Dear ${supplier?.company_name},\n\nPlease find attached invoice ${invoice.invoice_number} for your review.\n\nThank you for your business.`,
    })
    setShowEmailInvoiceModal(true)
  }

  const openDeleteInvoiceDialog = (invoice: SupplierInvoice) => {
    setSelectedInvoice(invoice)
    setShowDeleteInvoiceDialog(true)
  }

  const getInvoiceStatusBadge = (invoice: SupplierInvoice) => {
    const paidAmount = Number(invoice.paid_amount || 0)
    const totalAmount = Number(invoice.total_amount)

    let status = invoice.status
    let variant: "default" | "secondary" | "destructive" = "secondary"

    if (paidAmount >= totalAmount) {
      status = "PAID"
      variant = "default"
    } else if (paidAmount > 0) {
      status = "PARTIALLY PAID"
      variant = "secondary"
    } else if (new Date(invoice.due_date) < new Date()) {
      status = "OVERDUE"
      variant = "destructive"
    } else {
      status = "UNPAID"
      variant = "secondary"
    }

    return <Badge variant={variant}>{status}</Badge>
  }

  const pendingOrders = purchaseOrders.filter((po) => po.status === "PENDING")
  const approvedOrders = purchaseOrders.filter((po) => po.status === "APPROVED")
  const receivedOrders = purchaseOrders.filter((po) => po.status === "RECEIVED")

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading supplier details...</div>
  }

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Supplier not found</h3>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{supplier.company_name}</h1>
            <p className="text-muted-foreground">Supplier Details & Management</p>
          </div>
        </div>
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogTrigger asChild>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Supplier</DialogTitle>
              <DialogDescription>Update supplier information</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={editForm.company_name || ""}
                  onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={editForm.contact_person || ""}
                  onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editForm.email || ""}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editForm.phone || ""}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={editForm.address || ""}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={editForm.city || ""}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={editForm.country || ""}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier_type">Supplier Type</Label>
                <Select
                  value={editForm.supplier_type || ""}
                  onValueChange={(value) => setEditForm({ ...editForm, supplier_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="service_provider">Service Provider</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editForm.status || ""}
                  onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateSupplier}>Update Supplier</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Supplier Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Supplier Information
            </CardTitle>
            <Badge variant={supplier.status === "active" ? "default" : "secondary"}>{supplier.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium">Type:</span>
                <span className="ml-2">{supplier.supplier_type}</span>
              </div>
              {supplier.contact_person && (
                <div className="flex items-center text-sm">
                  <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">Contact:</span>
                  <span className="ml-2">{supplier.contact_person}</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {supplier.phone && (
                <div className="flex items-center text-sm">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">Phone:</span>
                  <span className="ml-2">{supplier.phone}</span>
                </div>
              )}
              {supplier.email && (
                <div className="flex items-center text-sm">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">Email:</span>
                  <span className="ml-2">{supplier.email}</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {supplier.city && (
                <div className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">Location:</span>
                  <span className="ml-2">
                    {supplier.city}, {supplier.country}
                  </span>
                </div>
              )}
              <div className="flex items-center text-sm">
                <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium">Total Value:</span>
                <span className="ml-2">KES {(supplier.total_order_value || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{supplier.total_orders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold">{pendingOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Approved Orders</p>
                <p className="text-2xl font-bold">{approvedOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Received Orders</p>
                <p className="text-2xl font-bold">{receivedOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receive PO Modal */}
      <Dialog open={showReceiveModal} onOpenChange={setShowReceiveModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive Purchase Order</DialogTitle>
            <DialogDescription>{selectedPO && `Receiving items for ${selectedPO.order_number}`}</DialogDescription>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Receiving</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPO.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.item_name || "Unknown Item"}</TableCell>
                        <TableCell>{item.sku || "-"}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={receivingItems[item.id] || item.quantity}
                            onChange={(e) =>
                              setReceivingItems({
                                ...receivingItems,
                                [item.id]: Number.parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-20 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right">KES {(item.unit_cost || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          KES {((receivingItems[item.id] || item.quantity) * (item.unit_cost || 0)).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span className="font-medium">Total Receiving Value:</span>
                <span className="text-xl font-bold">
                  KES{" "}
                  {selectedPO.items
                    .reduce((sum, item) => sum + (receivingItems[item.id] || item.quantity) * (item.unit_cost || 0), 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowReceiveModal(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleReceivePO(selectedPO)}>
                  <Package className="h-4 w-4 mr-2" />
                  Receive & Generate Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEditInvoiceModal} onOpenChange={setShowEditInvoiceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              {selectedInvoice && `Editing invoice ${selectedInvoice.invoice_number}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={editInvoiceForm.due_date}
                onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={editInvoiceForm.status}
                onValueChange={(value) => setEditInvoiceForm({ ...editInvoiceForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editInvoiceForm.notes}
                onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEditInvoiceModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditInvoice}>Update Invoice</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEmailInvoiceModal} onOpenChange={setShowEmailInvoiceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Invoice</DialogTitle>
            <DialogDescription>
              {selectedInvoice && `Send invoice ${selectedInvoice.invoice_number} via email`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient_email">Recipient Email</Label>
              <Input
                id="recipient_email"
                type="email"
                value={emailForm.recipient_email}
                onChange={(e) => setEmailForm({ ...emailForm, recipient_email: e.target.value })}
                placeholder="supplier@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={emailForm.message}
                onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                rows={5}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEmailInvoiceModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEmailInvoice}>
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteInvoiceDialog} onOpenChange={setShowDeleteInvoiceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedInvoice &&
                `Are you sure you want to delete invoice ${selectedInvoice.invoice_number}? This action cannot be undone.`}
              {selectedInvoice && Number(selectedInvoice.paid_amount) > 0 && (
                <div className="mt-2 p-2 bg-destructive/10 text-destructive rounded">
                  Warning: This invoice has payments recorded. Please remove payments before deleting.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInvoice} className="bg-destructive text-destructive-foreground">
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Purchase Orders Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Orders ({purchaseOrders.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingOrders.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedOrders.length})</TabsTrigger>
          <TabsTrigger value="received">Received ({receivedOrders.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({supplierInvoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4">
            {purchaseOrders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()} • {order.items?.length || 0} items
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">KES {(order.total_amount || 0).toLocaleString()}</p>
                      </div>
                      {getStatusBadge(order.status)}
                      {order.status === "APPROVED" && (
                        <Button size="sm" onClick={() => openReceiveModal(order)}>
                          <Package className="h-4 w-4 mr-2" />
                          Receive
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <div className="grid gap-4">
            {pendingOrders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()} • {order.items?.length || 0} items
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">KES {(order.total_amount || 0).toLocaleString()}</p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <div className="grid gap-4">
            {approvedOrders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()} • {order.items?.length || 0} items
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">KES {(order.total_amount || 0).toLocaleString()}</p>
                      </div>
                      {getStatusBadge(order.status)}
                      <Button size="sm" onClick={() => openReceiveModal(order)}>
                        <Package className="h-4 w-4 mr-2" />
                        Receive
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="received" className="space-y-4">
          <div className="grid gap-4">
            {receivedOrders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()} • {order.items?.length || 0} items
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">KES {(order.total_amount || 0).toLocaleString()}</p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Supplier Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {supplierInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        PO: {invoice.po_number} • Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">{invoice.items?.length || 0} items</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">KES {(invoice.total_amount || 0).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          Paid: KES {(invoice.paid_amount || 0).toLocaleString()}
                        </p>
                      </div>
                      {getInvoiceStatusBadge(invoice)}
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            window.open(`/api/suppliers/${supplierId}/invoices/${invoice.id}/pdf`, "_blank")
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEmailInvoiceModal(invoice)}>
                          <Send className="h-4 w-4 mr-2" />
                          Email
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEditInvoiceModal(invoice)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDeleteInvoiceDialog(invoice)}
                          disabled={Number(invoice.paid_amount) > 0}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {supplierInvoices.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium mb-1">No invoices generated yet</p>
                    <p className="text-sm">Invoices are automatically created when purchase orders are received.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {purchaseOrders.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No purchase orders found</h3>
          <p className="text-muted-foreground">This supplier doesn't have any purchase orders yet.</p>
        </div>
      )}
    </div>
  )
}

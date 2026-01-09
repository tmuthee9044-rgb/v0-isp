"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Eye, Trash2, CheckCircle, XCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface PurchaseOrder {
  id: number
  order_number: string
  supplier_id: string
  supplier_name: string
  supplier_contact?: string
  status: "PENDING" | "APPROVED" | "RECEIVED" | "CANCELLED"
  total_amount: number
  notes?: string
  created_by: number
  created_by_name?: string
  created_at: string
  updated_at: string
  total_items: number
  items: PurchaseOrderItem[]
}

interface Supplier {
  id: string
  company_name: string
  contact_name: string
  email: string
  phone: string
}

interface PurchaseOrderItem {
  id?: number
  inventory_item_id: number
  item_name: string
  sku?: string
  category?: string
  quantity: number
  unit_cost: number
  total_cost: number
}

interface InventoryItem {
  id: number
  name: string
  sku: string
  stock_quantity: number
  unit_cost: number
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [supplierFilter, setSupplierFilter] = useState<string>("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)

  const [newPO, setNewPO] = useState({
    supplier_id: "",
    status: "PENDING",
    notes: "",
    items: [] as Omit<PurchaseOrderItem, "id">[],
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      console.log("[v0] Starting to load purchase orders data")

      // Load purchase orders
      const poResponse = await fetch("/api/purchase-orders")
      console.log("[v0] Purchase orders response status:", poResponse.status)
      if (poResponse.ok) {
        const poData = await poResponse.json()
        console.log("[v0] Purchase orders data:", poData)
        setPurchaseOrders(poData.purchase_orders || [])
      } else {
        console.error("[v0] Failed to fetch purchase orders:", await poResponse.text())
      }

      // Load suppliers
      const suppliersResponse = await fetch("/api/suppliers")
      console.log("[v0] Suppliers response status:", suppliersResponse.status)
      if (suppliersResponse.ok) {
        const suppliersData = await suppliersResponse.json()
        console.log("[v0] Suppliers data:", suppliersData)
        setSuppliers(suppliersData.suppliers || [])
      } else {
        console.error("[v0] Failed to fetch suppliers:", await suppliersResponse.text())
      }

      // Load inventory items
      const inventoryResponse = await fetch("/api/inventory")
      console.log("[v0] Inventory response status:", inventoryResponse.status)
      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json()
        console.log("[v0] Inventory data:", inventoryData)
        setInventoryItems(inventoryData.data?.items || [])
      } else {
        console.error("[v0] Failed to fetch inventory:", await inventoryResponse.text())
      }
    } catch (error) {
      console.error("[v0] Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load purchase orders data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      console.log("[v0] Finished loading data")
    }
  }

  const handleOpenCreateModal = () => {
    setNewPO({
      supplier_id: "",
      status: "PENDING",
      notes: "",
      items: [],
    })
    setShowCreateModal(true)
  }

  const addItemToPO = () => {
    setNewPO({
      ...newPO,
      items: [
        ...newPO.items,
        {
          inventory_item_id: 0,
          item_name: "",
          quantity: 1,
          unit_cost: 0,
          total_cost: 0,
        },
      ],
    })
  }

  const updatePOItem = (index: number, field: keyof Omit<PurchaseOrderItem, "id">, value: any) => {
    const updatedItems = [...newPO.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }

    // Calculate total cost for the item
    if (field === "quantity" || field === "unit_cost") {
      updatedItems[index].total_cost = updatedItems[index].quantity * updatedItems[index].unit_cost
    }

    // Update item details when inventory item is selected
    if (field === "inventory_item_id") {
      const selectedItem = inventoryItems.find((item) => item.id === value)
      if (selectedItem) {
        updatedItems[index].item_name = selectedItem.name
        updatedItems[index].unit_cost = selectedItem.unit_cost
        updatedItems[index].total_cost = updatedItems[index].quantity * selectedItem.unit_cost
      }
    }

    setNewPO({ ...newPO, items: updatedItems })
  }

  const removePOItem = (index: number) => {
    const updatedItems = newPO.items.filter((_, i) => i !== index)
    setNewPO({ ...newPO, items: updatedItems })
  }

  const calculateTotalAmount = () => {
    return newPO.items.reduce((sum, item) => sum + item.total_cost, 0)
  }

  const handleCreatePO = async () => {
    try {
      if (!newPO.supplier_id) {
        toast({
          title: "Validation Error",
          description: "Please select a supplier",
          variant: "destructive",
        })
        return
      }

      if (newPO.items.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please add at least one item to the purchase order",
          variant: "destructive",
        })
        return
      }

      // Validate all items have required fields
      for (const item of newPO.items) {
        if (!item.inventory_item_id || item.quantity <= 0 || item.unit_cost <= 0) {
          toast({
            title: "Validation Error",
            description: "All items must have valid inventory item, quantity, and unit cost",
            variant: "destructive",
          })
          return
        }
      }

      const response = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplier_id: newPO.supplier_id,
          status: newPO.status,
          notes: newPO.notes,
          items: newPO.items,
          created_by: 1, // TODO: Get from auth context
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Purchase order created successfully",
        })
        setShowCreateModal(false)
        setNewPO({
          supplier_id: "",
          status: "PENDING",
          notes: "",
          items: [],
        })
        loadData()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to create purchase order",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating purchase order:", error)
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive",
      })
    }
  }

  const handleStatusUpdate = async (poId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${poId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Purchase order ${newStatus.toLowerCase()} successfully`,
        })
        loadData()
        if (selectedPO && selectedPO.id === poId) {
          setShowDetailsModal(false)
          setSelectedPO(null)
        }
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to update purchase order",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating purchase order:", error)
      toast({
        title: "Error",
        description: "Failed to update purchase order",
        variant: "destructive",
      })
    }
  }

  const handleViewDetails = async (poId: number) => {
    try {
      const response = await fetch(`/api/purchase-orders/${poId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedPO(data.purchase_order)
        setShowDetailsModal(true)
      } else {
        toast({
          title: "Error",
          description: "Failed to load purchase order details",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading purchase order details:", error)
      toast({
        title: "Error",
        description: "Failed to load purchase order details",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-blue-100 text-blue-800",
      RECEIVED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    }

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    )
  }

  const filteredPurchaseOrders = purchaseOrders.filter((po) => {
    const matchesSearch =
      po.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || po.status === statusFilter
    const matchesSupplier = supplierFilter === "all" || po.supplier_id === supplierFilter

    return matchesSearch && matchesStatus && matchesSupplier
  })

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading purchase orders...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage supplier purchase orders and procurement</p>
        </div>

        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              New Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Purchase Order</DialogTitle>
              <DialogDescription>
                Create a new purchase order for inventory procurement. PO number will be auto-generated.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Auto-generated PO number display */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="text-sm font-medium text-blue-800">
                    PO Number: <span className="font-mono">Auto-generated on save</span>
                  </div>
                </div>
                <div className="text-xs text-blue-600 mt-1">Creation Date: {new Date().toLocaleDateString()}</div>
              </div>

              <div>
                <Label htmlFor="supplier">Supplier *</Label>
                <Select value={newPO.supplier_id} onValueChange={(value) => setNewPO({ ...newPO, supplier_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {suppliers.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No suppliers found. Please add suppliers first.</p>
                )}
              </div>

              {/* Status field */}
              <div>
                <Label>Status</Label>
                <div className="p-2 bg-yellow-50 rounded border">
                  <Badge className="bg-yellow-100 text-yellow-800">PENDING</Badge>
                  <span className="text-xs text-muted-foreground ml-2">New purchase orders start as PENDING</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>Items *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItemToPO}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                {newPO.items.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-muted-foreground">No items added yet</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addItemToPO}
                      className="mt-2 bg-transparent"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Item
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {newPO.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-5 gap-4 p-4 border rounded-lg">
                        <div>
                          <Label>Item</Label>
                          <Select
                            value={item.inventory_item_id.toString()}
                            onValueChange={(value) => updatePOItem(index, "inventory_item_id", Number.parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {inventoryItems.map((invItem) => (
                                <SelectItem key={invItem.id} value={invItem.id.toString()}>
                                  <div className="flex flex-col">
                                    <span>{invItem.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      Stock: {invItem.stock_quantity} • KES {invItem.unit_cost}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updatePOItem(index, "quantity", Number.parseInt(e.target.value) || 1)}
                          />
                        </div>

                        <div>
                          <Label>Unit Cost (KES)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_cost}
                            onChange={(e) => updatePOItem(index, "unit_cost", Number.parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div>
                          <Label>Total Cost</Label>
                          <Input
                            type="text"
                            value={`KES ${item.total_cost.toFixed(2)}`}
                            disabled
                            className="bg-gray-50"
                          />
                        </div>

                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removePOItem(index)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-end">
                      <div className="text-right">
                        <Label className="text-lg font-semibold">Total Amount</Label>
                        <div className="text-2xl font-bold text-green-600">KES {calculateTotalAmount().toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes or requirements..."
                  value={newPO.notes}
                  onChange={(e) => setNewPO({ ...newPO, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePO}>Create Purchase Order</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.filter((po) => po.status === "PENDING").length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.filter((po) => po.status === "APPROVED").length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {purchaseOrders.reduce((sum, po) => sum + po.total_amount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by PO number or supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="RECEIVED">Received</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="supplier-filter">Supplier</Label>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders ({filteredPurchaseOrders.length})</CardTitle>
          <CardDescription>Manage and track all purchase orders</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchaseOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchTerm || statusFilter !== "all" || supplierFilter !== "all"
                        ? "No purchase orders match your filters"
                        : "No purchase orders found"}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurchaseOrders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.order_number}</TableCell>
                    <TableCell>{po.supplier_name}</TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell>{po.total_items} items</TableCell>
                    <TableCell>KES {po.total_amount.toLocaleString()}</TableCell>
                    <TableCell>{new Date(po.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(po.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {po.status === "PENDING" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusUpdate(po.id, "APPROVED")}
                            className="text-blue-600"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {po.status === "APPROVED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusUpdate(po.id, "RECEIVED")}
                            className="text-green-600"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {(po.status === "PENDING" || po.status === "APPROVED") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusUpdate(po.id, "CANCELLED")}
                            className="text-red-600"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Purchase Order Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
            <DialogDescription>
              {selectedPO && `${selectedPO.order_number} - ${selectedPO.supplier_name}`}
            </DialogDescription>
          </DialogHeader>

          {selectedPO && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>PO Number</Label>
                  <div className="font-medium">{selectedPO.order_number}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div>{getStatusBadge(selectedPO.status)}</div>
                </div>
                <div>
                  <Label>Supplier</Label>
                  <div className="font-medium">{selectedPO.supplier_name}</div>
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <div className="font-medium text-green-600">KES {selectedPO.total_amount.toLocaleString()}</div>
                </div>
                <div>
                  <Label>Created</Label>
                  <div>{new Date(selectedPO.created_at).toLocaleDateString()}</div>
                </div>
                <div>
                  <Label>Created By</Label>
                  <div>{selectedPO.created_by_name || "Unknown"}</div>
                </div>
              </div>

              {selectedPO.notes && (
                <div>
                  <Label>Notes</Label>
                  <div className="p-3 bg-gray-50 rounded-md">{selectedPO.notes}</div>
                </div>
              )}

              <div>
                <Label className="text-lg font-semibold">Items ({selectedPO.items.length})</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPO.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>{item.sku || "N/A"}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>KES {item.unit_cost.toLocaleString()}</TableCell>
                        <TableCell>KES {item.total_cost.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between">
                <div className="space-x-2">
                  {selectedPO.status === "PENDING" && (
                    <>
                      <Button
                        onClick={() => handleStatusUpdate(selectedPO.id, "APPROVED")}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Order
                      </Button>
                      <Button variant="destructive" onClick={() => handleStatusUpdate(selectedPO.id, "CANCELLED")}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Order
                      </Button>
                    </>
                  )}
                  {selectedPO.status === "APPROVED" && (
                    <>
                      <Button
                        onClick={() => handleStatusUpdate(selectedPO.id, "RECEIVED")}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Received
                      </Button>
                      <Button variant="destructive" onClick={() => handleStatusUpdate(selectedPO.id, "CANCELLED")}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Order
                      </Button>
                    </>
                  )}
                </div>
                <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

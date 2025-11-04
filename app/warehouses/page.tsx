"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Warehouse, MapPin, Package, AlertTriangle, Edit, Trash2, Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

interface WarehouseData {
  id: number
  warehouse_code: string
  name: string
  code: string
  location: string
  contact_person: string
  phone: string
  email: string
  status: string
  total_items: number
  total_stock: number
  total_reserved: number
  available_stock: number
  total_value: number
  low_stock_items: number
  created_at: string
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseData | null>(null)
  const { toast } = useToast()

  const [newWarehouse, setNewWarehouse] = useState({
    name: "",
    location: "",
    contact_person: "",
    phone: "",
    email: "",
  })

  useEffect(() => {
    fetchWarehouses()
  }, [])

  const fetchWarehouses = async () => {
    try {
      const response = await fetch("/api/warehouses")
      const data = await response.json()
      if (data.success) {
        setWarehouses(data.warehouses)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch warehouses",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching warehouses:", error)
      toast({
        title: "Error",
        description: "Failed to fetch warehouses",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddWarehouse = async () => {
    if (!newWarehouse.name.trim()) {
      toast({
        title: "Error",
        description: "Warehouse name is required",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWarehouse),
      })

      const data = await response.json()

      if (data.success) {
        setShowAddModal(false)
        setNewWarehouse({
          name: "",
          location: "",
          contact_person: "",
          phone: "",
          email: "",
        })
        fetchWarehouses()
        toast({
          title: "Success",
          description: "Warehouse created successfully",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create warehouse",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding warehouse:", error)
      toast({
        title: "Error",
        description: "Failed to create warehouse",
        variant: "destructive",
      })
    }
  }

  const handleEditWarehouse = async () => {
    if (!editingWarehouse || !editingWarehouse.name.trim()) {
      toast({
        title: "Error",
        description: "Warehouse name is required",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/warehouses/${editingWarehouse.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingWarehouse.name,
          location: editingWarehouse.location,
          contact_person: editingWarehouse.contact_person,
          phone: editingWarehouse.phone,
          email: editingWarehouse.email,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setEditingWarehouse(null)
        fetchWarehouses()
        toast({
          title: "Success",
          description: "Warehouse updated successfully",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update warehouse",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating warehouse:", error)
      toast({
        title: "Error",
        description: "Failed to update warehouse",
        variant: "destructive",
      })
    }
  }

  const handleDeleteWarehouse = async (warehouse: WarehouseData) => {
    if (!confirm(`Are you sure you want to delete "${warehouse.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/warehouses/${warehouse.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        fetchWarehouses()
        toast({
          title: "Success",
          description: "Warehouse deleted successfully",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete warehouse",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting warehouse:", error)
      toast({
        title: "Error",
        description: "Failed to delete warehouse",
        variant: "destructive",
      })
    }
  }

  const filteredWarehouses = warehouses.filter(
    (warehouse) =>
      warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.code?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading warehouses...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Warehouses</h1>
          <p className="text-muted-foreground">Manage your warehouse locations and inventory storage</p>
        </div>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Warehouse
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Warehouse</DialogTitle>
              <DialogDescription>Enter warehouse information to add a new storage location</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Warehouse Name *</Label>
                <Input
                  id="name"
                  value={newWarehouse.name}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                  placeholder="e.g., Main Warehouse"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newWarehouse.location}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, location: e.target.value })}
                  placeholder="e.g., Industrial Area, Nairobi"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={newWarehouse.contact_person}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, contact_person: e.target.value })}
                  placeholder="e.g., John Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newWarehouse.phone}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, phone: e.target.value })}
                    placeholder="e.g., +254 700 000 000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newWarehouse.email}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, email: e.target.value })}
                    placeholder="e.g., warehouse@company.com"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddWarehouse}>Add Warehouse</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search warehouses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWarehouses.map((warehouse) => (
          <Card key={warehouse.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{warehouse.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={warehouse.status === "active" ? "default" : "secondary"}>{warehouse.status}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingWarehouse(warehouse)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteWarehouse(warehouse)} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <CardDescription>{warehouse.code || "Auto-generated code"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {warehouse.location && (
                <div className="flex items-start text-sm">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground mt-0.5" />
                  <div>{warehouse.location}</div>
                </div>
              )}

              {warehouse.contact_person && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Contact: </span>
                  <span>{warehouse.contact_person}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Package className="h-4 w-4 mr-1 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold">{warehouse.total_items}</div>
                  <div className="text-xs text-muted-foreground">Items</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Warehouse className="h-4 w-4 mr-1 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold">{warehouse.total_stock}</div>
                  <div className="text-xs text-muted-foreground">Total Stock</div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available:</span>
                  <span className="font-medium">{warehouse.available_stock}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reserved:</span>
                  <span className="font-medium">{warehouse.total_reserved}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Value:</span>
                  <span className="font-medium">KES {warehouse.total_value.toLocaleString()}</span>
                </div>
              </div>

              {warehouse.low_stock_items > 0 && (
                <div className="flex items-center text-sm text-amber-600 bg-amber-50 p-2 rounded">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {warehouse.low_stock_items} items low on stock
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredWarehouses.length === 0 && (
        <div className="text-center py-12">
          <Warehouse className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No warehouses found</h3>
          <p className="text-muted-foreground mb-4">Get started by adding your first warehouse</p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Warehouse
          </Button>
        </div>
      )}

      <Dialog open={!!editingWarehouse} onOpenChange={() => setEditingWarehouse(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Warehouse</DialogTitle>
            <DialogDescription>Update warehouse information</DialogDescription>
          </DialogHeader>
          {editingWarehouse && (
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Warehouse Name *</Label>
                <Input
                  id="edit-name"
                  value={editingWarehouse.name}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editingWarehouse.location || ""}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contact">Contact Person</Label>
                <Input
                  id="edit-contact"
                  value={editingWarehouse.contact_person || ""}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, contact_person: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editingWarehouse.phone || ""}
                    onChange={(e) => setEditingWarehouse({ ...editingWarehouse, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingWarehouse.email || ""}
                    onChange={(e) => setEditingWarehouse({ ...editingWarehouse, email: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setEditingWarehouse(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditWarehouse}>Update Warehouse</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

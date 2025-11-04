"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Package,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Download,
  XCircle,
  Router,
  Zap,
  Wifi,
  Server,
  Cable,
  HardDrive,
  Warehouse,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface InventoryData {
  totalItems: number
  lowStockItems: number
  outOfStock: number
  totalValue: number
  categories: Array<{
    name: string
    count: number
    value: number
    icon: string
    color: string
  }>
  recentMovements: Array<{
    id: number
    item: string
    type: string
    quantity: number
    date: string
    reason: string
  }>
  items: Array<{
    id: number
    name: string
    category: string
    sku: string
    stock_quantity: number
    unit_cost: number
    location: string
    warehouse_id?: number
    status: string
    description: string
  }>
}

interface WarehouseOption {
  id: number
  name: string
  code: string
}

export default function InventoryPage() {
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null)
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState("overview")
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const { toast } = useToast()

  const fetchInventoryData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/inventory")
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          // Transform API data to match frontend expectations
          const transformedData = {
            totalItems: result.data.totalItems,
            lowStockItems: result.data.lowStockItems,
            outOfStock: result.data.outOfStock,
            totalValue: result.data.totalValue,
            categories: result.data.categories.map((cat: any) => ({
              name: cat.name,
              count: cat.item_count,
              value: cat.total_value,
              icon: cat.icon,
              color: cat.color,
            })),
            items: result.data.items.map((item: any) => ({
              id: item.id,
              name: item.name,
              category: item.category,
              sku: item.sku,
              stock_quantity: item.total_stock,
              unit_cost: item.unit_cost,
              location: item.warehouse_names || "No Location",
              warehouse_id: item.warehouse_id,
              status: item.status,
              description: item.description,
            })),
            recentMovements: result.data.recentMovements.map((movement: any) => ({
              id: movement.id,
              item: movement.item_name,
              type: movement.movement_type,
              quantity: movement.quantity,
              date: movement.created_at,
              reason: movement.reason,
            })),
          }
          setInventoryData(transformedData)
        } else {
          throw new Error("Invalid API response format")
        }
      } else {
        throw new Error("Failed to fetch inventory data")
      }
    } catch (error) {
      console.error("Error fetching inventory:", error)
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await fetch("/api/warehouses")
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setWarehouses(
            result.warehouses.map((w: any) => ({
              id: w.id,
              name: w.name,
              code: w.code || `WH-${w.id.toString().padStart(3, "0")}`,
            })),
          )
        }
      }
    } catch (error) {
      console.error("Error fetching warehouses:", error)
    }
  }

  useEffect(() => {
    fetchInventoryData()
    fetchWarehouses() // Fetch warehouses on component mount
  }, [])

  const handleAddItem = async (formData: FormData) => {
    try {
      const warehouseId = formData.get("warehouse_id")
      const itemData = {
        name: formData.get("name"),
        sku: formData.get("sku"),
        category: formData.get("category"),
        stock_quantity: Number.parseInt(formData.get("stock_quantity") as string),
        unit_cost: Number.parseFloat(formData.get("unit_cost") as string),
        warehouse_id: warehouseId === "none" ? null : Number.parseInt(warehouseId as string),
        description: formData.get("description"),
        initial_quantity: Number.parseInt(formData.get("stock_quantity") as string),
        status: "active",
      }

      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(itemData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Inventory item added successfully",
        })
        setShowAddModal(false)
        fetchInventoryData()
      } else {
        throw new Error("Failed to add item")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add inventory item",
        variant: "destructive",
      })
    }
  }

  const handleUpdateItem = async (id: number, formData: FormData) => {
    try {
      const warehouseId = formData.get("warehouse_id")
      const itemData = {
        name: formData.get("name"),
        sku: formData.get("sku"),
        category: formData.get("category"),
        stock_quantity: Number.parseInt(formData.get("stock_quantity") as string),
        unit_cost: Number.parseFloat(formData.get("unit_cost") as string),
        warehouse_id: warehouseId === "none" ? null : Number.parseInt(warehouseId as string),
        description: formData.get("description"),
        status: formData.get("status") || "active",
      }

      const response = await fetch(`/api/inventory/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(itemData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Inventory item updated successfully",
        })
        setEditingItem(null)
        fetchInventoryData()
      } else {
        throw new Error("Failed to update item")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update inventory item",
        variant: "destructive",
      })
    }
  }

  const handleDeleteItem = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return

    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Inventory item deleted successfully",
        })
        fetchInventoryData()
      } else {
        throw new Error("Failed to delete item")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete inventory item",
        variant: "destructive",
      })
    }
  }

  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      Router,
      Zap,
      Wifi,
      Package,
      Server,
      Cable,
      HardDrive,
    }
    return iconMap[iconName] || Package
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    )
  }

  if (!inventoryData) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Inventory Data</h3>
        <p className="text-gray-600 mb-4">Unable to load inventory information</p>
        <Button onClick={fetchInventoryData}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Inventory Management</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryData.totalItems}</div>
            <p className="text-xs text-muted-foreground">Across all categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{inventoryData.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items need restocking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inventoryData.outOfStock}</div>
            <p className="text-xs text-muted-foreground">Items unavailable</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh {inventoryData.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current inventory value</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inventoryData.categories.map((category) => {
              const IconComponent = getIconComponent(category.icon)
              return (
                <Card key={category.name}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{category.name}</CardTitle>
                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{category.count}</div>
                    <p className="text-xs text-muted-foreground">KSh {category.value.toLocaleString()} value</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items</CardTitle>
              <CardDescription>Manage your equipment and supplies</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryData.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.stock_quantity > 10 ? "default" : item.stock_quantity > 0 ? "secondary" : "destructive"
                          }
                        >
                          {item.stock_quantity}
                        </Badge>
                      </TableCell>
                      <TableCell>KSh {item.unit_cost.toLocaleString()}</TableCell>
                      <TableCell>{item.location}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingItem(item)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteItem(item.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Movements</CardTitle>
              <CardDescription>Track inventory changes and transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryData.recentMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="font-medium">{movement.item}</TableCell>
                      <TableCell>
                        <Badge variant={movement.type === "in" ? "default" : "secondary"}>
                          {movement.type === "in" ? "Stock In" : "Stock Out"}
                        </Badge>
                      </TableCell>
                      <TableCell className={movement.quantity > 0 ? "text-green-600" : "text-red-600"}>
                        {movement.quantity > 0 ? "+" : ""}
                        {movement.quantity}
                      </TableCell>
                      <TableCell>{new Date(movement.date).toLocaleDateString()}</TableCell>
                      <TableCell>{movement.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inventoryData.categories.map((category) => {
              const IconComponent = getIconComponent(category.icon)
              return (
                <Card key={category.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${category.color}`}>
                        <IconComponent className="h-4 w-4 text-white" />
                      </div>
                      {category.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Items</span>
                        <span className="font-medium">{category.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Value</span>
                        <span className="font-medium">KSh {category.value.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Inventory Item</DialogTitle>
            <DialogDescription>Add a new item to your inventory</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleAddItem(formData)
            }}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Item Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" name="sku" required />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select name="category" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryData.categories.map((cat) => (
                        <SelectItem key={cat.name} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <Input id="stock_quantity" name="stock_quantity" type="number" required />
                </div>
                <div>
                  <Label htmlFor="unit_cost">Unit Cost (KSh)</Label>
                  <Input id="unit_cost" name="unit_cost" type="number" step="0.01" required />
                </div>
              </div>
              <div>
                <Label htmlFor="warehouse_id">Warehouse</Label>
                <Select name="warehouse_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Warehouse</SelectItem>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Warehouse className="h-4 w-4" />
                          {warehouse.name} ({warehouse.code})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>Update item information</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleUpdateItem(editingItem.id, formData)
              }}
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Item Name</Label>
                  <Input id="edit-name" name="name" defaultValue={editingItem.name} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-sku">SKU</Label>
                    <Input id="edit-sku" name="sku" defaultValue={editingItem.sku} required />
                  </div>
                  <div>
                    <Label htmlFor="edit-category">Category</Label>
                    <Select name="category" defaultValue={editingItem.category}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryData.categories.map((cat) => (
                          <SelectItem key={cat.name} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-stock">Stock Quantity</Label>
                    <Input
                      id="edit-stock"
                      name="stock_quantity"
                      type="number"
                      defaultValue={editingItem.stock_quantity}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-cost">Unit Cost (KSh)</Label>
                    <Input
                      id="edit-cost"
                      name="unit_cost"
                      type="number"
                      step="0.01"
                      defaultValue={editingItem.unit_cost}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-warehouse">Warehouse</Label>
                  <Select name="warehouse_id" defaultValue={editingItem.warehouse_id?.toString() || "none"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Warehouse</SelectItem>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Warehouse className="h-4 w-4" />
                            {warehouse.name} ({warehouse.code})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea id="edit-description" name="description" defaultValue={editingItem.description} />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button type="submit">Update Item</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

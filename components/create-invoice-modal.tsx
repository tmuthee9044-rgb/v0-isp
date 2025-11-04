"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Plus, Trash2, Calculator } from "lucide-react"

interface CreateInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onInvoiceCreated: () => void
  customerId?: string
}

interface InvoiceItem {
  description: string
  quantity: number
  unit_price: number
  total_price: number
}

export function CreateInvoiceModal({ isOpen, onClose, onInvoiceCreated, customerId }: CreateInvoiceModalProps) {
  const [customers, setCustomers] = useState([])
  const [formData, setFormData] = useState({
    customer_id: "",
    description: "",
    due_date: "",
    tax_rate: 16, // Default VAT rate for Kenya
    discount_amount: 0,
    notes: "",
  })
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unit_price: 0, total_price: 0 }])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers")
      const data = await response.json()
      let customersList = data.customers || []

      if (customerId) {
        const customerExists = customersList.some((c: any) => c.id.toString() === customerId.toString())

        if (!customerExists) {
          console.log("[v0] Customer not in list, fetching specifically:", customerId)
          // Fetch the specific customer
          const customerResponse = await fetch(`/api/customers/${customerId}`)
          if (customerResponse.ok) {
            const customerData = await customerResponse.json()
            customersList = [customerData, ...customersList]
            console.log("[v0] Added customer to list:", customerData)
          }
        }
      }

      setCustomers(customersList)
      console.log("[v0] Loaded customers:", customersList.length)
    } catch (error) {
      console.error("Error fetching customers:", error)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchCustomers()
      // Set default due date to 30 days from now
      const defaultDueDate = new Date()
      defaultDueDate.setDate(defaultDueDate.getDate() + 30)
      setFormData((prev) => ({
        ...prev,
        due_date: defaultDueDate.toISOString().split("T")[0],
      }))
    }
  }, [isOpen])

  useEffect(() => {
    if (customerId && customers.length > 0) {
      console.log("[v0] Pre-selecting customer:", customerId, "from", customers.length, "customers")
      console.log(
        "[v0] Available customer IDs:",
        customers.map((c: any) => c.id),
      )

      // Convert customerId to string to match SelectItem values
      const customerIdStr = String(customerId)

      setFormData((prev) => ({
        ...prev,
        customer_id: customerIdStr,
      }))

      console.log("[v0] Set customer_id to:", customerIdStr)
    }
  }, [customerId, customers])

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0, total_price: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }

    // Recalculate total price for this item
    if (field === "quantity" || field === "unit_price") {
      updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price
    }

    setItems(updatedItems)
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0)
  }

  const calculateTax = () => {
    return (calculateSubtotal() * formData.tax_rate) / 100
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - formData.discount_amount
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const invoiceData = {
        ...formData,
        amount: calculateTotal(),
        tax_amount: calculateTax(),
        items: items.filter((item) => item.description && item.unit_price > 0),
      }

      const response = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoiceData),
      })

      if (!response.ok) {
        throw new Error("Failed to create invoice")
      }

      toast({
        title: "Invoice Created",
        description: "New invoice has been created successfully.",
      })

      // Reset form
      setFormData({
        customer_id: "",
        description: "",
        due_date: "",
        tax_rate: 16,
        discount_amount: 0,
        notes: "",
      })
      setItems([{ description: "", quantity: 1, unit_price: 0, total_price: 0 }])

      onInvoiceCreated()
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create invoice. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>Generate a new invoice for a customer with itemized billing</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer and Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer *</Label>
              <Select
                value={formData.customer_id}
                onValueChange={(value) => {
                  console.log("[v0] Customer selected:", value)
                  setFormData({ ...formData, customer_id: value })
                }}
                required
                disabled={!!customerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer: any) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.first_name} {customer.last_name}{" "}
                      {customer.business_name && `(${customer.business_name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customerId && <p className="text-sm text-muted-foreground">Invoice will be created for this customer</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Invoice Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the invoice"
              required
            />
          </div>

          {/* Invoice Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Invoice Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5 space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", Number.parseInt(e.target.value) || 1)}
                      min="1"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Unit Price</Label>
                    <Input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, "unit_price", Number.parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Total</Label>
                    <Input value={`KES ${(item.total_price || 0).toLocaleString()}`} readOnly className="bg-muted" />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Invoice Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Invoice Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: Number.parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount Amount (KES)</Label>
                  <Input
                    id="discount"
                    type="number"
                    value={formData.discount_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, discount_amount: Number.parseFloat(e.target.value) || 0 })
                    }
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>KES {(calculateSubtotal() || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({formData.tax_rate}%):</span>
                  <span>KES {(calculateTax() || 0).toLocaleString()}</span>
                </div>
                {formData.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-KES {(formData.discount_amount || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>KES {(calculateTotal() || 0).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or payment terms"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.customer_id || !formData.description}>
              {isLoading ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

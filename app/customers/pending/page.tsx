"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Clock, User, Mail, Phone, MapPin, Package, AlertCircle } from "lucide-react"

interface PendingCustomer {
  id: number
  account_number: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  city: string
  service_preferences: any
  created_at: string
}

interface InventoryItem {
  id: number
  name: string
  category: string
  price: number
  stock_quantity: number
}

export default function PendingCustomersPage() {
  const [pendingCustomers, setPendingCustomers] = useState<PendingCustomer[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCustomer, setSelectedCustomer] = useState<PendingCustomer | null>(null)
  const [selectedItems, setSelectedItems] = useState<{ [key: number]: number }>({})
  const [isApproving, setIsApproving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchPendingCustomers()
    fetchInventoryItems()
  }, [])

  const fetchPendingCustomers = async () => {
    try {
      const response = await fetch("/api/customers/pending")
      const data = await response.json()
      setPendingCustomers(data.customers || [])
    } catch (error) {
      console.error("[v0] Error fetching pending customers:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchInventoryItems = async () => {
    try {
      const response = await fetch("/api/inventory/available")
      const data = await response.json()
      setInventoryItems(data.items || [])
    } catch (error) {
      console.error("[v0] Error fetching inventory:", error)
    }
  }

  const handleApprove = async (customerId: number) => {
    setIsApproving(true)
    setError("")

    try {
      const response = await fetch(`/api/customers/${customerId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItems: Object.entries(selectedItems)
            .map(([id, quantity]) => ({
              id: Number.parseInt(id),
              quantity,
            }))
            .filter((item) => item.quantity > 0),
        }),
      })

      if (response.ok) {
        // Remove approved customer from list
        setPendingCustomers((prev) => prev.filter((c) => c.id !== customerId))
        setSelectedCustomer(null)
        setSelectedItems({})
      } else {
        const data = await response.json()
        setError(data.error || "Failed to approve customer")
      }
    } catch (error) {
      console.error("[v0] Error approving customer:", error)
      setError("Network error occurred")
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async (customerId: number) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/reject`, {
        method: "POST",
      })

      if (response.ok) {
        setPendingCustomers((prev) => prev.filter((c) => c.id !== customerId))
      }
    } catch (error) {
      console.error("[v0] Error rejecting customer:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading pending customers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pending Customer Approvals</h1>
          <p className="text-gray-600">Review and approve new customer registrations</p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {pendingCustomers.length} Pending
        </Badge>
      </div>

      {pendingCustomers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Pending Approvals</h3>
            <p className="text-gray-600">All customer registrations have been processed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingCustomers.map((customer) => (
            <Card key={customer.id} className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {customer.first_name} {customer.last_name}
                    </CardTitle>
                    <CardDescription>Account: {customer.account_number}</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-500" />
                      {customer.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-500" />
                      {customer.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      {customer.address}, {customer.city}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Service Type:</strong> {customer.service_preferences?.preferred_plan || "Not specified"}
                    </p>
                    <p className="text-sm">
                      <strong>Registered:</strong> {new Date(customer.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-green-600 hover:bg-green-700" onClick={() => setSelectedCustomer(customer)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve & Issue Equipment
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Approve Customer & Issue Equipment</DialogTitle>
                        <DialogDescription>
                          Approve {customer.first_name} {customer.last_name} and assign equipment from inventory
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium mb-2">Customer Details</h4>
                          <p>
                            <strong>Name:</strong> {customer.first_name} {customer.last_name}
                          </p>
                          <p>
                            <strong>Email:</strong> {customer.email}
                          </p>
                          <p>
                            <strong>Phone:</strong> {customer.phone}
                          </p>
                          <p>
                            <strong>Preferred Plan:</strong>{" "}
                            {customer.service_preferences?.preferred_plan || "Not specified"}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Issue Equipment
                          </h4>
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {inventoryItems.map((item) => (
                              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-gray-600">
                                    {item.category} - KSh {item.price}
                                  </p>
                                  <p className="text-xs text-gray-500">Stock: {item.stock_quantity}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`qty-${item.id}`} className="text-sm">
                                    Qty:
                                  </Label>
                                  <Input
                                    id={`qty-${item.id}`}
                                    type="number"
                                    min="0"
                                    max={item.stock_quantity}
                                    value={selectedItems[item.id] || 0}
                                    onChange={(e) =>
                                      setSelectedItems((prev) => ({
                                        ...prev,
                                        [item.id]: Number.parseInt(e.target.value) || 0,
                                      }))
                                    }
                                    className="w-20"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {error && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        )}

                        <div className="flex gap-2 pt-4">
                          <Button
                            onClick={() => handleApprove(customer.id)}
                            disabled={isApproving}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isApproving ? "Approving..." : "Approve Customer"}
                          </Button>
                          <Button variant="outline" onClick={() => setSelectedCustomer(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button variant="destructive" onClick={() => handleReject(customer.id)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import {
  Search,
  Plus,
  Download,
  Upload,
  MoreHorizontal,
  Edit,
  Trash2,
  ListEnd as Suspend,
  CheckCircle,
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Filter,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface Customer {
  id: number
  name: string
  first_name?: string
  last_name?: string
  email: string
  phone: string
  customer_type: "individual" | "company" | "school"
  status: "active" | "suspended" | "inactive" | "recent"
  location_name?: string
  service_plan_name?: string
  monthly_fee?: number
  outstanding_balance?: number
  actual_balance?: number
  service_count?: number
  created_at: string
  open_tickets?: number
}

interface CustomerStats {
  total_customers: number
  active_customers: number
  suspended_customers: number
  inactive_customers: number
  recent_customers: number
  new_this_week: number
  new_this_month: number
  total_outstanding: number
  revenue_this_month: number
}

interface Location {
  id: number
  name: string
  city: string
  region: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [balanceFilter, setBalanceFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [deleteCustomerId, setDeleteCustomerId] = useState<number | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    fetchCustomers()
    fetchStats()
    fetchLocations()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers")
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error)
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/reports/customers/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations")
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Locations API response:", data)
        const locationsArray = Array.isArray(data.locations) ? data.locations : Array.isArray(data) ? data : []
        console.log("[v0] Setting locations to:", locationsArray)
        setLocations(locationsArray)
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error)
      setLocations([])
    }
  }

  const handleDeleteCustomer = async () => {
    if (!deleteCustomerId || deleteConfirmText !== deleteCustomerId.toString()) {
      return
    }

    try {
      const response = await fetch(`/api/customers/${deleteCustomerId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setCustomers(customers.filter((c) => c.id !== deleteCustomerId))
        setDeleteCustomerId(null)
        setDeleteConfirmText("")
        fetchStats() // Refresh stats
        toast({
          title: "Success",
          description: "Customer deleted successfully",
        })
      }
    } catch (error) {
      console.error("Failed to delete customer:", error)
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      })
    }
  }

  const handleSuspendCustomer = async (customerId: number) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/actions/suspend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Manual suspension from customer list",
          suspensionType: "manual",
          releaseIPs: false,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        fetchCustomers()
        fetchStats()
        toast({
          title: "Success",
          description: data.message || "Customer suspended successfully",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to suspend customer",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to suspend customer:", error)
      toast({
        title: "Error",
        description: "Failed to suspend customer",
        variant: "destructive",
      })
    }
  }

  const handleActivateCustomer = async (customerId: number) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/actions/activate`, {
        method: "POST",
      })

      if (response.ok) {
        fetchCustomers()
        fetchStats()
        toast({
          title: "Success",
          description: "Customer activated successfully",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to activate customer",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to activate customer:", error)
      toast({
        title: "Error",
        description: "Failed to activate customer",
        variant: "destructive",
      })
    }
  }

  const exportCustomers = async () => {
    try {
      const response = await fetch("/api/customers/export")
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `customers-${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast({
          title: "Success",
          description: "Customers exported successfully",
        })
      }
    } catch (error) {
      console.error("Failed to export customers:", error)
      toast({
        title: "Error",
        description: "Failed to export customers",
        variant: "destructive",
      })
    }
  }

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      (customer.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (customer.first_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (customer.last_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (customer.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (customer.phone || "").includes(searchTerm)

    const matchesStatus = statusFilter === "all" || customer.status === statusFilter
    const matchesType = typeFilter === "all" || customer.customer_type === typeFilter
    const matchesLocation = locationFilter === "all" || (customer.location_name || "") === locationFilter

    // Balance filter logic
    const matchesBalance =
      balanceFilter === "all" ||
      (balanceFilter === "positive" && (customer.actual_balance || 0) > 0) ||
      (balanceFilter === "negative" && (customer.actual_balance || 0) < 0) ||
      (balanceFilter === "zero" && (customer.actual_balance || 0) === 0)

    // Date filter logic
    const customerDate = new Date(customer.created_at)
    const now = new Date()
    const matchesDate =
      dateFilter === "all" ||
      (dateFilter === "today" && customerDate.toDateString() === now.toDateString()) ||
      (dateFilter === "week" && now.getTime() - customerDate.getTime() <= 7 * 24 * 60 * 60 * 1000) ||
      (dateFilter === "month" && now.getTime() - customerDate.getTime() <= 30 * 24 * 60 * 60 * 1000) ||
      (dateFilter === "year" && now.getTime() - customerDate.getTime() <= 365 * 24 * 60 * 60 * 1000)

    return matchesSearch && matchesStatus && matchesType && matchesLocation && matchesBalance && matchesDate
  })

  const getStatusBadge = (status: string | undefined) => {
    if (!status) {
      return <Badge variant="secondary">Unknown</Badge>
    }

    const variants = {
      active: "default",
      suspended: "destructive",
      inactive: "secondary",
      recent: "outline",
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getTypeBadge = (type: string | undefined) => {
    // Return null if type is undefined or empty
    if (!type) {
      return <Badge variant="secondary">N/A</Badge>
    }

    const colors = {
      individual: "bg-blue-100 text-blue-800",
      company: "bg-green-100 text-green-800",
      school: "bg-purple-100 text-purple-800",
    } as const

    return (
      <Badge className={colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    )
  }

  // Helper function to format currency properly
  const formatCurrency = (amount: number | null | undefined): string => {
    if (!amount) return "0.00"
    return Math.round(amount).toFixed(2)
  }

  // Helper function to format currency without leading zeros
  const formatCurrencyNoLeadingZero = (amount: number | null | undefined): string => {
    if (!amount) return "0.00"
    const formatted = Math.round(amount).toFixed(2)
    // Remove leading zero if it exists (e.g., "0.50" becomes ".50")
    return formatted.startsWith("0.") ? formatted.substring(1) : formatted
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Customer Management</h1>
          <p className="text-muted-foreground">Manage all your customers and their services</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCustomers}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href="/customers/import">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </Link>
          <Link href="/customers/add">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_customers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active_customers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspended</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.suspended_customers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New This Month</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.new_this_month}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="col-span-full">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="recent">Recent</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="school">School</SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {Array.isArray(locations) &&
                  locations.map((location) => (
                    <SelectItem key={location.id} value={location.name}>
                      {location.name} - {location.city}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={balanceFilter} onValueChange={setBalanceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Balance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Balances</SelectItem>
                <SelectItem value="positive">Positive Balance</SelectItem>
                <SelectItem value="negative">Negative Balance</SelectItem>
                <SelectItem value="zero">Zero Balance</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Date Added" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("")
                setStatusFilter("all")
                setLocationFilter("all")
                setTypeFilter("all")
                setBalanceFilter("all")
                setDateFilter("all")
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
          <CardDescription>Manage your customer database with advanced filtering and bulk operations</CardDescription>
          <div className="flex gap-4 text-sm text-muted-foreground mt-2">
            <span>
              Total Outstanding: KES{" "}
              {formatCurrencyNoLeadingZero(filteredCustomers.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0))}
            </span>
            <span>
              Total Balance: KES{" "}
              {formatCurrencyNoLeadingZero(filteredCustomers.reduce((sum, c) => sum + (c.actual_balance || 0), 0))}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {customer.first_name && customer.last_name
                            ? `${customer.first_name} ${customer.last_name}`
                            : customer.name || "No Name"}
                        </div>
                        <div className="text-sm text-muted-foreground">ID: {customer.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">{customer.email}</div>
                        <div className="text-sm text-muted-foreground">{customer.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(customer.customer_type)}</TableCell>
                    <TableCell>{getStatusBadge(customer.status)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium">{customer.service_count || 0} Services</div>
                        {customer.service_plan_name && (
                          <div className="text-sm text-muted-foreground">
                            {customer.service_plan_name} - KES {formatCurrency(customer.monthly_fee)}/month
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{customer.location_name || "Not Set"}</TableCell>
                    <TableCell>
                      <div
                        className={
                          customer.actual_balance && customer.actual_balance < 0
                            ? "text-red-600 font-medium"
                            : customer.actual_balance && customer.actual_balance > 0
                              ? "text-green-600 font-medium"
                              : "text-gray-600"
                        }
                      >
                        KES {formatCurrencyNoLeadingZero(customer.actual_balance)}
                      </div>
                      {customer.outstanding_balance && customer.outstanding_balance > 0 && (
                        <div className="text-xs text-red-500">
                          Unpaid: KES {formatCurrencyNoLeadingZero(customer.outstanding_balance)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.open_tickets && customer.open_tickets > 0 ? (
                        <Badge variant="destructive">{customer.open_tickets}</Badge>
                      ) : (
                        <Badge variant="secondary">0</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/customers/${customer.id}`}>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>
                          </Link>
                          <Link href={`/customers/${customer.id}/edit`}>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Details
                            </DropdownMenuItem>
                          </Link>
                          {customer.status === "active" ? (
                            <DropdownMenuItem onClick={() => handleSuspendCustomer(customer.id)}>
                              <Suspend className="mr-2 h-4 w-4" />
                              Suspend
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleActivateCustomer(customer.id)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-red-600" onClick={() => setDeleteCustomerId(customer.id)}>
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
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteCustomerId !== null} onOpenChange={() => setDeleteCustomerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the customer and all associated data.
              <br />
              <br />
              To confirm deletion, please type the customer ID: <strong>{deleteCustomerId}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter customer ID to confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteCustomerId(null)
                setDeleteConfirmText("")
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              disabled={deleteConfirmText !== deleteCustomerId?.toString()}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Download,
  Search,
  Filter,
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import Link from "next/link"
import { useLocalization } from "@/lib/localization-context"
import { formatCurrency, formatDate, formatTime } from "@/lib/localization-utils"

// Interfaces for payment data
interface Payment {
  id: string
  customer: string
  customerId: number
  amount: number
  method: string
  reference: string
  status: string
  date: string
  time: string
  invoice: string
  plan: string
}

interface PaymentResponse {
  success: boolean
  data: Payment[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export default function PaymentsPage() {
  const { settings: localizationSettings } = useLocalization()

  // State for real data fetching
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const [searchTerm, setSearchTerm] = useState("")
  const [filterMethod, setFilterMethod] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterPlan, setFilterPlan] = useState("all")
  const [amountRange, setAmountRange] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const { toast } = useToast()

  // Function to fetch payments from API
  const fetchPayments = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (searchTerm) params.append("search", searchTerm)
      if (filterMethod !== "all") params.append("method", filterMethod)
      if (filterStatus !== "all") params.append("status", filterStatus)
      if (dateFrom) params.append("dateFrom", format(dateFrom, "yyyy-MM-dd"))
      if (dateTo) params.append("dateTo", format(dateTo, "yyyy-MM-dd"))
      params.append("limit", "100")

      const response = await fetch(`/api/billing/payments?${params}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: PaymentResponse = await response.json()

      if (result.success) {
        setPayments(Array.isArray(result.data) ? result.data : [])
        setTotalCount(result.pagination.total)
      } else {
        throw new Error("Failed to fetch payments")
      }
    } catch (error) {
      console.error("Error fetching payments:", error)
      setError("Failed to load payments. Please try again.")
      setPayments([])
      setTotalCount(0)
      toast({
        title: "Error",
        description: "Failed to load payments. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [searchTerm, filterMethod, filterStatus, dateFrom, dateTo])

  const filteredPayments = (Array.isArray(payments) ? payments : []).filter((payment) => {
    const matchesSearch =
      payment.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesMethod = filterMethod === "all" || payment.method === filterMethod
    const matchesStatus = filterStatus === "all" || payment.status === filterStatus
    const matchesPlan = filterPlan === "all" || payment.plan.toLowerCase().includes(filterPlan.toLowerCase())

    // Date filtering
    const paymentDate = new Date(payment.date)
    const matchesDateFrom = !dateFrom || paymentDate >= dateFrom
    const matchesDateTo = !dateTo || paymentDate <= dateTo

    // Amount filtering
    let matchesAmount = true
    if (amountRange !== "all") {
      switch (amountRange) {
        case "0-1000":
          matchesAmount = payment.amount <= 1000
          break
        case "1001-2500":
          matchesAmount = payment.amount > 1000 && payment.amount <= 2500
          break
        case "2501-5000":
          matchesAmount = payment.amount > 2500 && payment.amount <= 5000
          break
        case "5000+":
          matchesAmount = payment.amount > 5000
          break
      }
    }

    return (
      matchesSearch &&
      matchesMethod &&
      matchesStatus &&
      matchesPlan &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesAmount
    )
  })

  const totalPayments = filteredPayments.reduce(
    (sum, payment) => (payment.status === "completed" ? sum + (payment.amount || 0) : sum),
    0,
  )
  const completedPayments = filteredPayments.filter((p) => p.status === "completed").length
  const pendingPayments = filteredPayments.filter((p) => p.status === "pending").length
  const failedPayments = filteredPayments.filter((p) => p.status === "failed").length

  const clearFilters = () => {
    setSearchTerm("")
    setFilterMethod("all")
    setFilterStatus("all")
    setFilterPlan("all")
    setAmountRange("all")
    setDateFrom(undefined)
    setDateTo(undefined)
  }

  const handleExport = () => {
    const filterParams = {
      search: searchTerm,
      method: filterMethod,
      status: filterStatus,
      plan: filterPlan,
      amountRange,
      dateFrom: dateFrom ? format(dateFrom, "yyyy-MM-dd") : null,
      dateTo: dateTo ? format(dateTo, "yyyy-MM-dd") : null,
      totalRecords: filteredPayments.length,
      totalAmount: totalPayments,
    }

    toast({
      title: "Export Started",
      description: `Exporting ${filteredPayments.length} payment records with applied filters...`,
    })

    // Here you would typically send filterParams to your export API
    console.log("Export parameters:", filterParams)
  }

  const handleRetryPayment = (paymentId: string, customer: string) => {
    toast({
      title: "Payment Retry Initiated",
      description: `Retrying payment ${paymentId} for ${customer}`,
    })
  }

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "M-Pesa":
        return <Smartphone className="h-4 w-4" />
      case "Credit Card":
        return <CreditCard className="h-4 w-4" />
      case "Bank Transfer":
        return <Building2 className="h-4 w-4" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading payments...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchPayments}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2">
          <Link href="/billing">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Billing
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Payment History</h2>
            <p className="text-muted-foreground">Track and manage all customer payments</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            {showAdvancedFilters ? "Hide" : "Show"} Filters
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPayments || 0, localizationSettings)}</div>
            <p className="text-xs text-muted-foreground">{completedPayments} completed payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments}</div>
            <p className="text-xs text-muted-foreground">awaiting confirmation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedPayments}</div>
            <p className="text-xs text-muted-foreground">require attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCount > 0 ? Math.round((completedPayments / totalCount) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">payment success rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Basic Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers, references, or payment IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterMethod} onValueChange={setFilterMethod}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="M-Pesa">M-Pesa</SelectItem>
            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
            <SelectItem value="Credit Card">Credit Card</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showAdvancedFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
            <CardDescription>Customize your payment report with detailed filtering options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label>Date From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Date To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Service Plan Filter */}
              <div className="space-y-2">
                <Label>Service Plan</Label>
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Plans" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="Basic">Basic Plans</SelectItem>
                    <SelectItem value="Standard">Standard Plans</SelectItem>
                    <SelectItem value="Premium">Premium Plans</SelectItem>
                    <SelectItem value="Business">Business Plans</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Range Filter */}
              <div className="space-y-2">
                <Label>Amount Range</Label>
                <Select value={amountRange} onValueChange={setAmountRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Amounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Amounts</SelectItem>
                    <SelectItem value="0-1000">KSh 0 - 1,000</SelectItem>
                    <SelectItem value="1001-2500">KSh 1,001 - 2,500</SelectItem>
                    <SelectItem value="2501-5000">KSh 2,501 - 5,000</SelectItem>
                    <SelectItem value="5000+">KSh 5,000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={clearFilters}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
              <Button onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Filtered Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions ({filteredPayments.length})</CardTitle>
          <CardDescription>Complete history of all payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No payments found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="hidden md:table-cell">Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Date & Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.customer}</div>
                          <div className="text-sm text-muted-foreground">{payment.plan}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(payment.amount || 0, localizationSettings)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPaymentIcon(payment.method)}
                          <span className="hidden sm:inline">{payment.method}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-sm">{payment.reference}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(payment.status)}
                          <Badge
                            variant={
                              payment.status === "completed"
                                ? "default"
                                : payment.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {payment.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div>
                          <div>{formatDate(payment.date, localizationSettings)}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatTime(payment.date, localizationSettings)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.status === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetryPayment(payment.id, payment.customer)}
                          >
                            Retry
                          </Button>
                        )}
                        {payment.status === "completed" && (
                          <Button size="sm" variant="ghost">
                            Receipt
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

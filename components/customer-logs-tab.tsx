"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Activity,
  Download,
  RefreshCw,
  Search,
  CreditCard,
  Settings,
  User,
  Clock,
  FileText,
  Receipt,
  Smartphone,
  Globe,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface CustomerLogEntry {
  id: string
  timestamp: string
  activity_type:
    | "payment"
    | "invoice"
    | "credit_note"
    | "admin_action"
    | "system_action"
    | "service_change"
    | "login"
    | "mpesa"
    | "billing_view"
    | "portal_activity"
  description: string
  amount?: number
  admin_user?: string
  ip_address?: string
  details?: any
  status?: string
}

interface CustomerLogsTabProps {
  customerId: number
}

export function CustomerLogsTab({ customerId }: CustomerLogsTabProps) {
  const [logs, setLogs] = useState<CustomerLogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<CustomerLogEntry[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(false)

  const fetchCustomerLogs = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        type: typeFilter,
        search: searchTerm,
        limit: "50",
      })

      const response = await fetch(`/api/customers/${customerId}/logs?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch customer logs")
      }

      const data = await response.json()
      setLogs(data.logs || [])
      setFilteredLogs(data.logs || [])
    } catch (error) {
      console.error("Error fetching customer logs:", error)
      setLogs([])
      setFilteredLogs([])
      toast({
        title: "Error",
        description: "Failed to fetch customer activity logs.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomerLogs()
  }, [customerId, typeFilter, searchTerm])

  const handleRefresh = async () => {
    await fetchCustomerLogs()
    toast({
      title: "Logs refreshed",
      description: "Latest customer activity has been loaded.",
    })
  }

  const handleExport = () => {
    const csvContent = [
      ["Timestamp", "Activity Type", "Description", "Amount", "Admin User", "IP Address", "Status"],
      ...filteredLogs.map((log) => [
        log.timestamp,
        log.activity_type,
        log.description,
        log.amount || "",
        log.admin_user || "",
        log.ip_address || "",
        log.status || "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `customer-${customerId}-logs-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Export completed",
      description: "Customer logs have been exported to CSV file.",
    })
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <CreditCard className="h-4 w-4 text-green-500" />
      case "invoice":
        return <FileText className="h-4 w-4 text-blue-500" />
      case "credit_note":
        return <Receipt className="h-4 w-4 text-purple-500" />
      case "admin_action":
        return <Settings className="h-4 w-4 text-orange-500" />
      case "system_action":
        return <Activity className="h-4 w-4 text-gray-500" />
      case "service_change":
        return <RefreshCw className="h-4 w-4 text-red-500" />
      case "login":
        return <User className="h-4 w-4 text-indigo-500" />
      case "mpesa":
        return <Smartphone className="h-4 w-4 text-green-600" />
      case "billing_view":
        return <FileText className="h-4 w-4 text-blue-400" />
      case "portal_activity":
        return <Globe className="h-4 w-4 text-cyan-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getActivityBadge = (type: string) => {
    const config = {
      payment: { variant: "default" as const, label: "PAYMENT" },
      invoice: { variant: "secondary" as const, label: "INVOICE" },
      credit_note: { variant: "outline" as const, label: "CREDIT NOTE" },
      admin_action: { variant: "destructive" as const, label: "ADMIN" },
      system_action: { variant: "outline" as const, label: "SYSTEM" },
      service_change: { variant: "destructive" as const, label: "SERVICE" },
      login: { variant: "secondary" as const, label: "LOGIN" },
      mpesa: { variant: "default" as const, label: "M-PESA" },
      billing_view: { variant: "secondary" as const, label: "BILLING" },
      portal_activity: { variant: "outline" as const, label: "PORTAL" },
    }

    const { variant, label } = config[type as keyof typeof config] || {
      variant: "outline" as const,
      label: type.toUpperCase(),
    }

    return (
      <Badge variant={variant} className="text-xs">
        {label}
      </Badge>
    )
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null

    const statusConfig = {
      SUCCESS: { variant: "default" as const, className: "bg-green-500" },
      INFO: { variant: "secondary" as const, className: "" },
      completed: { variant: "default" as const, className: "bg-green-500" },
      pending: { variant: "secondary" as const, className: "bg-yellow-500" },
      failed: { variant: "destructive" as const, className: "" },
      ERROR: { variant: "destructive" as const, className: "" },
      WARNING: { variant: "destructive" as const, className: "bg-orange-500" },
      active: { variant: "default" as const, className: "bg-blue-500" },
      suspended: { variant: "destructive" as const, className: "" },
      cancelled: { variant: "outline" as const, className: "" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: "outline" as const, className: "" }

    return (
      <Badge variant={config.variant} className={`text-xs ${config.className}`}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customer Activity Logs</CardTitle>
              <CardDescription>
                Complete activity history including payments, invoices, M-Pesa transactions, service changes, admin
                actions, and portal activities
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={handleExport} size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button onClick={handleRefresh} disabled={isLoading} size="sm">
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Activities</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search customer activities..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="type-filter">Activity Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                  <SelectItem value="credit_note">Credit Notes</SelectItem>
                  <SelectItem value="mpesa">M-Pesa Transactions</SelectItem>
                  <SelectItem value="service_change">Service Changes</SelectItem>
                  <SelectItem value="admin_action">Admin Actions</SelectItem>
                  <SelectItem value="system_action">System Actions</SelectItem>
                  <SelectItem value="login">Login Activities</SelectItem>
                  <SelectItem value="billing_view">Billing Views</SelectItem>
                  <SelectItem value="portal_activity">Portal Activities</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[140px]">Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Amount</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px]">Admin/IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading customer activities...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No activities found for this customer
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(log.timestamp).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getActivityIcon(log.activity_type)}
                          {getActivityBadge(log.activity_type)}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate" title={log.description}>
                          {log.description}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.amount ? `KES ${log.amount.toLocaleString()}` : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-sm">
                        <div className="truncate" title={log.admin_user || log.ip_address || "-"}>
                          {log.admin_user || log.ip_address || "-"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

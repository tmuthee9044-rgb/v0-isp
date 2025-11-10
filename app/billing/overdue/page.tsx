"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Phone, Mail, MessageSquare, Download, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface OverdueInvoice {
  id: string
  customer: string
  email: string
  phone: string
  amount: number
  daysOverdue: number
  invoiceDate: string
  dueDate: string
  status: string
  plan: string
}

export default function OverduePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDays, setFilterDays] = useState("all")
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchOverdueInvoices = async () => {
      try {
        console.log("[v0] Fetching overdue invoices...")
        const response = await fetch("/api/billing/overdue")

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Overdue invoices response:", data)

          if (data.success && data.data) {
            setOverdueInvoices(data.data)
          } else {
            console.error("[v0] API returned success=false:", data.error)
            toast({
              title: "Error",
              description: data.error || "Failed to load overdue invoices",
              variant: "destructive",
            })
          }
        } else {
          // Get error details from response
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          console.error("[v0] API request failed:", response.status, errorData)
          toast({
            title: "Error",
            description: errorData.error || `Failed to load overdue invoices (${response.status})`,
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("[v0] Error fetching overdue invoices:", error)
        toast({
          title: "Error",
          description: "Network error while loading overdue invoices",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchOverdueInvoices()
  }, [toast])

  const filteredInvoices = overdueInvoices.filter((invoice) => {
    const matchesSearch =
      invoice.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter =
      filterDays === "all" ||
      (filterDays === "1-7" && invoice.daysOverdue <= 7) ||
      (filterDays === "8-30" && invoice.daysOverdue > 7 && invoice.daysOverdue <= 30) ||
      (filterDays === "30+" && invoice.daysOverdue > 30)

    return matchesSearch && matchesFilter
  })

  const totalOverdue = overdueInvoices.reduce((sum, invoice) => sum + invoice.amount, 0)
  const averageDaysOverdue =
    overdueInvoices.length > 0
      ? Math.round(overdueInvoices.reduce((sum, invoice) => sum + invoice.daysOverdue, 0) / overdueInvoices.length)
      : 0

  const handleSendReminder = (customer: string, email: string) => {
    toast({
      title: "Reminder Sent",
      description: `Payment reminder sent to ${customer} at ${email}`,
    })
  }

  const handleCall = (customer: string, phone: string) => {
    toast({
      title: "Call Initiated",
      description: `Calling ${customer} at ${phone}`,
    })
  }

  const handleSendSMS = (customer: string, phone: string) => {
    toast({
      title: "SMS Sent",
      description: `SMS reminder sent to ${customer} at ${phone}`,
    })
  }

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Overdue invoices report is being generated...",
    })
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading overdue invoices...</p>
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
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Overdue Invoices</h2>
            <p className="text-muted-foreground">Manage and follow up on overdue payments</p>
          </div>
        </div>
        <Button onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh {(totalOverdue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{overdueInvoices.length} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Days Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageDaysOverdue}</div>
            <p className="text-xs text-muted-foreground">days on average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical (30+ days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overdueInvoices.filter((inv) => inv.daysOverdue > 30).length}
            </div>
            <p className="text-xs text-muted-foreground">require immediate action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent (1-7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {overdueInvoices.filter((inv) => inv.daysOverdue <= 7).length}
            </div>
            <p className="text-xs text-muted-foreground">early follow-up</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers, emails, or invoice IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterDays} onValueChange={setFilterDays}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by days" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Overdue</SelectItem>
            <SelectItem value="1-7">1-7 days</SelectItem>
            <SelectItem value="8-30">8-30 days</SelectItem>
            <SelectItem value="30+">30+ days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overdue Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Overdue Invoices ({filteredInvoices.length})</CardTitle>
          <CardDescription>Follow up on overdue payments and manage customer communications</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No overdue invoices found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead className="hidden lg:table-cell">Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.customer}</div>
                          <div className="text-sm text-muted-foreground">{invoice.email}</div>
                          <div className="text-sm text-muted-foreground">{invoice.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{invoice.plan}</TableCell>
                      <TableCell>KSh {(invoice.amount || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            invoice.daysOverdue > 30 ? "destructive" : invoice.daysOverdue > 7 ? "secondary" : "outline"
                          }
                        >
                          {invoice.daysOverdue} days
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{invoice.dueDate}</TableCell>
                      <TableCell>
                        <div className="flex flex-col sm:flex-row gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendReminder(invoice.customer, invoice.email)}
                          >
                            <Mail className="h-3 w-3 mr-1" />
                            Email
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCall(invoice.customer, invoice.phone)}
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            Call
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendSMS(invoice.customer, invoice.phone)}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            SMS
                          </Button>
                        </div>
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

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Search, TrendingUp, TrendingDown, DollarSign, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface FinancialTransaction {
  id: number
  purchase_order_id: number
  purchase_order_number: string
  supplier_id: string
  supplier_name: string
  transaction_type: "expense" | "income" | "adjustment"
  amount: number
  description: string
  reference_number: string
  created_at: string
}

interface ActivityLog {
  id: number
  purchase_order_id: number
  order_number: string
  supplier_name: string
  action: string
  user_name: string
  details: any
  created_at: string
}

export default function FinancialDashboardPage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [suppliers, setSuppliers] = useState<any[]>([])

  const [summary, setSummary] = useState({
    total_expenses: 0,
    total_income: 0,
    net_amount: 0,
    transaction_count: 0,
  })

  useEffect(() => {
    loadData()
  }, [typeFilter, supplierFilter])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load financial transactions
      const params = new URLSearchParams()
      if (typeFilter !== "all") params.append("type", typeFilter)
      if (supplierFilter !== "all") params.append("supplier_id", supplierFilter)

      const transactionsResponse = await fetch(`/api/financial-transactions?${params}`)
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        setTransactions(transactionsData.data || [])

        // Calculate summary from transactions
        const expenses =
          transactionsData.data
            ?.filter((t: any) => t.transaction_type === "expense")
            .reduce((sum: number, t: any) => sum + t.amount, 0) || 0
        const income =
          transactionsData.data
            ?.filter((t: any) => t.transaction_type === "income")
            .reduce((sum: number, t: any) => sum + t.amount, 0) || 0

        setSummary({
          total_expenses: expenses,
          total_income: income,
          net_amount: income - expenses,
          transaction_count: transactionsData.data?.length || 0,
        })
      }

      // Load activity logs
      const logsResponse = await fetch("/api/activity-logs?limit=20")
      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        setActivityLogs(logsData.data || [])
      }

      // Load suppliers
      const suppliersResponse = await fetch("/api/suppliers")
      if (suppliersResponse.ok) {
        const suppliersData = await suppliersResponse.json()
        setSuppliers(suppliersData.suppliers || [])
      }
    } catch (error) {
      console.error("Error loading financial data:", error)
      toast({
        title: "Error",
        description: "Failed to load financial data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getTransactionBadge = (type: string) => {
    const colors = {
      expense: "bg-red-100 text-red-800",
      income: "bg-green-100 text-green-800",
      adjustment: "bg-blue-100 text-blue-800",
    }
    return (
      <Badge className={colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800"}>{type.toUpperCase()}</Badge>
    )
  }

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.reference_number.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading financial dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Financial Dashboard</h1>
        <p className="text-muted-foreground">Track purchase order expenses and financial transactions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">KES {summary.total_expenses.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">KES {summary.total_income.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.net_amount >= 0 ? "text-green-600" : "text-red-600"}`}>
              KES {summary.net_amount.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <FileText className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.transaction_count}</div>
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
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="type-filter">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="adjustment">Adjustments</SelectItem>
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
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={loadData} variant="outline">
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Transactions ({filteredTransactions.length})</CardTitle>
            <CardDescription>Recent purchase order related transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="text-muted-foreground">No transactions found</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.slice(0, 10).map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{getTransactionBadge(transaction.transaction_type)}</TableCell>
                      <TableCell className="font-medium">{transaction.supplier_name}</TableCell>
                      <TableCell>
                        <span
                          className={transaction.transaction_type === "expense" ? "text-red-600" : "text-green-600"}
                        >
                          KES {transaction.amount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest purchase order activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityLogs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">No recent activity</div>
                </div>
              ) : (
                activityLogs.slice(0, 8).map((log) => (
                  <div key={log.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{log.action}</div>
                      <div className="text-sm text-muted-foreground">
                        {log.order_number} - {log.supplier_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        by {log.user_name} • {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

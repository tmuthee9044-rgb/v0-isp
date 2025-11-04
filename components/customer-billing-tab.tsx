"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import PaymentModal from "@/components/payment-modal"
import { CreateInvoiceModal } from "@/components/create-invoice-modal"
import CreditNoteModal from "@/components/credit-note-modal"
import { toast } from "sonner"
import {
  CreditCard,
  FileText,
  DollarSign,
  Settings,
  Download,
  Send,
  Eye,
  Copy,
  Plus,
  RefreshCw,
  Calendar,
  Receipt,
  Trash2,
  ChevronDown,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface FinanceDocument {
  id: string
  type: "invoice" | "payment" | "credit_note"
  reference_number: string
  description: string
  total_amount: number
  status: string
  created_at: string
  due_date?: string
  notes?: string
}

interface Transaction {
  id: string
  transaction_id: string
  type: "credit" | "debit" | "refund" | "adjustment"
  date: string
  amount: number
  payment_method: string
  reference: string
  status: string
  running_balance: number
}

interface BillingConfig {
  billing_enabled: boolean
  payment_period: string
  payment_method: string
  billing_day: number
  due_date_days: number
  auto_create_invoices: boolean
  reminder_days: number[]
  grace_period_days: number
  auto_pay_enabled: boolean
}

interface CustomerBillingTabProps {
  customerId: string
}

export function CustomerBillingTab({ customerId }: CustomerBillingTabProps) {
  const [documents, setDocuments] = useState<FinanceDocument[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [billingConfig, setBillingConfig] = useState<BillingConfig>({
    billing_enabled: true,
    payment_period: "1_month",
    payment_method: "debit_order",
    billing_day: 1,
    due_date_days: 7,
    auto_create_invoices: true,
    reminder_days: [3, 1],
    grace_period_days: 5,
    auto_pay_enabled: false,
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("documents")
  const [documentFilter, setDocumentFilter] = useState("all")
  const [transactionFilter, setTransactionFilter] = useState("all")
  const [dateRange, setDateRange] = useState("all")
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false)
  const [generatingStatement, setGeneratingStatement] = useState(false)
  const [customerData, setCustomerData] = useState<{ name: string; email: string } | null>(null)

  const [customerSummary, setCustomerSummary] = useState({
    balance: 0,
    expiry_date: null as string | null,
    payment_method: "Unknown",
    total_paid: 0,
    total_outstanding: 0,
    last_payment_date: null as string | null,
  })

  useEffect(() => {
    loadBillingData()
    loadCustomerData()
  }, [customerId])

  const loadCustomerData = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`)
      if (response.ok) {
        const data = await response.json()
        setCustomerData({
          name: data.business_name || `${data.first_name} ${data.last_name}`,
          email: data.email,
        })
      }
    } catch (error) {
      console.error("Error loading customer data:", error)
    }
  }

  const loadBillingData = async () => {
    try {
      setLoading(true)

      const documentsResponse = await fetch(`/api/customers/${customerId}/finance/documents`)
      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json()
        console.log("[v0] Finance documents loaded:", documentsData.documents?.length || 0)
        setDocuments(documentsData.documents || [])
      }

      const transactionsResponse = await fetch(`/api/customers/${customerId}/transactions`)
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        setTransactions(transactionsData.transactions || [])
      }

      const configResponse = await fetch(`/api/customers/${customerId}/billing-config`)
      if (configResponse.ok) {
        const configData = await configResponse.json()
        if (configData.config) {
          setBillingConfig({
            billing_enabled: configData.config.billing_enabled ?? true,
            payment_period: configData.config.payment_period || "1_month",
            payment_method: configData.config.payment_method || "debit_order",
            billing_day: configData.config.billing_day || 1,
            due_date_days: configData.config.payment_due_days || configData.config.due_date_days || 7,
            auto_create_invoices: configData.config.auto_create_invoices ?? true,
            reminder_days: [configData.config.reminder_1_day || 3, configData.config.reminder_2_day || 1],
            grace_period_days: configData.config.grace_period_days || configData.config.deactivation_period || 5,
            auto_pay_enabled: configData.config.auto_pay_enabled ?? false,
          })
        }
      }

      const summaryResponse = await fetch(`/api/customers/${customerId}/billing-summary`)
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json()
        console.log("[v0] Account balance:", summaryData.summary.balance)
        setCustomerSummary(summaryData.summary)
      }
    } catch (error) {
      console.error("Error loading billing data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveBillingConfig = async () => {
    try {
      const configPayload = {
        billing_enabled: billingConfig.billing_enabled,
        payment_period: billingConfig.payment_period,
        billing_day: billingConfig.billing_day,
        payment_due_days: billingConfig.due_date_days,
        deactivation_period: billingConfig.grace_period_days,
        auto_create_invoices: billingConfig.auto_create_invoices,
        send_billing_notifications: billingConfig.billing_enabled,
        reminders_enabled: true,
        reminder_1_day: billingConfig.reminder_days[0] || 3,
        reminder_2_day: billingConfig.reminder_days[1] || 1,
      }

      const response = await fetch(`/api/customers/${customerId}/billing-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configPayload),
      })

      if (response.ok) {
        toast.success("Billing configuration saved successfully")
        await loadBillingData() // Reload to confirm changes
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to save billing configuration")
      }
    } catch (error) {
      console.error("Error saving billing config:", error)
      toast.error("Failed to save billing configuration")
    }
  }

  const handleAddPayment = () => {
    setShowPaymentModal(true)
  }

  const handleAddInvoice = () => {
    setShowInvoiceModal(true)
  }

  const handleAddCreditNote = () => {
    setShowCreditNoteModal(true)
  }

  const handleSendReminder = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/invoices/${invoiceId}/remind`, {
        method: "POST",
      })
      if (response.ok) {
        // Show success message
      }
    } catch (error) {
      console.error("Error sending reminder:", error)
    }
  }

  const exportData = async (type: "csv" | "pdf", dataType: "invoices" | "transactions") => {
    try {
      const response = await fetch(`/api/customers/${customerId}/export-billing?type=${type}&data=${dataType}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `customer-${customerId}-${dataType}.${type}`
        a.click()
      }
    } catch (error) {
      console.error("Error exporting data:", error)
    }
  }

  const handleDeleteDocument = async (documentId: string, documentType: string) => {
    if (!confirm(`Are you sure you want to delete this ${documentType}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/customers/${customerId}/finance/documents/${documentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_type: documentType }),
      })

      if (response.ok) {
        toast.success(`${documentType} deleted successfully`)
        loadBillingData()
      } else {
        const error = await response.json()
        toast.error(error.error || `Failed to delete ${documentType}`)
      }
    } catch (error) {
      console.error(`Error deleting ${documentType}:`, error)
      toast.error(`Failed to delete ${documentType}`)
    }
  }

  const handleGenerateStatement = async () => {
    try {
      setGeneratingStatement(true)
      toast.info("Generating statement...")

      const response = await fetch(`/api/customers/${customerId}/statement`, {
        method: "POST",
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `statement-${customerId}-${new Date().toISOString().split("T")[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success("Statement generated successfully")
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to generate statement")
      }
    } catch (error) {
      console.error("Error generating statement:", error)
      toast.error("Failed to generate statement")
    } finally {
      setGeneratingStatement(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500"
      case "pending":
        return "bg-yellow-500"
      case "overdue":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  // Updated to handle new status types and return Badge components
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
      case "completed":
        return <Badge className="bg-green-500">Paid</Badge>
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>
      case "overdue":
        return <Badge className="bg-red-500">Overdue</Badge>
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>
      case "partial":
        return <Badge className="bg-orange-500">Partial</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Updated to match new finance document types
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "invoice":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Invoice
          </Badge>
        )
      case "payment":
        return <Badge className="bg-green-500">Payment</Badge>
      case "credit_note":
        return <Badge className="bg-purple-500">Credit Note</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount)
  }

  const filteredDocuments = documents.filter((doc) => {
    if (documentFilter !== "all" && doc.type !== documentFilter) return false
    return true
  })

  const filteredTransactions = transactions.filter((transaction) => {
    if (transactionFilter !== "all" && transaction.type !== transactionFilter) return false
    return true
  })

  const paymentMethodData = transactions.reduce(
    (acc, transaction) => {
      const existing = acc.find((item) => item.method === transaction.payment_method)
      if (existing) {
        existing.amount += Math.abs(transaction.amount)
      } else {
        acc.push({ method: transaction.payment_method, amount: Math.abs(transaction.amount) })
      }
      return acc
    },
    [] as { method: string; amount: number }[],
  )

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  const handleViewInvoice = async (invoiceId: string) => {
    try {
      window.open(`/api/customers/${customerId}/invoices/${invoiceId}/view`, "_blank")
    } catch (error) {
      console.error("Error viewing invoice:", error)
    }
  }

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/finance/invoices/${invoiceId}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `invoice-${invoiceId}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Error downloading invoice:", error)
    }
  }

  const handleCopyInvoice = async (invoiceId: string) => {
    try {
      const invoiceUrl = `${window.location.origin}/invoices/${invoiceId}`
      await navigator.clipboard.writeText(invoiceUrl)
      // Show success toast
    } catch (error) {
      console.error("Error copying invoice link:", error)
    }
  }

  const handleDownloadPayment = async (paymentId: string) => {
    try {
      toast.info("Generating payment receipt...")
      const response = await fetch(`/api/payments/${paymentId}/pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `payment-receipt-${paymentId}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success("Payment receipt downloaded")
      } else {
        toast.error("Failed to generate payment receipt")
      }
    } catch (error) {
      console.error("Error downloading payment receipt:", error)
      toast.error("Failed to download payment receipt")
    }
  }

  const handleDownloadCreditNote = async (creditNoteId: string) => {
    try {
      toast.info("Generating credit note...")
      const response = await fetch(`/api/credit-notes/${creditNoteId}/pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `credit-note-${creditNoteId}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success("Credit note downloaded")
      } else {
        toast.error("Failed to generate credit note")
      }
    } catch (error) {
      console.error("Error downloading credit note:", error)
      toast.error("Failed to download credit note")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing & Finance
              </CardTitle>
              <CardDescription>Manage invoices, payments, and billing configuration</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Documents
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleAddPayment}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Add Payment
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAddCreditNote}>
                    <Receipt className="h-4 w-4 mr-2" />
                    Credit Note
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAddInvoice}>
                    <FileText className="h-4 w-4 mr-2" />
                    Add Invoice
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleGenerateStatement} disabled={generatingStatement}>
                    <Download className="h-4 w-4 mr-2" />
                    {generatingStatement ? "Generating..." : "Generate Statement"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={() => exportData("csv", "invoices")}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={loadBillingData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Account Balance</Label>
              <div className={`text-2xl font-bold ${customerSummary.balance < 0 ? "text-red-500" : "text-green-500"}`}>
                {formatCurrency(customerSummary.balance)}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Expiry Date</Label>
              <div className="text-lg font-medium flex items-center gap-2">
                {customerSummary.expiry_date ? (
                  <>
                    <Calendar className="h-4 w-4" />
                    {new Date(customerSummary.expiry_date).toLocaleDateString()}
                  </>
                ) : (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Payment Method</Label>
              <div className="text-lg font-medium">{customerSummary.payment_method}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Last Payment</Label>
              <div className="text-lg font-medium">
                {customerSummary.last_payment_date
                  ? new Date(customerSummary.last_payment_date).toLocaleDateString()
                  : "No payments"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents">Finance Documents</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="config">Billing Config</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Finance Documents
                  </CardTitle>
                  <CardDescription>All invoices, payments, and credit notes</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={documentFilter} onValueChange={setDocumentFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="invoice">Invoices</SelectItem>
                      <SelectItem value="payment">Payments</SelectItem>
                      <SelectItem value="credit_note">Credit Notes</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="quarter">This Quarter</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={`${doc.type}-${doc.id}`} className={doc.status === "overdue" ? "bg-red-50" : ""}>
                        <TableCell className="font-medium">{doc.id}</TableCell>
                        <TableCell>{getTypeBadge(doc.type)}</TableCell>
                        <TableCell className="font-mono text-sm">{doc.reference_number}</TableCell>
                        <TableCell>{doc.description}</TableCell>
                        <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(doc.total_amount)}</TableCell>
                        <TableCell>{doc.due_date ? new Date(doc.due_date).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {doc.type === "invoice" && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => handleViewInvoice(doc.id)}>
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(doc.id)}>
                                  <Download className="h-3 w-3" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleSendReminder(doc.id)}>
                                  <Send className="h-3 w-3" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleCopyInvoice(doc.id)}>
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {doc.type === "payment" && (
                              <Button variant="outline" size="sm" onClick={() => handleDownloadPayment(doc.id)}>
                                <Download className="h-3 w-3 mr-1" />
                                Receipt
                              </Button>
                            )}
                            {doc.type === "credit_note" && (
                              <Button variant="outline" size="sm" onClick={() => handleDownloadCreditNote(doc.id)}>
                                <Download className="h-3 w-3 mr-1" />
                                PDF
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteDocument(doc.id, doc.type)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Transaction History
                    </CardTitle>
                    <CardDescription>All financial transactions</CardDescription>
                  </div>
                  <Select value={transactionFilter} onValueChange={setTransactionFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="credit">Credits</SelectItem>
                      <SelectItem value="debit">Debits</SelectItem>
                      <SelectItem value="refund">Refunds</SelectItem>
                      <SelectItem value="adjustment">Adjustments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono text-sm">{transaction.transaction_id}</TableCell>
                          <TableCell>
                            <Badge variant={transaction.type === "credit" ? "default" : "secondary"}>
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                          <TableCell
                            className={`font-medium ${transaction.amount > 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {transaction.amount > 0 ? "+" : ""}
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell>{transaction.payment_method}</TableCell>
                          <TableCell className="font-mono text-sm">{transaction.reference}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(transaction.running_balance)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{transaction.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Distribution by transaction volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {paymentMethodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Transaction Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Total Paid</Label>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(customerSummary.total_paid)}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Total Outstanding</Label>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(customerSummary.total_outstanding)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Last Payment</Label>
                  <div className="text-lg font-medium">
                    {customerSummary.last_payment_date
                      ? new Date(customerSummary.last_payment_date).toLocaleDateString()
                      : "No payments recorded"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Billing Configuration
              </CardTitle>
              <CardDescription>Configure billing settings and automation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="billing-enabled"
                      checked={billingConfig.billing_enabled}
                      onCheckedChange={(checked) => setBillingConfig({ ...billingConfig, billing_enabled: checked })}
                    />
                    <Label htmlFor="billing-enabled">Billing Enabled</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment-period">Payment Period</Label>
                    <Select
                      value={billingConfig.payment_period}
                      onValueChange={(value) => setBillingConfig({ ...billingConfig, payment_period: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1_month">1 Month</SelectItem>
                        <SelectItem value="3_months">3 Months</SelectItem>
                        <SelectItem value="6_months">6 Months</SelectItem>
                        <SelectItem value="1_year">1 Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment-method">Payment Method</Label>
                    <Select
                      value={billingConfig.payment_method}
                      onValueChange={(value) => setBillingConfig({ ...billingConfig, payment_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit_order">Debit Order</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="mpesa">M-Pesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billing-day">Billing Day</Label>
                    <Input
                      id="billing-day"
                      type="number"
                      min="1"
                      max="31"
                      value={billingConfig.billing_day}
                      onChange={(e) =>
                        setBillingConfig({ ...billingConfig, billing_day: Number.parseInt(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="due-date-days">Due Date (days after billing)</Label>
                    <Input
                      id="due-date-days"
                      type="number"
                      min="1"
                      max="30"
                      value={billingConfig.due_date_days}
                      onChange={(e) =>
                        setBillingConfig({ ...billingConfig, due_date_days: Number.parseInt(e.target.value) })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grace-period">Grace Period (days)</Label>
                    <Input
                      id="grace-period"
                      type="number"
                      min="0"
                      max="30"
                      value={billingConfig.grace_period_days}
                      onChange={(e) =>
                        setBillingConfig({ ...billingConfig, grace_period_days: Number.parseInt(e.target.value) })
                      }
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto-create-invoices"
                      checked={billingConfig.auto_create_invoices}
                      onCheckedChange={(checked) =>
                        setBillingConfig({ ...billingConfig, auto_create_invoices: checked })
                      }
                    />
                    <Label htmlFor="auto-create-invoices">Auto-create Invoices</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto-pay"
                      checked={billingConfig.auto_pay_enabled}
                      onCheckedChange={(checked) => setBillingConfig({ ...billingConfig, auto_pay_enabled: checked })}
                    />
                    <Label htmlFor="auto-pay">Auto-pay Enabled</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reminder Settings</Label>
                <div className="text-sm text-muted-foreground">
                  Send payment reminders {billingConfig.reminder_days.join(", ")} days before due date
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveBillingConfig}>Save Configuration</Button>
                <Button variant="outline">Preview Invoice Template</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {customerData && (
        <>
          {showPaymentModal && (
            <PaymentModal
              customerId={Number(customerId)}
              customerName={customerData.name}
              onClose={() => setShowPaymentModal(false)}
              onSuccess={() => {
                setShowPaymentModal(false)
                loadBillingData()
              }}
            />
          )}

          <CreateInvoiceModal
            isOpen={showInvoiceModal}
            onClose={() => setShowInvoiceModal(false)}
            onInvoiceCreated={() => {
              loadBillingData()
            }}
            customerId={customerId}
          />

          {showCreditNoteModal && (
            <CreditNoteModal
              customerId={Number(customerId)}
              customerName={customerData.name}
              onClose={() => setShowCreditNoteModal(false)}
              onSuccess={() => {
                setShowCreditNoteModal(false)
                loadBillingData()
              }}
            />
          )}
        </>
      )}
    </div>
  )
}

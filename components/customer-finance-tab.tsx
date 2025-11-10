"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  CreditCard,
  FileText,
  DollarSign,
  Plus,
  Download,
  Send,
  RefreshCw,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Settings,
} from "lucide-react"
import { BillingConfigurationModal } from "./billing-configuration-modal"

interface CustomerFinanceTabProps {
  customerId: number
}

interface AccountBalance {
  current_balance: number
  credit_limit: number
  status: "active" | "overdue" | "suspended" | "closed"
  last_payment_date: string | null
  next_due_date: string | null
  days_until_due: number
}

interface Invoice {
  id: number
  invoice_number: string
  amount: number
  subtotal: number
  tax_amount: number
  discount_amount: number
  status: "pending" | "paid" | "overdue" | "cancelled"
  invoice_date: string
  due_date: string
  service_period_start: string
  service_period_end: string
  payment_date: string | null
  notes: string | null
  items: InvoiceItem[]
}

interface InvoiceItem {
  id: number
  description: string
  quantity: number
  unit_price: number
  total_amount: number
  service_plan_name?: string
}

interface Payment {
  id: number
  amount: number
  payment_method: string
  payment_date: string
  status: "completed" | "pending" | "failed"
  transaction_id: string | null
  reference_number: string | null
  invoice_id: number | null
  notes: string | null
  gateway_response: any
}

interface FinancialAdjustment {
  id: number
  adjustment_type: "credit" | "debit"
  amount: number
  reason: string
  reference_number: string | null
  status: "pending" | "approved" | "rejected"
  created_by: string
  created_at: string
  approved_at: string | null
}

interface PaymentReminder {
  id: number
  reminder_type: string
  amount: number
  due_date: string
  status: "scheduled" | "sent" | "failed"
  sent_at: string | null
}

interface BillingConfig {
  billing_cycle: string
  payment_method: string
  late_fee_percentage: string
  grace_period_days: string
  credit_limit: string
  auto_payment_enabled: boolean
}

interface CreditNoteForm {
  amount: string
  reason: string
  reference_invoice_id: string
}

interface StatementForm {
  from_date: string
  to_date: string
  statement_type: string
  format: string
}

interface CustomerService {
  id: number
  service_plan_name: string
  monthly_fee: number
  status: string
  start_date: string
  next_billing_date: string
}

interface ManualInvoiceItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface ManualInvoiceForm {
  items: ManualInvoiceItem[]
  notes: string
  due_date: string
}

export function CustomerFinanceTab({ customerId }: CustomerFinanceTabProps) {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  // State for financial data
  const [accountBalance, setAccountBalance] = useState<AccountBalance | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [adjustments, setAdjustments] = useState<FinancialAdjustment[]>([])
  const [reminders, setReminders] = useState<PaymentReminder[]>([])

  const [customerServices, setCustomerServices] = useState<CustomerService[]>([])
  const [showInvoiceOptionsModal, setShowInvoiceOptionsModal] = useState(false)
  const [showServiceInvoiceModal, setShowServiceInvoiceModal] = useState(false)
  const [showManualInvoiceModal, setShowManualInvoiceModal] = useState(false)
  const [selectedServices, setSelectedServices] = useState<number[]>([])
  const [manualInvoiceForm, setManualInvoiceForm] = useState<ManualInvoiceForm>({
    items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
    notes: "",
    due_date: "",
  })

  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false)
  const [showStatementModal, setShowStatementModal] = useState(false)
  const [showBillingConfigModal, setShowBillingConfigModal] = useState(false)

  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("mpesa")
  const [paymentReference, setPaymentReference] = useState("")

  const [adjustmentForm, setAdjustmentForm] = useState({
    type: "credit" as "credit" | "debit",
    amount: "",
    reason: "",
    reference_number: "",
  })

  const [billingConfig, setBillingConfig] = useState<BillingConfig>({
    billing_cycle: "monthly",
    payment_method: "mpesa",
    late_fee_percentage: "",
    grace_period_days: "",
    credit_limit: "",
    auto_payment_enabled: false,
  })

  const [creditNoteForm, setCreditNoteForm] = useState<CreditNoteForm>({
    amount: "",
    reason: "",
    reference_invoice_id: "",
  })

  const [statementForm, setStatementForm] = useState<StatementForm>({
    from_date: "",
    to_date: "",
    statement_type: "full",
    format: "pdf",
  })

  useEffect(() => {
    if (customerId) {
      console.log("[v0] CustomerFinanceTab: Loading data for customer", customerId)
      loadData()
    }
  }, [customerId])

  const loadData = async () => {
    setLoading(true)
    try {
      console.log("[v0] Loading financial data for customer:", customerId)

      // Load all financial data in parallel
      const [balanceResponse, invoicesResponse, paymentsResponse, adjustmentsResponse, servicesResponse] =
        await Promise.all([
          fetch(`/api/customers/${customerId}/finance/balance`),
          fetch(`/api/customers/${customerId}/finance/invoices`),
          fetch(`/api/customers/${customerId}/finance/payments`),
          fetch(`/api/customers/${customerId}/finance/adjustments`),
          fetch(`/api/customers/${customerId}/services`),
        ])

      console.log("[v0] API responses received")

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json()
        setAccountBalance(balanceData.balance)
        console.log("[v0] Balance loaded:", balanceData.balance)
      } else {
        console.error("[v0] Balance API failed:", await balanceResponse.text())
        // Set default balance if API fails
        setAccountBalance({
          current_balance: 0,
          credit_limit: 0,
          status: "active",
          last_payment_date: null,
          next_due_date: null,
          days_until_due: 0,
        })
      }

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json()
        setInvoices(invoicesData.invoices || [])
        console.log("[v0] Invoices loaded:", invoicesData.invoices?.length || 0)
      }

      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json()
        setPayments(paymentsData.payments || [])
        console.log("[v0] Payments loaded:", paymentsData.payments?.length || 0)
      }

      if (adjustmentsResponse.ok) {
        const adjustmentsData = await adjustmentsResponse.json()
        setAdjustments(adjustmentsData.adjustments || [])
        console.log("[v0] Adjustments loaded:", adjustmentsData.adjustments?.length || 0)
      }

      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json()
        setCustomerServices(servicesData.services || [])
        console.log("[v0] Services loaded:", servicesData.services?.length || 0)
      }
    } catch (error) {
      console.error("Error loading financial data:", error)
      toast.error("Failed to load financial data")
    } finally {
      setLoading(false)
    }
  }

  const handleMakePayment = async () => {
    if (!paymentAmount || !paymentMethod) {
      toast.error("Please enter amount and select payment method")
      return
    }

    try {
      console.log("[v0] Processing payment:", { amount: paymentAmount, method: paymentMethod })

      const loadingToast = toast.loading("Processing payment...")

      const response = await fetch(`/api/customers/${customerId}/finance/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number.parseFloat(paymentAmount),
          payment_method: paymentMethod,
          reference_number: paymentReference || `PAY-${customerId}-${Date.now()}`,
        }),
      })

      toast.dismiss(loadingToast)

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] Payment processed successfully:", result)
        toast.success(`Payment of KSH ${paymentAmount} processed successfully via ${paymentMethod}`)
        setShowPaymentModal(false)
        setPaymentAmount("")
        setPaymentMethod("mpesa")
        setPaymentReference("")
        // Force reload data to show updated payments
        await loadData()
      } else {
        const errorData = await response.json()
        console.error("[v0] Payment failed:", errorData)
        toast.error(`Payment failed: ${errorData.error || "Unknown error occurred"}`)
      }
    } catch (error) {
      console.error("Error processing payment:", error)
      toast.error(`Payment failed: ${error.message || "Network error occurred"}`)
    }
  }

  const handleFinancialAdjustment = async () => {
    if (!adjustmentForm.amount || !adjustmentForm.reason) {
      toast.error("Please enter amount and reason")
      return
    }

    try {
      console.log("[v0] Processing adjustment:", adjustmentForm)

      const loadingToast = toast.loading("Creating adjustment...")

      const response = await fetch(`/api/customers/${customerId}/finance/adjustments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustment_type: adjustmentForm.type,
          amount: Number.parseFloat(adjustmentForm.amount),
          reason: adjustmentForm.reason,
          reference_number: adjustmentForm.reference_number,
        }),
      })

      toast.dismiss(loadingToast)

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] Adjustment processed successfully:", result)
        toast.success(
          `${adjustmentForm.type === "credit" ? "Credit" : "Debit"} adjustment of KSH ${adjustmentForm.amount} created successfully`,
        )
        setShowAdjustmentModal(false)
        setAdjustmentForm({ type: "credit", amount: "", reason: "", reference_number: "" })
        // Force reload data to show updated adjustments
        await loadData()
      } else {
        const errorData = await response.json()
        console.error("[v0] Adjustment failed:", errorData)
        toast.error(`Adjustment failed: ${errorData.error || "Unknown error occurred"}`)
      }
    } catch (error) {
      console.error("Error creating adjustment:", error)
      toast.error(`Adjustment failed: ${error.message || "Network error occurred"}`)
    }
  }

  const handleIssueCreditNote = async () => {
    if (!creditNoteForm.amount || !creditNoteForm.reason) {
      toast.error("Please enter amount and reason")
      return
    }

    try {
      console.log("[v0] Processing credit note:", creditNoteForm)

      const loadingToast = toast.loading("Issuing credit note...")

      const response = await fetch(`/api/customers/${customerId}/finance/credit-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creditNoteForm),
      })

      toast.dismiss(loadingToast)

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] Credit note processed successfully:", result)
        toast.success(`Credit note of KSH ${creditNoteForm.amount} issued successfully`)
        setShowCreditNoteModal(false)
        setCreditNoteForm({ amount: "", reason: "", reference_invoice_id: "" })
        // Force reload data to show updated credit notes
        await loadData()
      } else {
        const errorData = await response.json()
        console.error("[v0] Credit note failed:", errorData)
        toast.error(`Credit note failed: ${errorData.error || "Unknown error occurred"}`)
      }
    } catch (error) {
      console.error("Error issuing credit note:", error)
      toast.error(`Credit note failed: ${error.message || "Network error occurred"}`)
    }
  }

  const handleGenerateManualInvoice = async () => {
    const validItems = manualInvoiceForm.items.filter(
      (item) => item.description.trim() && item.quantity > 0 && item.unit_price > 0,
    )

    if (validItems.length === 0) {
      toast.error("Please add at least one valid item")
      return
    }

    const loadingToast = toast.loading("Generating manual invoice...")

    try {
      const response = await fetch(`/api/customers/${customerId}/finance/invoices/generate-manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: validItems,
          notes: manualInvoiceForm.notes,
          due_date: manualInvoiceForm.due_date,
        }),
      })

      toast.dismiss(loadingToast)

      if (response.ok) {
        const data = await response.json()
        toast.success(`Invoice ${data.invoice.invoice_number} generated successfully!`)
        setShowManualInvoiceModal(false)
        setShowInvoiceOptionsModal(false)
        setManualInvoiceForm({
          items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
          notes: "",
          due_date: "",
        })
        loadData()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to generate manual invoice")
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      console.error("Error generating manual invoice:", error)
      toast.error("Network error. Please check your connection and try again.")
    }
  }

  const handleGenerateStatement = async () => {
    if (!statementForm.from_date || !statementForm.to_date) {
      toast.error("Please select both from and to dates")
      return
    }

    if (new Date(statementForm.from_date) > new Date(statementForm.to_date)) {
      toast.error("From date cannot be later than to date")
      return
    }

    try {
      const loadingToast = toast.loading("Generating statement...")

      const response = await fetch(`/api/customers/${customerId}/finance/statements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statementForm),
      })

      toast.dismiss(loadingToast)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `customer-${customerId}-statement-${statementForm.from_date}-${statementForm.to_date}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success(`Statement generated and downloaded successfully!`)
        setShowStatementModal(false)
        setStatementForm({ from_date: "", to_date: "", statement_type: "full", format: "pdf" })
      } else {
        const errorData = await response.json()
        toast.error(`Statement generation failed: ${errorData.error || "Unknown error occurred"}`)
      }
    } catch (error) {
      console.error("Error generating statement:", error)
      toast.error(`Network error. Please check your connection and try again.`)
    }
  }

  const handleGenerateInvoice = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}/finance/invoices/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        toast.success("Invoice generated successfully")
        setShowInvoiceModal(false)
        loadData()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to generate invoice")
      }
    } catch (error) {
      console.error("Error generating invoice:", error)
      toast.error("Failed to generate invoice")
    }
  }

  const handleSendReminder = async (invoiceId: number) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/finance/invoices/${invoiceId}/remind`, {
        method: "POST",
      })

      if (response.ok) {
        toast.success("Payment reminder sent successfully")
        loadData()
      } else {
        toast.error("Failed to send reminder")
      }
    } catch (error) {
      console.error("Error sending reminder:", error)
      toast.error("Failed to send reminder")
    }
  }

  const handleDownloadInvoice = async (invoiceId: number) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/finance/invoices/${invoiceId}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `invoice-${invoiceId}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        toast.error("Failed to download invoice")
      }
    } catch (error) {
      console.error("Error downloading invoice:", error)
      toast.error("Failed to download invoice")
    }
  }

  const handleExportData = async (type: "csv" | "pdf" | "excel", dataType: "invoices" | "payments" | "all") => {
    try {
      const response = await fetch(`/api/customers/${customerId}/finance/export?type=${type}&data=${dataType}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `customer-${customerId}-finance-${dataType}.${type}`
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success("Data exported successfully")
      } else {
        toast.error("Failed to export data")
      }
    } catch (error) {
      console.error("Error exporting data:", error)
      toast.error("Failed to export data")
    }
  }

  const handleGenerateServiceInvoice = async () => {
    if (selectedServices.length === 0) {
      toast.error("Please select at least one service")
      return
    }

    try {
      const response = await fetch(`/api/customers/${customerId}/finance/invoices/generate-service`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_ids: selectedServices,
        }),
      })

      if (response.ok) {
        toast.success("Service invoice generated successfully")
        setShowServiceInvoiceModal(false)
        setShowInvoiceOptionsModal(false)
        setSelectedServices([])
        loadData()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to generate service invoice")
      }
    } catch (error) {
      console.error("Error generating service invoice:", error)
      toast.error("Failed to generate service invoice")
    }
  }

  const addManualInvoiceItem = () => {
    setManualInvoiceForm({
      ...manualInvoiceForm,
      items: [...manualInvoiceForm.items, { description: "", quantity: 1, unit_price: 0, total: 0 }],
    })
  }

  const removeManualInvoiceItem = (index: number) => {
    const newItems = manualInvoiceForm.items.filter((_, i) => i !== index)
    setManualInvoiceForm({ ...manualInvoiceForm, items: newItems })
  }

  const updateManualInvoiceItem = (index: number, field: keyof ManualInvoiceItem, value: string | number) => {
    const newItems = [...manualInvoiceForm.items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Calculate total for the item
    if (field === "quantity" || field === "unit_price") {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price
    }

    setManualInvoiceForm({ ...manualInvoiceForm, items: newItems })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "bg-green-500", icon: CheckCircle },
      paid: { color: "bg-green-500", icon: CheckCircle },
      pending: { color: "bg-yellow-500", icon: Clock },
      overdue: { color: "bg-red-500", icon: AlertCircle },
      suspended: { color: "bg-red-500", icon: AlertCircle },
      closed: { color: "bg-gray-500", icon: AlertCircle },
      completed: { color: "bg-green-500", icon: CheckCircle },
      failed: { color: "bg-red-500", icon: AlertCircle },
      cancelled: { color: "bg-gray-500", icon: AlertCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const handleGenerateInvoiceClick = () => {
    setShowInvoiceOptionsModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Account Balance & Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Current Balance</Label>
              <div
                className={`text-3xl font-bold ${accountBalance?.current_balance && accountBalance.current_balance < 0 ? "text-red-500" : "text-green-500"}`}
              >
                {formatCurrency(accountBalance?.current_balance || 0)}
              </div>
              {getStatusBadge(accountBalance?.status || "active")}
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Credit Limit</Label>
              <div className="text-xl font-medium">{formatCurrency(accountBalance?.credit_limit || 0)}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Next Due Date</Label>
              <div className="text-lg font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {accountBalance?.next_due_date
                  ? new Date(accountBalance.next_due_date).toLocaleDateString()
                  : "No pending dues"}
              </div>
              {accountBalance?.days_until_due !== undefined && (
                <div
                  className={`text-sm ${accountBalance.days_until_due < 0 ? "text-red-500" : accountBalance.days_until_due <= 5 ? "text-yellow-500" : "text-green-500"}`}
                >
                  {accountBalance.days_until_due < 0
                    ? `${Math.abs(accountBalance.days_until_due)} days overdue`
                    : `${accountBalance.days_until_due} days remaining`}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Last Payment</Label>
              <div className="text-lg font-medium">
                {accountBalance?.last_payment_date
                  ? new Date(accountBalance.last_payment_date).toLocaleDateString()
                  : "No payments"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Button onClick={() => setShowPaymentModal(true)} className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Make Payment
            </Button>
            <Button
              onClick={() => setShowBillingConfigModal(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Billing Config
            </Button>
            <Button
              onClick={handleGenerateInvoiceClick}
              variant="outline"
              className="flex items-center gap-2 bg-transparent"
            >
              <FileText className="w-4 h-4" />
              Generate Invoice
            </Button>
            <Button onClick={() => setShowAdjustmentModal(true)} variant="outline" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Add Adjustment
            </Button>
            <Button onClick={() => setShowCreditNoteModal(true)} variant="outline" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Credit Note
            </Button>
            <Button onClick={() => setShowStatementModal(true)} variant="outline" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Statement
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportData("pdf", "all")}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportData("excel", "all")}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <Dialog open={showInvoiceOptionsModal} onOpenChange={setShowInvoiceOptionsModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Invoice</DialogTitle>
              <DialogDescription>Choose the type of invoice to generate</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Button
                onClick={() => {
                  setShowInvoiceOptionsModal(false)
                  setShowServiceInvoiceModal(true)
                }}
                className="w-full justify-start"
                variant="outline"
              >
                <FileText className="w-4 h-4 mr-2" />
                Service Invoice - Generate for internet services
              </Button>
              <Button
                onClick={() => {
                  setShowInvoiceOptionsModal(false)
                  setShowManualInvoiceModal(true)
                }}
                className="w-full justify-start"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Manual Invoice - Create custom invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showServiceInvoiceModal} onOpenChange={setShowServiceInvoiceModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate Service Invoice</DialogTitle>
              <DialogDescription>Select services to include in the invoice</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {customerServices.length === 0 ? (
                <p className="text-muted-foreground">No active services found for this customer.</p>
              ) : (
                <div className="space-y-3">
                  {customerServices.map((service) => (
                    <div key={service.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <input
                        type="checkbox"
                        id={`service-${service.id}`}
                        checked={selectedServices.includes(service.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedServices([...selectedServices, service.id])
                          } else {
                            setSelectedServices(selectedServices.filter((id) => id !== service.id))
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor={`service-${service.id}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{service.service_plan_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(service.monthly_fee)} / month
                          {service.next_billing_date && (
                            <span className="ml-2">
                              Next billing: {new Date(service.next_billing_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </label>
                      <Badge variant={service.status === "active" ? "default" : "secondary"}>{service.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleGenerateServiceInvoice}
                  disabled={selectedServices.length === 0}
                  className="flex-1"
                >
                  Generate Invoice for Selected Services
                </Button>
                <Button variant="outline" onClick={() => setShowServiceInvoiceModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showManualInvoiceModal} onOpenChange={setShowManualInvoiceModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Manual Invoice</DialogTitle>
              <DialogDescription>Add custom items to create a manual invoice</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-medium">Invoice Items</Label>
                  <Button onClick={addManualInvoiceItem} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {manualInvoiceForm.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                    <div className="col-span-5">
                      <Label htmlFor={`desc-${index}`}>Description</Label>
                      <Input
                        id={`desc-${index}`}
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => updateManualInvoiceItem(index, "description", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`qty-${index}`}>Quantity</Label>
                      <Input
                        id={`qty-${index}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateManualInvoiceItem(index, "quantity", Number.parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`price-${index}`}>Unit Price</Label>
                      <Input
                        id={`price-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) =>
                          updateManualInvoiceItem(index, "unit_price", Number.parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Total</Label>
                      <div className="text-lg font-medium py-2">{formatCurrency(item.total)}</div>
                    </div>
                    <div className="col-span-1">
                      {manualInvoiceForm.items.length > 1 && (
                        <Button
                          onClick={() => removeManualInvoiceItem(index)}
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice-notes">Notes (Optional)</Label>
                  <Textarea
                    id="invoice-notes"
                    placeholder="Additional notes for the invoice"
                    value={manualInvoiceForm.notes}
                    onChange={(e) => setManualInvoiceForm({ ...manualInvoiceForm, notes: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="due-date">Due Date</Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={manualInvoiceForm.due_date}
                    onChange={(e) => setManualInvoiceForm({ ...manualInvoiceForm, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-medium">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(manualInvoiceForm.items.reduce((sum, item) => sum + item.total, 0))}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleGenerateManualInvoice} className="flex-1">
                  Generate Manual Invoice
                </Button>
                <Button variant="outline" onClick={() => setShowManualInvoiceModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Invoice</DialogTitle>
              <DialogDescription>Generate a new invoice for current services</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p>This will generate an invoice for all active services for the current billing period.</p>
              <Button onClick={handleGenerateInvoice} className="w-full">
                Generate Invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Make Payment</DialogTitle>
              <DialogDescription>Process payment for outstanding invoices</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="paymentAmount">Payment Amount</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paymentReference">Reference Number</Label>
                <Input
                  id="paymentReference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Payment reference"
                />
              </div>
              <Button onClick={handleMakePayment} className="w-full">
                Process Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAdjustmentModal} onOpenChange={setShowAdjustmentModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Financial Adjustment</DialogTitle>
              <DialogDescription>Add credit or debit adjustment to customer account</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Adjustment Type</Label>
                <Select
                  value={adjustmentForm.type}
                  onValueChange={(value: "credit" | "debit") => setAdjustmentForm({ ...adjustmentForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit (Add Money)</SelectItem>
                    <SelectItem value="debit">Debit (Charge Money)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="adj-amount">Amount (KES)</Label>
                <Input
                  id="adj-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={adjustmentForm.amount}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Reason for adjustment"
                  value={adjustmentForm.reason}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="adj-reference">Reference Number (Optional)</Label>
                <Input
                  id="adj-reference"
                  placeholder="Reference number"
                  value={adjustmentForm.reference_number}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reference_number: e.target.value })}
                />
              </div>
              <Button onClick={handleFinancialAdjustment} className="w-full">
                Create Adjustment
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showCreditNoteModal} onOpenChange={setShowCreditNoteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue Credit Note</DialogTitle>
              <DialogDescription>Create a credit note for the customer</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="credit-amount">Credit Amount (KES)</Label>
                <Input
                  id="credit-amount"
                  type="number"
                  placeholder="Enter credit amount"
                  value={creditNoteForm.amount}
                  onChange={(e) => setCreditNoteForm({ ...creditNoteForm, amount: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="credit-reason">Reason</Label>
                <Textarea
                  id="credit-reason"
                  placeholder="Reason for credit note"
                  value={creditNoteForm.reason}
                  onChange={(e) => setCreditNoteForm({ ...creditNoteForm, reason: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="credit-reference">Reference Invoice (Optional)</Label>
                <Select
                  value={creditNoteForm.reference_invoice_id}
                  onValueChange={(value) => setCreditNoteForm({ ...creditNoteForm, reference_invoice_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id.toString()}>
                        {invoice.invoice_number} - {formatCurrency(invoice.amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleIssueCreditNote} className="w-full">
                Issue Credit Note
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showStatementModal} onOpenChange={setShowStatementModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Statement</DialogTitle>
              <DialogDescription>Generate account statement for the customer</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="statement-from">From Date</Label>
                  <Input
                    id="statement-from"
                    type="date"
                    value={statementForm.from_date}
                    onChange={(e) => setStatementForm({ ...statementForm, from_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="statement-to">To Date</Label>
                  <Input
                    id="statement-to"
                    type="date"
                    value={statementForm.to_date}
                    onChange={(e) => setStatementForm({ ...statementForm, to_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Statement Type</Label>
                <Select
                  value={statementForm.statement_type}
                  onValueChange={(value) => setStatementForm({ ...statementForm, statement_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Statement</SelectItem>
                    <SelectItem value="summary">Summary Statement</SelectItem>
                    <SelectItem value="payments_only">Payments Only</SelectItem>
                    <SelectItem value="invoices_only">Invoices Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Format</Label>
                <Select
                  value={statementForm.format}
                  onValueChange={(value) => setStatementForm({ ...statementForm, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGenerateStatement} className="w-full">
                Generate Statement
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <BillingConfigurationModal
          customerId={customerId}
          isOpen={showBillingConfigModal}
          onClose={() => setShowBillingConfigModal(false)}
          onSave={loadData}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Invoices</CardTitle>
                  <CardDescription>All customer invoices and billing documents</CardDescription>
                </div>
                <Button onClick={() => setShowInvoiceModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Invoice
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(invoice.id)}>
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleSendReminder(invoice.id)}>
                              <Send className="h-3 w-3" />
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

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Payments</CardTitle>
                  <CardDescription>All customer payments and transactions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Transaction ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No payments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.reference_number || `PAY-${payment.id}`}
                          </TableCell>
                          <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                          <TableCell className="capitalize">{payment.payment_method}</TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>{payment.transaction_id || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

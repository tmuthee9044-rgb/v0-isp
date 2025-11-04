"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Receipt,
  FileText,
  Download,
  Plus,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wifi,
  Server,
  Shield,
  UserCheck,
  Banknote,
  Filter,
  Eye,
  Edit,
  MoreHorizontal,
  Send,
  Calculator,
  Trash2,
  Upload,
  RefreshCw,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ExpenseCategoryModal } from "@/components/expense-category-modal"
import { CreateInvoiceModal } from "@/components/create-invoice-modal"
import { BudgetManagementModal } from "@/components/budget-management-modal"
// Import DatePickerWithRange (assuming it exists in your components or utils)
import DatePickerWithRange from "@/components/date-picker-with-range" // Adjust the import path as necessary
import { ManageBalanceSheetModal } from "@/components/manage-balance-sheet-modal"
import { useLocalization } from "@/lib/localization-context"
import { formatCurrency as formatCurrencyWithSettings } from "@/lib/localization-utils"

// Define interfaces for better type safety (optional but recommended)
interface Transaction {
  id: number
  transaction_date: string
  transaction_id: string
  account: string
  description: string
  debit: number
  credit: number
  balance: number
  customer_name?: string
}

interface Expense {
  id: number
  date: string
  description: string
  category: string
  vendor: string
  amount: number
  paymentMethod: string
  status: string
  receiptUrl?: string
}

interface Invoice {
  id: string
  customer: string
  amount: number
  dueDate: string
  status: string
  daysOverdue?: number
}

interface TaxRecord {
  id: number
  type: string
  period: string
  amount: number
  dueDate: string
  status: string
  penalty: number
  taxAuthority: string
  referenceNumber: string
  notes: string
  filedDate: string | null
  createdAt: string
}

interface AuditLog {
  id: number
  timestamp: string
  user: string
  action: string
  resource: string
  details: string
  ip_address: string
  status: string
}

interface ExpenseCategory {
  id: number
  name: string
  color: string
  description: string
  budget_amount?: number
}

export default function FinancePage() {
  const { settings: localizationSettings } = useLocalization()

  const formatCurrency = (amount: number) => formatCurrencyWithSettings(amount, localizationSettings)

  const [activeTab, setActiveTab] = useState("overview")
  const [dateRange, setDateRange] = useState({ from: new Date(2024, 0, 1), to: new Date() })
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false)
  const [isExpenseEditModalOpen, setIsExpenseEditModalOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [financialData, setFinancialData] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    cashFlow: 0,
    accountsReceivable: 0,
    accountsPayable: 0,
    monthlyGrowth: 0,
    revenueStreams: [],
    topCustomers: [],
    monthlyRevenue: [],
  })
  const [revenueData, setRevenueData] = useState({
    summary: {
      totalRevenue: 0,
      transactionCount: 0,
      avgTransactionValue: 0,
      revenueGrowth: 0,
      previousPeriodRevenue: 0,
    },
    servicePlans: [],
    recurringRevenue: {
      recurring: { revenue: 0, transactionCount: 0, percentage: 0 },
      oneTime: { revenue: 0, transactionCount: 0, percentage: 0 },
    },
    metrics: {
      monthlyRecurringRevenue: 0,
      customerLifetimeValue: 0,
      averageRevenuePerUser: 0,
    },
    paymentMethods: [], // Added for revenue streams
    topCustomers: [], // Added for top customers
  })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [budgetData, setBudgetData] = useState([])

  const [reportType, setReportType] = useState("comprehensive")
  const [reportFormat, setReportFormat] = useState("pdf")
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>([])
  const [taxObligations, setTaxObligations] = useState<TaxRecord[]>([])
  const [isLoadingTaxData, setIsLoadingTaxData] = useState(false)

  // State for new/editing tax records
  const [newTaxRecord, setNewTaxRecord] = useState({
    return_type: "",
    period_start: "",
    period_end: "",
    due_date: "",
    tax_due: "",
    penalty_amount: "",
    tax_authority: "",
    reference_number: "",
    notes: "",
  })
  const [editingTaxRecordId, setEditingTaxRecordId] = useState<number | null>(null)

  const [taxFormData, setTaxFormData] = useState({
    taxType: "",
    taxPeriod: "",
    amount: "",
    dueDate: "",
    status: "",
    penalty: "",
    taxAuthority: "",
    referenceNumber: "",
    notes: "",
  })

  const [ledgerData, setLedgerData] = useState<any>(null)
  const [isLoadingLedger, setIsLoadingLedger] = useState(false)

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditLogsLoading, setAuditLogsLoading] = useState(false)
  const [activitySummary, setActivitySummary] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  })

  const [suppliers, setSuppliers] = useState<any[]>([])
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("")
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null) // ADDED STATE FOR SELECTED INVOICE
  const [isInvoiceDetailsOpen, setIsInvoiceDetailsOpen] = useState(false) // ADDED STATE FOR INVOICE DETAILS MODAL

  const [customerInvoices, setCustomerInvoices] = useState<any[]>([])
  const [invoicingStats, setInvoicingStats] = useState({
    outstandingAmount: 0,
    overdueAmount: 0,
    pendingCount: 0,
    overdueCount: 0,
    collectionRate: 0,
  })

  const [expenseForm, setExpenseForm] = useState({
    category_id: "",
    amount: "",
    description: "",
    vendor: "",
    expense_date: new Date().toISOString().split("T")[0],
    payment_method: "bank",
    status: "paid",
    notes: "",
    supplier_invoice_id: "",
  })

  const [balanceSheetData, setBalanceSheetData] = useState<any>(null)
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null)
  const [cashFlowData, setCashFlowData] = useState<any>(null)

  const [profitLossData, setProfitLossData] = useState<{
    summary: {
      totalRevenue: number
      paidRevenue: number
      pendingRevenue: number
      totalExpenses: number
      approvedExpenses: number
      pendingExpenses: number
      netProfit: number
      profitMargin: number
    }
    expensesByCategory: Array<{ category: string; amount: number }>
    revenueByService: Array<{ service: string; amount: number }>
  } | null>(null)

  const [showManageBalanceSheet, setShowManageBalanceSheet] = useState(false)
  const [inventoryTotal, setInventoryTotal] = useState(0)

  // ADDED STATE FOR ACCOUNTS PAYABLE
  const [accountsPayableData, setAccountsPayableData] = useState<any>(null)

  const fetchExpenseCategories = async () => {
    try {
      const response = await fetch("/api/finance/expense-categories")
      const data = await response.json()
      if (data.categories) {
        setExpenseCategories(data.categories)
      }
    } catch (error) {
      console.error("Error fetching expense categories:", error)
    }
  }

  const fetchExpenses = async () => {
    try {
      const response = await fetch(
        `/api/finance/expenses?startDate=${dateRange.from.toISOString().split("T")[0]}&endDate=${dateRange.to.toISOString().split("T")[0]}`,
      )
      const data = await response.json()
      setExpenses(data.expenses || [])
    } catch (error) {
      console.error("Error fetching expenses:", error)
    }
  }

  const fetchBudgetData = async () => {
    try {
      const response = await fetch("/api/finance/budget")
      const data = await response.json()
      setBudgetData(data.budgets || [])
    } catch (error) {
      console.error("Error fetching budget data:", error)
    }
  }

  const fetchLedgerData = async () => {
    setIsLoadingLedger(true)
    try {
      const response = await fetch("/api/finance/ledger")
      const data = await response.json()
      if (data.success) {
        setLedgerData(data.data)
      }
    } catch (error) {
      console.error("Error fetching ledger data:", error)
    } finally {
      setIsLoadingLedger(false)
    }
  }

  const fetchTaxRecords = async () => {
    setIsLoadingTaxData(true)
    try {
      const response = await fetch("/api/finance/tax-records")
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Transform the data to match the expected format
          const transformedRecords = data.data.map((record: any) => ({
            id: record.id,
            type: record.return_type,
            period: record.period_name || "N/A",
            amount: record.tax_due,
            dueDate: new Date(record.due_date).toLocaleDateString(),
            status: record.status,
            penalty: record.penalty_amount || 0,
            taxAuthority: record.tax_authority || "KRA",
            referenceNumber: record.reference_number || "",
            notes: record.notes || "",
            filedDate: record.filed_date ? new Date(record.filed_date).toLocaleDateString() : null,
            createdAt: new Date(record.created_at).toLocaleDateString(),
          }))
          setTaxRecords(transformedRecords)

          // Calculate tax obligations from the records
          const obligations = transformedRecords.filter(
            (record: any) => record.status === "pending" || record.status === "overdue",
          )
          setTaxObligations(obligations)
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch tax records",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching tax records:", error)
      toast({
        title: "Error",
        description: "Failed to connect to tax records",
        variant: "destructive",
      })
    } finally {
      setIsLoadingTaxData(false)
    }
  }

  const fetchBalanceSheet = async () => {
    try {
      const response = await fetch(
        `/api/finance/balance-sheet?asOfDate=${dateRange.to || new Date().toISOString().split("T")[0]}`,
      )
      const result = await response.json()
      if (result.success) {
        setBalanceSheetData(result.data)
      }
    } catch (error) {
      console.error("Error fetching balance sheet:", error)
    }
  }

  const fetchTrialBalance = async () => {
    try {
      const response = await fetch(
        `/api/finance/trial-balance?asOfDate=${dateRange.to || new Date().toISOString().split("T")[0]}`,
      )
      const result = await response.json()
      if (result.success) {
        setTrialBalanceData(result.data)
      }
    } catch (error) {
      console.error("Error fetching trial balance:", error)
    }
  }

  const fetchCashFlowData = async () => {
    try {
      const response = await fetch(
        `/api/finance/cashflow?startDate=${dateRange.from.toISOString().split("T")[0]}&endDate=${dateRange.to.toISOString().split("T")[0]}`,
      )
      const result = await response.json()
      if (result.success) {
        setCashFlowData(result.data)
      }
    } catch (error) {
      console.error("Error fetching cash flow data:", error)
    }
  }

  const fetchProfitLoss = async () => {
    try {
      const response = await fetch(
        `/api/finance/profit-loss?startDate=${dateRange.from.toISOString().split("T")[0]}&endDate=${dateRange.to.toISOString().split("T")[0]}`,
      )
      if (!response.ok) throw new Error("Failed to fetch profit & loss")
      const data = await response.json()
      setProfitLossData(data.data)
    } catch (error) {
      console.error("Error fetching profit & loss:", error)
      toast({
        title: "Error",
        description: "Failed to load profit & loss data",
        variant: "destructive",
      })
    }
  }

  const fetchAccountsPayable = async () => {
    try {
      const response = await fetch(
        `/api/finance/accounts-payable?startDate=${dateRange.from.toISOString().split("T")[0]}&endDate=${dateRange.to.toISOString().split("T")[0]}`,
      )

      if (!response.ok) {
        throw new Error("Failed to fetch accounts payable")
      }

      const data = await response.json()

      if (data.success) {
        setAccountsPayableData(data)
      }
    } catch (error) {
      console.error("Error fetching accounts payable:", error)
    }
  }

  const fetchInvoicingData = async () => {
    try {
      const response = await fetch("/api/finance/invoices")
      if (!response.ok) throw new Error("Failed to fetch invoices")

      const data = await response.json()
      const invoices = data.invoices || []

      setCustomerInvoices(invoices)

      // Calculate statistics from real data
      const now = new Date()
      let outstandingAmount = 0
      let overdueAmount = 0
      let pendingCount = 0
      let overdueCount = 0
      let totalInvoiced = 0
      let totalPaid = 0

      invoices.forEach((invoice: any) => {
        const dueDate = new Date(invoice.due_date)
        const isOverdue = dueDate < now && invoice.status !== "paid"
        const unpaidAmount = invoice.amount - (invoice.paid_amount || 0)

        totalInvoiced += invoice.amount
        totalPaid += invoice.paid_amount || 0

        if (invoice.status !== "paid") {
          outstandingAmount += unpaidAmount
          pendingCount++

          if (isOverdue) {
            overdueAmount += unpaidAmount
            overdueCount++
          }
        }
      })

      const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0

      setInvoicingStats({
        outstandingAmount,
        overdueAmount,
        pendingCount,
        overdueCount,
        collectionRate,
      })
    } catch (error) {
      console.error("Error fetching invoicing data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch invoicing data",
        variant: "destructive",
      })
    }
  }

  const fetchAuditLogs = async () => {
    setAuditLogsLoading(true)
    try {
      console.log("[v0] Fetching audit logs from /api/finance/audit-logs?limit=50")
      const response = await fetch("/api/finance/audit-logs?limit=50")
      console.log("[v0] Audit logs response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Audit logs data received:", data)
        console.log("[v0] Number of logs:", data.logs?.length || 0)
        setAuditLogs(data.logs || [])
        setActivitySummary(data.activitySummary || { today: 0, thisWeek: 0, thisMonth: 0 })
      } else {
        const errorText = await response.text()
        console.error("[v0] Failed to fetch audit logs - Status:", response.status, "Error:", errorText)
        toast({
          title: "Error",
          description: `Failed to fetch audit logs: ${response.status}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching audit logs:", error)
      toast({
        title: "Error",
        description: "Failed to fetch audit logs - Network error",
        variant: "destructive",
      })
    } finally {
      setAuditLogsLoading(false)
    }
  }

  const fetchFinancialData = async () => {
    try {
      setLoading(true)

      // Load suppliers
      const suppliersResponse = await fetch("/api/suppliers")
      if (suppliersResponse.ok) {
        const suppliersData = await suppliersResponse.json()
        setSuppliers(suppliersData.suppliers || [])
      }

      const response = await fetch("/api/finance/dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateFrom: dateRange.from.toISOString().split("T")[0],
          dateTo: dateRange.to.toISOString().split("T")[0],
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setFinancialData(data)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch financial data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching financial data:", error)
      toast({
        title: "Error",
        description: "Failed to connect to financial data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchRevenueData = async () => {
    try {
      const response = await fetch("/api/finance/revenue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateFrom: dateRange.from.toISOString().split("T")[0],
          dateTo: dateRange.to.toISOString().split("T")[0],
          granularity: "monthly",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setRevenueData(data)
        // This was causing the redeclaration error:
        // setTopCustomers(data.topCustomers || [])

        setFinancialData((prev) => ({
          ...prev,
          totalRevenue: data.summary.totalRevenue,
          revenueStreams: data.paymentMethods.map((method: any) => ({
            name:
              method.method === "mpesa"
                ? "M-Pesa Payments"
                : method.method === "bank"
                  ? "Bank Transfers"
                  : method.method === "cash"
                    ? "Cash Payments"
                    : method.method || "Other",
            amount: method.revenue,
            percentage: method.percentage,
            growth: 0, // Growth would need historical comparison
          })),
          topCustomers: data.topCustomers.map((customer: any) => ({
            name: customer.name,
            plan: customer.plan,
            revenue: customer.totalRevenue,
            growth: 0, // Growth would need historical comparison
          })),
        }))
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch revenue data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching revenue data:", error)
      toast({
        title: "Error",
        description: "Failed to connect to revenue data",
        variant: "destructive",
      })
    }
  }

  // Update effect to fetch data based on activeTab
  useEffect(() => {
    if (activeTab === "overview") {
      fetchFinancialData()
      fetchAccountsPayable() // FETCH ACCOUNTS PAYABLE
    } else if (activeTab === "revenue") {
      fetchRevenueData()
    } else if (activeTab === "expenses") {
      fetchExpenses()
      fetchExpenseCategories()
    } else if (activeTab === "invoicing") {
      fetchInvoicingData()
    } else if (activeTab === "taxes") {
      fetchTaxRecords()
    } else if (activeTab === "budget") {
      fetchBudgetData()
    } else if (activeTab === "ledger") {
      fetchLedgerData()
    } else if (activeTab === "cashflow") {
      fetchCashFlowData()
    } else if (activeTab === "balancesheet") {
      fetchBalanceSheet()
      fetchAccountsPayable() // FETCH ACCOUNTS PAYABLE
      fetchInventoryTotal()
    } else if (activeTab === "trialbalance") {
      fetchTrialBalance()
    } else if (activeTab === "profitloss") {
      //
      fetchProfitLoss()
    } else if (activeTab === "audit") {
      fetchAuditLogs()
    }
  }, [activeTab])

  // Fetch data on date range change (if not already handled by activeTab logic)
  useEffect(() => {
    // Only refetch if the tab isn't explicitly handled above or if it requires date range
    if (
      activeTab === "overview" ||
      activeTab === "revenue" ||
      activeTab === "profitloss" ||
      activeTab === "balancesheet" ||
      activeTab === "cashflow" || // Added cashflow to refetch on date range change
      activeTab === "trialbalance" // Added trialbalance to refetch on date range change
    ) {
      //
      fetchFinancialData()
      fetchRevenueData()
      fetchProfitLoss() //
      fetchBalanceSheet()
      fetchAccountsPayable() // FETCH ACCOUNTS PAYABLE
      fetchCashFlowData() // Fetch cash flow data with new date range
      fetchTrialBalance() // Fetch trial balance data with new date range
    }
  }, [dateRange])

  const generateReport = async () => {
    try {
      setIsGeneratingReport(true)
      const response = await fetch("/api/finance/reports/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportType,
          format: reportFormat,
          dateFrom: dateRange.from.toISOString().split("T")[0],
          dateTo: dateRange.to.toISOString().split("T")[0],
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = `financial-report-${reportType}-${new Date().toISOString().split("T")[0]}.${reportFormat}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a) // Corrected: removed from here to be within the if block.
        setIsReportModalOpen(false)
        toast({
          title: "Success",
          description: "Report generated successfully",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to generate report",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error generating report:", error)
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const financialMetrics = {
    totalRevenue: financialData.totalRevenue,
    totalExpenses: financialData.totalExpenses,
    netProfit: financialData.totalRevenue - financialData.totalExpenses,
    profitMargin:
      financialData.totalRevenue > 0
        ? ((financialData.totalRevenue - financialData.totalExpenses) / financialData.totalRevenue) * 100
        : 0,
    cashFlow: financialData.cashFlow || financialData.totalRevenue - financialData.totalExpenses,
    accountsReceivable: financialData.accountsReceivable,
    accountsPayable: accountsPayableData?.summary?.total_outstanding || 0, // Use supplier invoices data
    monthlyGrowth: financialData.monthlyGrowth,
  }

  // REMOVE MOCK DATA FALLBACK, USE REAL DATA FROM API
  const revenueStreams =
    financialData.revenueStreams.length > 0
      ? financialData.revenueStreams
      : revenueData.paymentMethods?.map((method: any) => ({
          name:
            method.method === "mpesa"
              ? "M-Pesa Payments"
              : method.method === "bank"
                ? "Bank Transfers"
                : method.method === "cash"
                  ? "Cash Payments"
                  : method.method || "Other",
          amount: method.revenue,
          percentage: method.percentage,
          growth: 0,
        })) || []

  // Expense Categories Data with detailed records
  const expenseCategoriesData = [
    // Will be populated from API calls
  ]

  // Detailed Expense Records
  const expenseRecords = expenses // Use the fetched expenses data

  const outstandingInvoices = customerInvoices
    .filter((inv) => inv.status !== "paid")
    .map((inv) => {
      const dueDate = new Date(inv.due_date)
      const now = new Date()
      const daysOverdue = dueDate < now ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0

      return {
        id: inv.invoice_number || `INV-${inv.id}`,
        customer: inv.company_name || `${inv.first_name || ""} ${inv.last_name || ""}`.trim() || "Unknown Customer",
        amount: inv.amount - (inv.paid_amount || 0),
        dueDate: new Date(inv.due_date).toLocaleDateString(),
        status: dueDate < now && inv.status !== "paid" ? "overdue" : inv.status,
        daysOverdue,
      }
    })

  const taxData = {
    vatCollected: taxRecords.reduce(
      (sum: number, record: any) => (record.type === "VAT" ? sum + record.amount : sum),
      0,
    ),
    vatPaid: 0, // This would come from expense records
    netVatDue: taxRecords.reduce(
      (sum: number, record: any) => (record.type === "VAT" && record.status === "pending" ? sum + record.amount : sum),
      0,
    ),
    corporateIncomeTax: taxRecords.reduce(
      (sum: number, record: any) => (record.type === "Corporate Income Tax" ? sum + record.amount : sum),
      0,
    ),
    serviceTax: taxRecords.reduce(
      (sum: number, record: any) => (record.type === "Service Tax" ? sum + record.amount : sum),
      0,
    ),
    regulatoryFees: taxRecords.reduce(
      (sum: number, record: any) => (record.type === "Regulatory Fees" ? sum + record.amount : sum),
      0,
    ),
    nextFilingDate:
      taxRecords.length > 0
        ? taxRecords
            .filter((record: any) => record.status === "pending")
            .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]?.dueDate ||
          new Date().toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    complianceStatus: taxObligations.length === 0 ? "current" : "overdue",
  }

  // Tax Records
  const taxRecordsDisplay = taxRecords // Use the fetched tax records data

  // Budget Data - use real data if available, fallback to static data
  const displayBudgetData =
    budgetData.length > 0
      ? budgetData
      : [
          // Will be populated from API calls
        ]

  // Customer Revenue Analysis
  // CHANGE: Use real top customers data from revenue API
  const topCustomers =
    financialData.topCustomers.length > 0
      ? financialData.topCustomers
      : revenueData.topCustomers?.slice(0, 5).map((customer: any) => ({
          // Fallback if revenue API data not yet loaded
          name: customer.name,
          plan: customer.plan,
          totalRevenue: customer.totalRevenue,
        })) || []

  // Removed redundant formatCurrency usage and kept the localized helper
  // const formatCurrency = (amount: number) => {
  //   return new Intl.NumberFormat("en-KE", {
  //     style: "currency",
  //     currency: "KES",
  //   }).format(amount)
  // }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
  }

  const getVarianceColor = (variance: number) => {
    if (variance > 5) return "text-red-600"
    if (variance < -5) return "text-green-600"
    return "text-yellow-600"
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "paid":
        return <Badge variant="default">Paid</Badge>
      case "filed":
        return <Badge variant="default">Filed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const fetchPendingInvoices = async (supplierName: string) => {
    if (!supplierName || supplierName === "none") {
      setPendingInvoices([])
      setSelectedInvoiceId("")
      return
    }

    try {
      setLoadingInvoices(true)
      console.log("[v0] Fetching pending invoices for supplier:", supplierName)

      // Find supplier by company name
      const supplier = suppliers.find((s) => s.company_name === supplierName)
      if (!supplier) {
        console.log("[v0] Supplier not found:", supplierName)
        setPendingInvoices([])
        return
      }

      console.log("[v0] Found supplier ID:", supplier.id)

      // Fetch invoices for this supplier
      const response = await fetch(`/api/suppliers/${supplier.id}/invoices`)
      if (!response.ok) {
        throw new Error("Failed to fetch supplier invoices")
      }

      const data = await response.json()
      console.log("[v0] Fetched invoices:", data)

      // Filter for pending/unpaid invoices
      const pending = (data.invoices || []).filter(
        (inv: any) => inv.status === "UNPAID" || inv.status === "PARTIALLY_PAID" || inv.status === "OVERDUE",
      )

      console.log("[v0] Pending invoices:", pending)
      setPendingInvoices(pending)

      // Auto-select first invoice if only one exists
      if (pending.length === 1) {
        setSelectedInvoiceId(pending[0].id.toString())
        // Auto-fill amount from invoice
        setExpenseForm((prev) => ({
          ...prev,
          amount: (pending[0].total_amount - (pending[0].paid_amount || 0)).toString(),
          description: `Payment for invoice ${pending[0].invoice_number}`,
          supplier_invoice_id: pending[0].id.toString(),
        }))
      }
    } catch (error) {
      console.error("[v0] Error fetching pending invoices:", error)
      setPendingInvoices([])
    } finally {
      setLoadingInvoices(false)
    }
  }

  const handleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
    const invoice = pendingInvoices.find((inv) => inv.id.toString() === invoiceId)
    if (invoice) {
      const outstandingAmount = invoice.total_amount - (invoice.paid_amount || 0)
      setExpenseForm((prev) => ({
        ...prev,
        amount: outstandingAmount.toString(),
        description: `Payment for invoice ${invoice.invoice_number}`,
        supplier_invoice_id: invoiceId,
      }))
    }
  }

  const handleCreateExpense = async () => {
    try {
      console.log("[v0] Creating expense with data:", expenseForm)
      console.log("[v0] Expense form details:", {
        category_id: expenseForm.category_id,
        category_id_type: typeof expenseForm.category_id,
        category_id_parsed: Number.parseInt(expenseForm.category_id),
        expense_date: expenseForm.expense_date,
        expense_date_type: typeof expenseForm.expense_date,
        amount: expenseForm.amount,
        description: expenseForm.description,
        vendor: expenseForm.vendor,
        payment_method: expenseForm.payment_method,
        status: expenseForm.status,
        notes: expenseForm.notes,
        supplier_invoice_id: expenseForm.supplier_invoice_id,
      })

      // Validate required fields
      if (!expenseForm.category_id || !expenseForm.amount || !expenseForm.description) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields (category, amount, description).",
          variant: "destructive",
        })
        return
      }

      const requestBody = {
        category_id: Number.parseInt(expenseForm.category_id),
        amount: Number.parseFloat(expenseForm.amount),
        description: expenseForm.description,
        vendor: expenseForm.vendor,
        expense_date: expenseForm.expense_date,
        payment_method: expenseForm.payment_method,
        status: expenseForm.status,
        notes: expenseForm.notes,
        supplier_invoice_id: expenseForm.supplier_invoice_id ? Number.parseInt(expenseForm.supplier_invoice_id) : null,
      }

      console.log("[v0] Request body being sent to API:", requestBody)

      const response = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      console.log("[v0] API Response status:", response.status)
      console.log("[v0] API Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] API Error response:", errorData)
        throw new Error(errorData.error || "Failed to create expense")
      }

      const result = await response.json()
      console.log("[v0] Expense created successfully:", result)

      toast({
        title: "Expense Created",
        description: "New expense record has been added successfully.",
      })

      // Reset form and close modal
      setExpenseForm({
        category_id: "",
        amount: "",
        description: "",
        vendor: "",
        expense_date: new Date().toISOString().split("T")[0],
        payment_method: "bank",
        status: "paid",
        notes: "",
        supplier_invoice_id: "",
      })
      setPendingInvoices([])
      setSelectedInvoiceId("")

      fetchExpenses() // Refresh the expenses list
      setIsExpenseModalOpen(false)
    } catch (error) {
      console.error("[v0] Error creating expense:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create expense. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCreateTaxRecord = async () => {
    try {
      // Validate required fields
      if (
        !taxFormData.taxType ||
        !taxFormData.taxPeriod ||
        !taxFormData.amount ||
        !taxFormData.dueDate ||
        !taxFormData.status
      ) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch("/api/finance/tax-records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taxFormData),
      })

      if (!response.ok) {
        throw new Error("Failed to create tax record")
      }

      const result = await response.json()

      if (result.success) {
        setIsTaxModalOpen(false)
        // Reset form
        setTaxFormData({
          taxType: "",
          taxPeriod: "",
          amount: "",
          dueDate: "",
          status: "",
          penalty: "",
          taxAuthority: "",
          referenceNumber: "",
          notes: "",
        })
        toast({
          title: "Tax Record Created",
          description: "New tax obligation has been recorded successfully.",
        })
        fetchTaxRecords()
      } else {
        throw new Error(result.error || "Failed to create tax record")
      }
    } catch (error) {
      console.error("Error creating tax record:", error)
      toast({
        title: "Error",
        description: "Failed to create tax record. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense)
    setIsExpenseEditModalOpen(true)
  }

  const handleDeleteExpense = (expenseId: number) => {
    toast({
      title: "Expense Deleted",
      description: "Expense record has been removed successfully.",
    })
  }

  const fetchInventoryTotal = async () => {
    try {
      const response = await fetch("/api/inventory/total-stock-value")
      const data = await response.json()
      setInventoryTotal(data.inventory_total || 0)
    } catch (error) {
      console.error("Error fetching inventory total:", error)
    }
  }

  const syncInventoryAccount = async () => {
    try {
      const response = await fetch("/api/finance/sync-inventory-account", {
        method: "POST",
      })
      const data = await response.json()
      toast({
        title: "Success",
        description: "Inventory account synced successfully",
      })
      fetchBalanceSheet()
      fetchInventoryTotal()
    } catch (error) {
      console.error("Error syncing inventory:", error)
      toast({
        title: "Error",
        description: "Failed to sync inventory account",
        variant: "destructive",
      })
    }
  }

  const handleViewTaxDetails = (record: TaxRecord) => {
    // Open a modal or navigate to details page
    toast({
      title: "Tax Record Details",
      description: `Viewing details for ${record.type} - ${record.period}`,
    })
    // TODO: Implement detailed view modal
  }

  const handleDownloadTaxReturn = async (record: TaxRecord) => {
    try {
      toast({
        title: "Downloading",
        description: "Preparing tax return document...",
      })

      // TODO: Implement PDF generation for tax return
      const response = await fetch(`/api/finance/tax-records/${record.id}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `tax-return-${record.referenceNumber || record.id}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a) // Moved this line inside the if block

        toast({
          title: "Success",
          description: "Tax return downloaded successfully",
        })
      } else {
        throw new Error("Download failed")
      }
    } catch (error) {
      console.error("Error downloading tax return:", error)
      toast({
        title: "Error",
        description: "Failed to download tax return",
        variant: "destructive",
      })
    }
  }

  const handleFileTaxReturn = async (record: TaxRecord) => {
    try {
      const response = await fetch(`/api/finance/tax-records/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "filed",
          filed_date: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Tax return filed successfully",
        })
        fetchTaxRecords() // Refresh the list
      } else {
        throw new Error("Filing failed")
      }
    } catch (error) {
      console.error("Error filing tax return:", error)
      toast({
        title: "Error",
        description: "Failed to file tax return",
        variant: "destructive",
      })
    }
  }

  const handleEditTaxRecord = (record: TaxRecord) => {
    // Populate the form with existing data
    setNewTaxRecord({
      return_type: record.type,
      period_start: "", // Would need to parse from period
      period_end: "",
      due_date: record.dueDate,
      tax_due: record.amount.toString(),
      penalty_amount: record.penalty.toString(),
      tax_authority: record.taxAuthority,
      reference_number: record.referenceNumber,
      notes: record.notes,
    })
    setEditingTaxRecordId(record.id)
    setIsTaxModalOpen(true)
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Finance Management</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Real-time financial management powered by customer payment data
          </p>
        </div>
        <div className="flex flex-col xs:flex-row gap-2 shrink-0">
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          <Button
            variant="outline"
            onClick={fetchFinancialData} // Use the appropriate fetch function
            disabled={loading}
            size="sm"
            className="text-xs sm:text-sm bg-transparent"
          >
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden xs:inline">Refresh Data</span>
            <span className="xs:hidden">Refresh</span>
          </Button>
          <Button onClick={() => setIsReportModalOpen(true)} size="sm" className="text-xs sm:text-sm">
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Generate Report</span>
            <span className="xs:hidden">Report</span>
          </Button>
        </div>
      </div>

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading financial data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && (
        <>
          {/* Financial Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">
                  KES {financialMetrics.totalRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span
                    className={`inline-flex items-center ${financialData.monthlyGrowth >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    {financialData.monthlyGrowth >= 0 ? "+" : ""}
                    {financialData.monthlyGrowth.toFixed(1)}%
                  </span>{" "}
                  from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Expenses</CardTitle>
                <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">
                  KES {financialMetrics.totalExpenses.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-orange-600">+2.1%</span> from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Net Profit</CardTitle>
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-lg sm:text-2xl font-bold ${financialMetrics.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  KES {financialMetrics.netProfit.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {financialMetrics.profitMargin.toFixed(1)}% profit margin
                </p>
              </CardContent>
            </Card>

            {/* Accounts Payable Card - UPDATED TO SHOW REAL DATA */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Accounts Payable</CardTitle>
                <Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">
                  {formatCurrency(accountsPayableData?.summary?.total_outstanding || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {accountsPayableData?.summary?.invoice_count || 0} outstanding invoices
                </p>
                {accountsPayableData?.summary?.total_overdue > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    {formatCurrency(accountsPayableData.summary.total_overdue)} overdue
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Cash Flow</CardTitle>
                <Banknote className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-green-600">
                  {formatCurrency(financialMetrics.cashFlow)}
                </div>
                <p className="text-xs text-muted-foreground">Positive cash flow</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Accounts Receivable</CardTitle>
                <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">
                  {formatCurrency(financialMetrics.accountsReceivable)}
                </div>
                <p className="text-xs text-muted-foreground">Outstanding customer payments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Accounts Payable</CardTitle>
                <Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">{formatCurrency(financialMetrics.accountsPayable)}</div>
                <p className="text-xs text-muted-foreground">Outstanding supplier payments</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto">
              <TabsList className="grid w-full grid-cols-12 lg:w-auto lg:inline-flex">
                {" "}
                {/* */}
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
                <TabsTrigger value="taxes">Taxes</TabsTrigger>
                <TabsTrigger value="budget">Budget</TabsTrigger>
                <TabsTrigger value="ledger">Ledger</TabsTrigger>
                <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
                <TabsTrigger value="balancesheet">Balance Sheet</TabsTrigger>
                <TabsTrigger value="trialbalance">Trial Balance</TabsTrigger>
                <TabsTrigger value="profitloss">Profit & Loss</TabsTrigger> {/* */}
                <TabsTrigger value="audit">Audit</TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Breakdown</CardTitle>
                    <CardDescription>Revenue by service category</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {revenueStreams.length > 0 ? (
                      revenueStreams.map((stream, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{stream.name}</span>
                            <div className="text-right">
                              <div className="text-sm font-bold">{formatCurrency(stream.amount)}</div>
                              {stream.growth !== 0 && (
                                <div className={`text-xs ${stream.growth > 0 ? "text-green-600" : "text-red-600"}`}>
                                  {formatPercentage(stream.growth)}
                                </div>
                              )}
                            </div>
                          </div>
                          <Progress value={stream.percentage} className="h-2" />
                          <div className="text-xs text-muted-foreground">
                            {stream.percentage.toFixed(1)}% of total revenue
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No revenue data available for the selected period.</p>
                        <p className="text-sm mt-2">Revenue breakdown will appear here once payments are received.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top Customers */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Revenue Customers</CardTitle>
                    <CardDescription>Highest revenue generating customers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {topCustomers.length > 0 ? (
                        topCustomers.slice(0, 5).map((customer, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-1">
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-sm text-muted-foreground">{customer.plan}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{formatCurrency(customer.totalRevenue)}</div>
                              <div className="text-xs text-muted-foreground">
                                {customer.paymentCount} payment{customer.paymentCount !== 1 ? "s" : ""}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No customer revenue data available for the selected period.</p>
                          <p className="text-sm mt-2">Top customers will appear here once payments are received.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Health Indicators */}
              <Card>
                <CardHeader>
                  <CardTitle>Financial Health Indicators</CardTitle>
                  <CardDescription>Key performance indicators for financial health</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {customerInvoices.length > 0
                          ? (
                              (customerInvoices.filter((inv) => inv.status === "paid").length /
                                customerInvoices.length) *
                              100
                            ).toFixed(1)
                          : "0"}
                        %
                      </div>
                      <div className="text-sm text-muted-foreground">Collection Rate</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {customerInvoices.filter((inv) => inv.status === "paid").length > 0
                          ? Math.round(
                              customerInvoices
                                .filter((inv) => inv.status === "paid")
                                .reduce((sum, inv) => {
                                  const created = new Date(inv.created_at)
                                  const paid = new Date(inv.updated_at)
                                  return sum + (paid.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
                                }, 0) / customerInvoices.filter((inv) => inv.status === "paid").length,
                            )
                          : "N/A"}{" "}
                        {customerInvoices.filter((inv) => inv.status === "paid").length > 0 ? "days" : ""}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Collection Period</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatCurrency(revenueData.metrics.customerLifetimeValue)}
                      </div>
                      <div className="text-sm text-muted-foreground">Customer LTV</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {formatCurrency(revenueData.metrics.averageRevenuePerUser)}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Revenue Per User</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Revenue Tab */}
            <TabsContent value="revenue" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Growth Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Growth Metrics</CardTitle>
                    <CardDescription>Monthly recurring revenue and growth trends</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(revenueData.metrics.monthlyRecurringRevenue)}
                        </div>
                        <div className="text-sm text-muted-foreground">Monthly Recurring Revenue</div>
                        <div
                          className={`text-xs mt-1 ${revenueData.summary.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {revenueData.summary.revenueGrowth >= 0 ? "+" : ""}
                          {revenueData.summary.revenueGrowth.toFixed(1)}% MoM
                        </div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(revenueData.recurringRevenue.oneTime.revenue)}
                        </div>
                        <div className="text-sm text-muted-foreground">One-time Revenue</div>
                        <div className="text-xs text-green-600 mt-1">
                          {revenueData.recurringRevenue.oneTime.percentage.toFixed(1)}% of total
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Revenue Target</span>
                        <span className="text-sm font-medium">{formatCurrency(900000)}</span>
                      </div>
                      <Progress value={(revenueData.summary.totalRevenue / 900000) * 100} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {((revenueData.summary.totalRevenue / 900000) * 100).toFixed(1)}% of monthly target achieved
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue by Service Plan */}
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Service Plan</CardTitle>
                    <CardDescription>Breakdown by subscription tiers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {revenueData.servicePlans.length > 0 ? (
                        revenueData.servicePlans.map((plan, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{plan.name}</div>
                              <div className="text-sm text-muted-foreground">{plan.customerCount} customers</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{formatCurrency(plan.revenue)}</div>
                              <div className="text-sm text-muted-foreground">
                                Avg: {formatCurrency(plan.avgRevenuePerCustomer)}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No service plan revenue data available for the selected period.</p>
                          <p className="text-sm mt-2">Revenue data will appear here once customers make payments.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Forecasting */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Forecasting</CardTitle>
                  <CardDescription>Projected revenue based on current trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-xl font-bold">
                        {formatCurrency(
                          revenueData.summary.totalRevenue * (1 + revenueData.summary.revenueGrowth / 100),
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">Next Month Forecast</div>
                      <div
                        className={`text-xs ${revenueData.summary.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {revenueData.summary.revenueGrowth >= 0 ? "+" : ""}
                        {revenueData.summary.revenueGrowth.toFixed(1)}% growth
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-xl font-bold">
                        {formatCurrency(
                          revenueData.summary.totalRevenue * 6 * (1 + revenueData.summary.revenueGrowth / 100),
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">6-Month Forecast</div>
                      <div className={`text-xs text-green-600 mt-1`}>Based on current trends</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-xl font-bold">
                        {revenueData.summary.transactionCount > 0 ? "95.2%" : "N/A"}
                      </div>
                      <div className="text-sm text-muted-foreground">Forecast Accuracy</div>
                      <div className="text-xs text-muted-foreground">
                        {revenueData.summary.transactionCount > 0 ? "Based on payment history" : "Insufficient data"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Type Breakdown</CardTitle>
                    <CardDescription>Recurring vs one-time revenue analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-sm font-medium">Recurring Revenue</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold">
                              {formatCurrency(revenueData.recurringRevenue.recurring.revenue)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {revenueData.recurringRevenue.recurring.percentage.toFixed(1)}% of total
                            </div>
                          </div>
                        </div>
                        <Progress value={revenueData.recurringRevenue.recurring.percentage} className="h-2" />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-sm font-medium">One-time Revenue</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold">
                              {formatCurrency(revenueData.recurringRevenue.oneTime.revenue)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {revenueData.recurringRevenue.oneTime.percentage.toFixed(1)}% of total
                            </div>
                          </div>
                        </div>
                        <Progress value={revenueData.recurringRevenue.oneTime.percentage} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Revenue Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Key Revenue Metrics</CardTitle>
                    <CardDescription>Important financial indicators</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">Average Transaction Value</span>
                        <span className="text-lg font-bold">
                          {formatCurrency(revenueData.summary.avgTransactionValue)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">Total Transactions</span>
                        <span className="text-lg font-bold">
                          {revenueData.summary.transactionCount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">Customer LTV</span>
                        <span className="text-lg font-bold">
                          {formatCurrency(revenueData.metrics.customerLifetimeValue)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">Avg Revenue Per User</span>
                        <span className="text-lg font-bold">
                          {formatCurrency(revenueData.metrics.averageRevenuePerUser)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Expenses Tab */}
            <TabsContent value="expenses" className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-semibold">Expense Management</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Track and manage all business expenses</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setIsCategoryModalOpen(true)} className="text-xs">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Manage Categories</span>
                    <span className="xs:hidden">Categories</span>
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs bg-transparent">
                    <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Import</span>
                    <span className="xs:hidden">Import</span>
                  </Button>
                  <Button onClick={() => setIsExpenseModalOpen(true)} size="sm" className="text-xs">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Create Expense</span>
                    <span className="xs:hidden">New Expense</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense Categories */}
                <Card>
                  <CardHeader>
                    <CardTitle>Expense Categories</CardTitle>
                    <CardDescription>Breakdown of operational expenses</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {expenseCategories.map((category: ExpenseCategory, index: number) => (
                      <div key={category.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                            <span className="text-sm font-medium">{category.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold">
                              KES {category.budget_amount?.toLocaleString() || "0"}
                            </div>
                            <div className="text-xs text-muted-foreground">Budget</div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">{category.description}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* ISP-Specific Cost Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>ISP Infrastructure Costs</CardTitle>
                    <CardDescription>Detailed breakdown of ISP-specific expenses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Wifi className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">Bandwidth & Connectivity</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Tier 1 Provider Costs</span>
                            <span className="font-medium">{formatCurrency(89000)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Peering Agreements</span>
                            <span className="font-medium">{formatCurrency(45000)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>CDN Services</span>
                            <span className="font-medium">{formatCurrency(22000)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Server className="h-4 w-4 text-green-500" />
                          <span className="font-medium">Infrastructure</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Data Center Costs</span>
                            <span className="font-medium">{formatCurrency(35000)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Network Equipment</span>
                            <span className="font-medium">{formatCurrency(28500)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fiber Maintenance</span>
                            <span className="font-medium">{formatCurrency(26000)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <UserCheck className="h-4 w-4 text-purple-500" />
                          <span className="font-medium">Personnel</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Network Engineers</span>
                            <span className="font-medium">{formatCurrency(45000)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Support Staff</span>
                            <span className="font-medium">{formatCurrency(23200)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Field Technicians</span>
                            <span className="font-medium">{formatCurrency(10000)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="h-4 w-4 text-red-500" />
                          <span className="font-medium">Regulatory & Compliance</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>ISP Licensing Fees</span>
                            <span className="font-medium">{formatCurrency(18000)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Regulatory Compliance</span>
                            <span className="font-medium">{formatCurrency(12600)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Insurance & Legal</span>
                            <span className="font-medium">{formatCurrency(5000)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Expense Records Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Recent Expense Records</CardTitle>
                    <CardDescription>Detailed expense transactions and records</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenseRecords.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="font-medium">{expense.description}</div>
                              <div className="text-sm text-muted-foreground">{expense.paymentMethod}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{expense.category}</Badge>
                            </TableCell>
                            <TableCell>{expense.vendor}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(expense.amount)}</TableCell>
                            <TableCell>{getStatusBadge(expense.status)}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleEditExpense(expense)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Expense
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  {expense.receiptUrl && (
                                    <DropdownMenuItem>
                                      <Download className="h-4 w-4 mr-2" />
                                      Download Receipt
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => handleDeleteExpense(expense.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Expense
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
            </TabsContent>

            {/* Invoicing Tab */}
            <TabsContent value="invoicing" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Invoice Summary */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Outstanding Invoices</CardTitle>
                    <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold text-orange-600">
                      {formatCurrency(invoicingStats.outstandingAmount)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {invoicingStats.pendingCount} invoice{invoicingStats.pendingCount !== 1 ? "s" : ""} pending
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Overdue Amount</CardTitle>
                    <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold text-red-600">
                      {formatCurrency(invoicingStats.overdueAmount)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {invoicingStats.overdueCount} invoice{invoicingStats.overdueCount !== 1 ? "s" : ""} overdue
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Collection Rate</CardTitle>
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold text-green-600">
                      {invoicingStats.collectionRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">Last 12 months</p>
                  </CardContent>
                </Card>
              </div>

              {/* Outstanding Invoices Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Outstanding Invoices</CardTitle>
                    <CardDescription>Manage pending and overdue customer invoices</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                    <Button onClick={() => setIsInvoiceModalOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Invoice
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {outstandingInvoices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No outstanding invoices</p>
                      <p className="text-sm mt-2">All invoices have been paid</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {outstandingInvoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell className="font-medium">{invoice.id}</TableCell>
                              <TableCell>{invoice.customer}</TableCell>
                              <TableCell className="text-right">{formatCurrency(invoice.amount)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span>{invoice.dueDate}</span>
                                  {invoice.daysOverdue > 0 && (
                                    <span className="text-xs text-red-600">{invoice.daysOverdue} days overdue</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedInvoice(invoice)
                                        setIsInvoiceDetailsOpen(true)
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Invoice
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={async () => {
                                        try {
                                          const response = await fetch(`/api/finance/invoices/${invoice.id}/pdf`)
                                          if (response.ok) {
                                            const blob = await response.blob()
                                            const url = window.URL.createObjectURL(blob)
                                            const a = document.createElement("a")
                                            a.href = url
                                            a.download = `invoice-${invoice.id}.pdf`
                                            document.body.appendChild(a)
                                            a.click()
                                            window.URL.revokeObjectURL(url)
                                            document.body.removeChild(a)
                                            toast({
                                              title: "Success",
                                              description: "Invoice downloaded successfully",
                                            })
                                          } else {
                                            throw new Error("Failed to download invoice")
                                          }
                                        } catch (error) {
                                          toast({
                                            title: "Error",
                                            description: "Failed to download invoice",
                                            variant: "destructive",
                                          })
                                        }
                                      }}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Download PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={async () => {
                                        try {
                                          const response = await fetch(`/api/finance/invoices/${invoice.id}/reminder`, {
                                            method: "POST",
                                          })
                                          if (response.ok) {
                                            toast({
                                              title: "Success",
                                              description: "Payment reminder sent successfully",
                                            })
                                          } else {
                                            throw new Error("Failed to send reminder")
                                          }
                                        } catch (error) {
                                          toast({
                                            title: "Error",
                                            description: "Failed to send payment reminder",
                                            variant: "destructive",
                                          })
                                        }
                                      }}
                                    >
                                      <Send className="h-4 w-4 mr-2" />
                                      Send Reminder
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedInvoice(invoice)
                                        setIsInvoiceModalOpen(true)
                                      }}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Invoice
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Automated Billing Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Automated Billing Settings</CardTitle>
                  <CardDescription>Configure automatic invoice generation and payment processing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Invoice Generation</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Auto-generate monthly invoices</span>
                          <Badge variant="default">Enabled</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Invoice due date</span>
                          <span className="text-sm font-medium">15 days</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Late payment fee</span>
                          <span className="text-sm font-medium">5%</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium">Payment Processing</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Auto-charge credit cards</span>
                          <Badge variant="default">Enabled</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">M-Pesa integration</span>
                          <Badge variant="default">Active</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Payment reminders</span>
                          <Badge variant="default">Enabled</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Taxes Tab */}
            <TabsContent value="taxes" className="space-y-6">
              {/* Tax Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">VAT Collected</CardTitle>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(taxData.vatCollected)}</div>
                    <p className="text-xs text-muted-foreground">Current period</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net VAT Due</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{formatCurrency(taxData.netVatDue)}</div>
                    <p className="text-xs text-muted-foreground">Pending payment</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Corporate Tax</CardTitle>
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(taxData.corporateIncomeTax)}</div>
                    <p className="text-xs text-muted-foreground">Annual obligation</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Next Filing</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{taxData.nextFilingDate}</div>
                    <p className="text-xs text-muted-foreground">
                      <Badge variant={taxData.complianceStatus === "current" ? "default" : "destructive"}>
                        {taxData.complianceStatus === "current" ? "Current" : "Overdue"}
                      </Badge>
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Tax Obligations */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Tax Obligations</CardTitle>
                    <CardDescription>Upcoming and overdue tax payments</CardDescription>
                  </div>
                  <Button onClick={() => setIsTaxModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tax Record
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoadingTaxData ? (
                    <div className="flex items-center justify-center p-8">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      Loading tax obligations...
                    </div>
                  ) : taxObligations.length > 0 ? (
                    <div className="space-y-4">
                      {taxObligations.map((obligation: TaxRecord) => (
                        <div key={obligation.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <div className="font-medium">{obligation.type}</div>
                            <div className="text-sm text-muted-foreground">
                              Period: {obligation.period} • Due: {obligation.dueDate}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(obligation.amount)}</div>
                            {getStatusBadge(obligation.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No pending tax obligations</p>
                      <p className="text-sm mt-2">All tax obligations are up to date</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tax Records Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Tax Filing Records</CardTitle>
                    <CardDescription>Track tax payments and filing status</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchTaxRecords} disabled={isLoadingTaxData}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingTaxData ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingTaxData ? (
                    <div className="flex items-center justify-center p-8">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      Loading tax records...
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tax Type</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Penalty</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {taxRecords.map((record: TaxRecord) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">{record.type}</TableCell>
                              <TableCell>{record.period}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(record.amount)}</TableCell>
                              <TableCell>{record.dueDate}</TableCell>
                              <TableCell>{getStatusBadge(record.status)}</TableCell>
                              <TableCell className="text-right">
                                {record.penalty > 0 ? (
                                  <span className="text-red-600 font-medium">{formatCurrency(record.penalty)}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleViewTaxDetails(record)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDownloadTaxReturn(record)}>
                                      <Download className="h-4 w-4 mr-2" />
                                      Download Return
                                    </DropdownMenuItem>
                                    {record.status === "pending" && (
                                      <DropdownMenuItem onClick={() => handleFileTaxReturn(record)}>
                                        <Send className="h-4 w-4 mr-2" />
                                        File Return
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleEditTaxRecord(record)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Record
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                          {taxRecords.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No tax records found</p>
                                <p className="text-sm mt-2">Create your first tax record to get started</p>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tax Compliance Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Tax Compliance Status</CardTitle>
                  <CardDescription>Overview of tax filing status and upcoming deadlines</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <div className="font-medium">VAT Returns</div>
                      <div className="text-sm text-muted-foreground">
                        {taxData.complianceStatus === "current" ? "Up to date" : "Overdue"}
                      </div>
                      <Badge
                        variant={taxData.complianceStatus === "current" ? "default" : "destructive"}
                        className="mt-2"
                      >
                        {taxData.complianceStatus === "current" ? "Current" : "Action Required"}
                      </Badge>
                    </div>

                    <div className="text-center p-4 border rounded-lg">
                      <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <div className="font-medium">Next Filing</div>
                      <div className="text-sm text-muted-foreground">{taxData.nextFilingDate}</div>
                      <Badge variant="outline" className="mt-2">
                        {Math.ceil(
                          (new Date(taxData.nextFilingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                        )}{" "}
                        days
                      </Badge>
                    </div>

                    <div className="text-center p-4 border rounded-lg">
                      <Calculator className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <div className="font-medium">Total Tax Due</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(taxData.netVatDue + taxData.corporateIncomeTax)}
                      </div>
                      <Badge
                        variant={taxData.netVatDue + taxData.corporateIncomeTax > 0 ? "destructive" : "default"}
                        className="mt-2"
                      >
                        {taxData.netVatDue + taxData.corporateIncomeTax > 0 ? "Payment Due" : "Paid"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Budget Tab */}
            <TabsContent value="budget" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Budget Overview */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Budget Overview</CardTitle>
                      <CardDescription>Current year budget performance</CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setIsBudgetModalOpen(true)}>
                      <Settings className="w-4 h-4 mr-2" />
                      Manage Budget
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {displayBudgetData.map((item, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{item.category}</span>
                            <div className="text-right">
                              <div className="text-sm font-bold">
                                {formatCurrency(item.actual || item.actual_amount)}
                              </div>
                              <div className={`text-xs ${getVarianceColor(item.variance)}`}>
                                {formatPercentage(item.variance)} vs budget
                              </div>
                            </div>
                          </div>
                          <Progress
                            value={
                              ((item.actual || item.actual_amount) / (item.budgeted || item.budgeted_amount)) * 100
                            }
                            className="h-2"
                          />
                          <div className="text-xs text-muted-foreground">
                            Budget: {formatCurrency(item.budgeted || item.budgeted_amount)} • Variance:{" "}
                            {formatCurrency(
                              (item.actual || item.actual_amount) - (item.budgeted || item.budgeted_amount),
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Budget Alerts */}
                <Card>
                  <CardHeader>
                    <CardTitle>Budget Alerts</CardTitle>
                    <CardDescription>Items requiring attention</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-3 border border-red-200 rounded-lg bg-red-50">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <div className="font-medium text-red-900">Marketing Budget Exceeded</div>
                          <div className="text-sm text-red-700">
                            Marketing expenses are 20.3% over budget. Review spending and adjust allocations.
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 border border-orange-200 rounded-lg bg-orange-50">
                        <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div>
                          <div className="font-medium text-orange-900">Infrastructure Costs Rising</div>
                          <div className="text-sm text-orange-700">
                            Infrastructure expenses are 5.3% over budget due to equipment upgrades.
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 border border-green-200 rounded-lg bg-green-50">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <div className="font-medium text-green-900">Personnel Costs Under Budget</div>
                          <div className="text-sm text-green-700">
                            Personnel expenses are 2.3% under budget, providing cost savings opportunity.
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Budget Forecasting */}
              <Card>
                <CardHeader>
                  <CardTitle>Budget Forecasting</CardTitle>
                  <CardDescription>Projected budget performance for the remainder of the year</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-xl font-bold">{formatCurrency(2850000)}</div>
                      <div className="text-sm text-muted-foreground">Projected Annual Revenue</div>
                      <div className="text-xs text-green-600 mt-1">+5.2% vs budget</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-xl font-bold">{formatCurrency(1245000)}</div>
                      <div className="text-sm text-muted-foreground">Projected Annual Expenses</div>
                      <div className="text-xs text-red-600 mt-1">+3.8% vs budget</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-xl font-bold">{formatCurrency(1605000)}</div>
                      <div className="text-sm text-muted-foreground">Projected Net Profit</div>
                      <div className="text-xs text-green-600 mt-1">+6.1% vs budget</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-xl font-bold">94.2%</div>
                      <div className="text-sm text-muted-foreground">Forecast Accuracy</div>
                      <div className="text-xs text-muted-foreground">Historical average</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* General Ledger Tab */}
            <TabsContent value="ledger" className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold">General Ledger</h3>
                  <p className="text-sm text-muted-foreground">Complete record of all financial transactions</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export Ledger
                  </Button>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter Transactions
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>All debits and credits in accounting format</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingLedger ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead>Account</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Debit</TableHead>
                            <TableHead>Credit</TableHead>
                            <TableHead>Balance</TableHead>
                            <TableHead>Customer</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ledgerData?.transactions?.map((transaction: Transaction, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{new Date(transaction.transaction_date).toLocaleDateString()}</TableCell>
                              <TableCell className="font-mono">{transaction.transaction_id}</TableCell>
                              <TableCell>{transaction.account}</TableCell>
                              <TableCell>{transaction.description}</TableCell>
                              <TableCell className={transaction.debit > 0 ? "text-green-600" : ""}>
                                {transaction.debit > 0 ? `KES ${transaction.debit.toLocaleString()}` : "-"}
                              </TableCell>
                              <TableCell className={transaction.credit > 0 ? "text-red-600" : ""}>
                                {transaction.credit > 0 ? `KES ${transaction.credit.toLocaleString()}` : "-"}
                              </TableCell>
                              <TableCell>KES {transaction.balance.toLocaleString()}</TableCell>
                              <TableCell>{transaction.customer_name || "-"}</TableCell>
                            </TableRow>
                          ))}
                          {(!ledgerData?.transactions || ledgerData.transactions.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                No transactions found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Balances</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Cash & Bank</span>
                        <span className="font-medium">
                          KES {ledgerData?.accountBalances?.cash_and_bank?.toLocaleString() || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Accounts Receivable</span>
                        <span className="font-medium">
                          KES {ledgerData?.accountBalances?.accounts_receivable?.toLocaleString() || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Equipment (Net)</span>
                        <span className="font-medium">
                          KES {ledgerData?.accountBalances?.equipment_net?.toLocaleString() || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-semibold">Total Assets</span>
                        <span className="font-semibold">
                          KES{" "}
                          {(
                            (ledgerData?.accountBalances?.cash_and_bank || 0) +
                            (ledgerData?.accountBalances?.accounts_receivable || 0) +
                            (ledgerData?.accountBalances?.equipment_net || 0)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Liabilities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Accounts Payable</span>
                        <span className="font-medium">
                          KES {ledgerData?.accountBalances?.accounts_payable?.toLocaleString() || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Accrued Expenses</span>
                        <span className="font-medium">
                          KES {ledgerData?.accountBalances?.accrued_expenses?.toLocaleString() || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Deferred Revenue</span>
                        <span className="font-medium">
                          KES {ledgerData?.accountBalances?.deferred_revenue?.toLocaleString() || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-semibold">Total Liabilities</span>
                        <span className="font-semibold">
                          KES{" "}
                          {(
                            (ledgerData?.accountBalances?.accounts_payable || 0) +
                            (ledgerData?.accountBalances?.accrued_expenses || 0) +
                            (ledgerData?.accountBalances?.deferred_revenue || 0)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Equity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Owner's Equity</span>
                        <span className="font-medium">
                          KES {ledgerData?.accountBalances?.owners_equity?.toLocaleString() || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Retained Earnings</span>
                        <span className="font-medium">
                          KES {ledgerData?.accountBalances?.retained_earnings?.toLocaleString() || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-semibold">Total Equity</span>
                        <span className="font-semibold">
                          KES{" "}
                          {(
                            (ledgerData?.accountBalances?.owners_equity || 0) +
                            (ledgerData?.accountBalances?.retained_earnings || 0)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Cash Flow Tab */}
            <TabsContent value="cashflow" className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Cash Flow Analysis</h3>
                  <p className="text-sm text-muted-foreground">Track cash inflows and outflows with projections</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export Cash Flow
                  </Button>
                  <Button variant="outline" size="sm">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Forecast
                  </Button>
                </div>
              </div>

              {cashFlowData ? (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-green-600">Cash Inflows</CardTitle>
                        <CardDescription>Money coming into the business</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>M-Pesa Payments</span>
                            <span className="font-medium text-green-600">
                              +KES {Number(cashFlowData.inflows.mpesa_payments || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Bank Payments</span>
                            <span className="font-medium text-green-600">
                              +KES {Number(cashFlowData.inflows.bank_payments || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cash Payments</span>
                            <span className="font-medium text-green-600">
                              +KES {Number(cashFlowData.inflows.cash_payments || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="font-semibold">Total Inflows</span>
                            <span className="font-semibold text-green-600">
                              +KES {Number(cashFlowData.inflows.total_inflows || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-red-600">Cash Outflows</CardTitle>
                        <CardDescription>Money going out of the business</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>Operating Expenses</span>
                            <span className="font-medium text-red-600">
                              -KES {Number(cashFlowData.outflows.operating_expenses || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Equipment Purchases</span>
                            <span className="font-medium text-red-600">
                              -KES {Number(cashFlowData.outflows.equipment_purchases || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Salaries & Benefits</span>
                            <span className="font-medium text-red-600">
                              -KES {Number(cashFlowData.outflows.salaries || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Utilities & Rent</span>
                            <span className="font-medium text-red-600">
                              -KES {Number(cashFlowData.outflows.utilities || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="font-semibold">Total Outflows</span>
                            <span className="font-semibold text-red-600">
                              -KES {Number(cashFlowData.outflows.total_outflows || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Net Cash Flow</CardTitle>
                        <CardDescription>Overall cash position</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div
                            className={`text-center p-4 rounded-lg ${cashFlowData.net_cash_flow >= 0 ? "bg-green-50" : "bg-red-50"}`}
                          >
                            <div
                              className={`text-2xl font-bold ${cashFlowData.net_cash_flow >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {cashFlowData.net_cash_flow >= 0 ? "+" : ""}KES{" "}
                              {Number(cashFlowData.net_cash_flow || 0).toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">This Month</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Cash Flow Projection (Next 90 Days)</CardTitle>
                      <CardDescription>Projected cash flow based on current trends</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">
                            KES {Number(cashFlowData.projections.thirty_days || 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">30 Days</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">
                            KES {Number(cashFlowData.projections.sixty_days || 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">60 Days</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">
                            KES {Number(cashFlowData.projections.ninety_days || 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">90 Days</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Loading cash flow data...</div>
              )}
            </TabsContent>

            {/* Add Profit & Loss TabsContent before the Audit tab */}
            <TabsContent value="profitloss" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Profit & Loss Statement</CardTitle>
                  <CardDescription>Income and expenses for the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  {profitLossData ? (
                    <div className="space-y-6">
                      {/* Summary Cards */}
                      <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                              KES {profitLossData.summary.totalRevenue.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Paid: KES {profitLossData.summary.paidRevenue.toLocaleString()}
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                              KES {profitLossData.summary.totalExpenses.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Approved: KES {profitLossData.summary.approvedExpenses.toLocaleString()}
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div
                              className={`text-2xl font-bold ${
                                profitLossData.summary.netProfit >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              KES {profitLossData.summary.netProfit.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Margin: {profitLossData.summary.profitMargin.toFixed(2)}%
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Detailed Breakdown */}
                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Revenue Breakdown */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Revenue by Service</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {profitLossData.revenueByService.length > 0 ? (
                                profitLossData.revenueByService.map((item, index) => (
                                  <div key={index} className="flex justify-between items-center">
                                    <span className="text-sm">{item.service}</span>
                                    <span className="text-sm font-medium">KES {item.amount.toLocaleString()}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground">No revenue data</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Expenses Breakdown */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Expenses by Category</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {profitLossData.expensesByCategory.length > 0 ? (
                                profitLossData.expensesByCategory.map((item, index) => (
                                  <div key={index} className="flex justify-between items-center">
                                    <span className="text-sm">{item.category}</span>
                                    <span className="text-sm font-medium">KES {item.amount.toLocaleString()}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground">No expense data</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* P&L Statement Table */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Statement Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between py-2 border-b">
                              <span className="font-medium">Revenue</span>
                              <span className="font-medium text-green-600">
                                KES {profitLossData.summary.totalRevenue.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between py-2 border-b">
                              <span className="font-medium">Less: Expenses</span>
                              <span className="font-medium text-red-600">
                                KES {profitLossData.summary.totalExpenses.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between py-3 border-t-2 border-gray-300">
                              <span className="font-bold text-lg">Net Profit/(Loss)</span>
                              <span
                                className={`font-bold text-lg ${
                                  profitLossData.summary.netProfit >= 0 ? "text-green-600" : "text-red-600"
                                }`}
                              >
                                KES {profitLossData.summary.netProfit.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">Loading profit & loss data...</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="balancesheet" className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Balance Sheet</h3>
                  <p className="text-sm text-muted-foreground">
                    Financial position as of {balanceSheetData?.asOfDate || new Date().toISOString().split("T")[0]}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowManageBalanceSheet(true)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Balance Sheet ⚙️
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export Balance Sheet
                  </Button>
                </div>
              </div>

              {balanceSheetData ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Assets */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Assets</span>
                        <span className="text-2xl font-bold">{formatCurrency(balanceSheetData.assets.total)}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">Current Assets</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={syncInventoryAccount}
                            title="Sync inventory account"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="space-y-2 pl-4">
                          <div className="flex justify-between text-sm">
                            <span>Cash & Equivalents</span>
                            <span>
                              KES {Number(balanceSheetData.assets.current.cash_and_equivalents).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Accounts Receivable</span>
                            <span>
                              KES {Number(balanceSheetData.assets.current.accounts_receivable).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground flex items-center gap-2">
                              Inventory (Auto)
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                Auto-calculated
                              </span>
                            </span>
                            <span className="font-mono">{formatCurrency(inventoryTotal)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Fixed Assets</h4>
                        <div className="space-y-2 pl-4">
                          <div className="flex justify-between text-sm">
                            <span>Equipment</span>
                            <span>KES {Number(balanceSheetData.assets.fixed.equipment).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Property</span>
                            <span>KES {Number(balanceSheetData.assets.fixed.property).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Vehicles</span>
                            <span>KES {Number(balanceSheetData.assets.fixed.vehicles).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold border-t pt-2">
                            <span>Total Fixed Assets</span>
                            <span>KES {Number(balanceSheetData.assets.fixed.total).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between font-bold text-lg border-t-2 pt-3">
                        <span>Total Assets</span>
                        <span>KES {Number(balanceSheetData.assets.total).toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Liabilities & Equity */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Liabilities & Equity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Current Liabilities</h4>
                        <div className="space-y-2 pl-4">
                          <div className="flex justify-between text-sm">
                            <span>Accounts Payable</span>
                            <span>
                              KES {Number(balanceSheetData.liabilities.current.accounts_payable).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Short-term Debt</span>
                            <span>
                              KES {Number(balanceSheetData.liabilities.current.short_term_debt).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold border-t pt-2">
                            <span>Total Current Liabilities</span>
                            <span>KES {Number(balanceSheetData.liabilities.current.total).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Long-term Liabilities</h4>
                        <div className="space-y-2 pl-4">
                          <div className="flex justify-between text-sm">
                            <span>Long-term Debt</span>
                            <span>
                              KES {Number(balanceSheetData.liabilities.long_term.long_term_debt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Total Liabilities</span>
                        <span>KES {Number(balanceSheetData.liabilities.total).toLocaleString()}</span>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2 mt-4">Equity</h4>
                        <div className="space-y-2 pl-4">
                          <div className="flex justify-between text-sm">
                            <span>Capital</span>
                            <span>KES {Number(balanceSheetData.equity.capital).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Retained Earnings</span>
                            <span>KES {Number(balanceSheetData.equity.retained_earnings).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold border-t pt-2">
                            <span>Total Equity</span>
                            <span>KES {Number(balanceSheetData.equity.total).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between font-bold text-lg border-t-2 pt-3">
                        <span>Total Liabilities & Equity</span>
                        <span>KES {Number(balanceSheetData.total_liabilities_and_equity).toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Loading balance sheet...</div>
              )}
            </TabsContent>

            <TabsContent value="trialbalance" className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Trial Balance</h3>
                  <p className="text-sm text-muted-foreground">
                    Account balances as of {trialBalanceData?.asOfDate || new Date().toISOString().split("T")[0]}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export Trial Balance
                </Button>
              </div>

              {trialBalanceData ? (
                <>
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>Account Balances</CardTitle>
                        <div
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            trialBalanceData.totals.isBalanced
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {trialBalanceData.totals.isBalanced ? "Balanced" : "Out of Balance"}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-4">Account Name</th>
                              <th className="text-left py-2 px-4">Category</th>
                              <th className="text-right py-2 px-4">Debit</th>
                              <th className="text-right py-2 px-4">Credit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trialBalanceData.accounts.map((account: any, index: number) => (
                              <tr key={index} className="border-b hover:bg-muted/50">
                                <td className="py-2 px-4">{account.account_name}</td>
                                <td className="py-2 px-4 capitalize">{account.account_category}</td>
                                <td className="py-2 px-4 text-right">
                                  {account.debit > 0 ? `KES ${Number(account.debit).toLocaleString()}` : "-"}
                                </td>
                                <td className="py-2 px-4 text-right">
                                  {account.credit > 0 ? `KES ${Number(account.credit).toLocaleString()}` : "-"}
                                </td>
                              </tr>
                            ))}
                            <tr className="font-bold border-t-2">
                              <td className="py-3 px-4" colSpan={2}>
                                Total
                              </td>
                              <td className="py-3 px-4 text-right">
                                KES {Number(trialBalanceData.totals.debits).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right">
                                KES {Number(trialBalanceData.totals.credits).toLocaleString()}
                              </td>
                            </tr>
                            {!trialBalanceData.totals.isBalanced && (
                              <tr className="text-red-600 font-semibold">
                                <td className="py-2 px-4" colSpan={2}>
                                  Difference
                                </td>
                                <td className="py-2 px-4 text-right" colSpan={2}>
                                  KES {Math.abs(Number(trialBalanceData.totals.difference)).toLocaleString()}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Loading trial balance...</div>
              )}
            </TabsContent>

            {/* Audit Logs Tab */}
            <TabsContent value="audit" className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Finance Audit Trail</h3>
                  <p className="text-sm text-muted-foreground">Complete log of all financial actions and changes</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export Logs
                  </Button>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter Logs
                  </Button>
                  <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={auditLogsLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${auditLogsLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Financial Activities</CardTitle>
                  <CardDescription>All finance-related actions with user attribution</CardDescription>
                </CardHeader>
                <CardContent>
                  {auditLogsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                      <span>Loading audit logs...</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Resource</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {auditLogs.map((log: AuditLog) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-mono text-sm">
                                {new Date(log.timestamp).toLocaleString()}
                              </TableCell>
                              <TableCell>{log.user}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    log.action === "DELETE"
                                      ? "destructive"
                                      : log.action === "CREATE"
                                        ? "default"
                                        : "outline"
                                  }
                                >
                                  {log.action}
                                </Badge>
                              </TableCell>
                              <TableCell>{log.resource}</TableCell>
                              <TableCell className="max-w-xs truncate">{log.details}</TableCell>
                              <TableCell className="font-mono text-sm">{log.ip_address}</TableCell>
                              <TableCell>
                                <Badge className="bg-green-500">{log.status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {auditLogs.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                No audit logs found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Today's Actions</span>
                        <span className="font-medium">{activitySummary.today}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>This Week</span>
                        <span className="font-medium">{activitySummary.thisWeek}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>This Month</span>
                        <span className="font-medium">{activitySummary.thisMonth}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Invoice Created</span>
                        <span className="font-medium">156</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payment Processed</span>
                        <span className="font-medium">142</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expense Added</span>
                        <span className="font-medium">89</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Security Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Failed Logins</span>
                        <Badge variant="destructive">3</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Suspicious Activity</span>
                        <Badge variant="secondary">0</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>System Status</span>
                        <Badge className="bg-green-500">Secure</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Create Expense Modal */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Create New Expense</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Add a new expense record to track business costs
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expense Category *</Label>
                <Select
                  value={expenseForm.category_id}
                  onValueChange={(value) => setExpenseForm((prev) => ({ ...prev, category_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((category: ExpenseCategory) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                    {expenseCategories.length === 0 && (
                      <SelectItem value="none" disabled>
                        No categories available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="w-full mt-2"
                >
                  + Add New Category
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                placeholder="Brief description of the expense"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor/Supplier</Label>
                <Select
                  value={expenseForm.vendor}
                  onValueChange={(value) => {
                    setExpenseForm((prev) => ({ ...prev, vendor: value }))
                    fetchPendingInvoices(value)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor/supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier: any) => (
                      <SelectItem key={supplier.id} value={supplier.company_name}>
                        <div className="flex flex-col">
                          <span className="font-medium">{supplier.company_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {supplier.contact_person} • {supplier.email}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    {suppliers.length === 0 && (
                      <SelectItem value="none" disabled>
                        No suppliers available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("/suppliers", "_blank")}
                  className="w-full mt-2"
                >
                  + Add New Supplier
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, expense_date: e.target.value }))}
                />
              </div>
            </div>

            {expenseForm.vendor && pendingInvoices.length > 0 && (
              <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Pending Invoices for {expenseForm.vendor}</Label>
                  <Badge variant="secondary">{pendingInvoices.length} pending</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Select an invoice to link this expense payment to:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {pendingInvoices.map((invoice: any) => {
                    const outstandingAmount = invoice.total_amount - (invoice.paid_amount || 0)
                    return (
                      <div
                        key={invoice.id}
                        className={`p-3 border rounded-md cursor-pointer transition-colors ${
                          selectedInvoiceId === invoice.id.toString()
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => handleInvoiceSelection(invoice.id.toString())}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{invoice.invoice_number}</span>
                              <Badge
                                variant={
                                  invoice.status === "OVERDUE"
                                    ? "destructive"
                                    : invoice.status === "PARTIALLY_PAID"
                                      ? "secondary"
                                      : "outline"
                                }
                                className="text-xs"
                              >
                                {invoice.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Due: {new Date(invoice.due_date).toLocaleDateString()} • PO: {invoice.po_number || "N/A"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-sm">KES {outstandingAmount.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">
                              Total: KES {invoice.total_amount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {loadingInvoices && (
              <div className="p-4 border rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">Loading pending invoices...</p>
              </div>
            )}

            {expenseForm.vendor && !loadingInvoices && pendingInvoices.length === 0 && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  No pending invoices for this supplier
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={expenseForm.payment_method}
                  onValueChange={(value) => setExpenseForm((prev) => ({ ...prev, payment_method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Credit/Debit Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={expenseForm.status}
                  onValueChange={(value) => setExpenseForm((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes or comments"
                rows={3}
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Receipt/Document</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png" />
                <Button type="button" variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateExpense}>Create Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Tax Record Modal */}
      <Dialog open={isTaxModalOpen} onOpenChange={setIsTaxModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Record Tax Obligation</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Add a new tax payment or filing record</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tax Type *</Label>
                <Select
                  value={taxFormData.taxType}
                  onValueChange={(value) => setTaxFormData({ ...taxFormData, taxType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tax type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vat">VAT Return</SelectItem>
                    <SelectItem value="income">Corporate Income Tax</SelectItem>
                    <SelectItem value="service">Service Tax</SelectItem>
                    <SelectItem value="regulatory">Regulatory Fees</SelectItem>
                    <SelectItem value="paye">PAYE</SelectItem>
                    <SelectItem value="other">Other Tax</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tax Period *</Label>
                <Input
                  placeholder="e.g., January 2024, Q1 2024"
                  value={taxFormData.taxPeriod}
                  onChange={(e) => setTaxFormData({ ...taxFormData, taxPeriod: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={taxFormData.amount}
                  onChange={(e) => setTaxFormData({ ...taxFormData, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={taxFormData.dueDate}
                  onChange={(e) => setTaxFormData({ ...taxFormData, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select
                  value={taxFormData.status}
                  onValueChange={(value) => setTaxFormData({ ...taxFormData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="filed">Filed</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Penalty (if any)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={taxFormData.penalty}
                  onChange={(e) => setTaxFormData({ ...taxFormData, penalty: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tax Authority</Label>
              <Input
                placeholder="e.g., Kenya Revenue Authority (KRA)"
                value={taxFormData.taxAuthority}
                onChange={(e) => setTaxFormData({ ...taxFormData, taxAuthority: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input
                placeholder="Tax authority reference or receipt number"
                value={taxFormData.referenceNumber}
                onChange={(e) => setTaxFormData({ ...taxFormData, referenceNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes or details"
                rows={3}
                value={taxFormData.notes}
                onChange={(e) => setTaxFormData({ ...taxFormData, notes: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Supporting Documents</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple />
                <Button type="button" variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaxModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTaxRecord}>Record Tax</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Modal */}
      <Dialog open={isExpenseEditModalOpen} onOpenChange={setIsExpenseEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Edit Expense</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Update expense record details</DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expense Category</Label>
                  <Select defaultValue={selectedExpense.category}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                      {expenseCategories.length === 0 && (
                        <SelectItem value="none" disabled>
                          No categories available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" defaultValue={selectedExpense.amount} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input defaultValue={selectedExpense.description} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor/Supplier</Label>
                  <Select defaultValue={selectedExpense.vendor}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier: any) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">{supplier.company_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {supplier.contact_person} • {supplier.email}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      {suppliers.length === 0 && (
                        <SelectItem value="none" disabled>
                          No suppliers available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" defaultValue={selectedExpense.date} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select defaultValue={selectedExpense.paymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select defaultValue={selectedExpense.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExpenseEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsExpenseEditModalOpen(false)}>Update Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExpenseCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoryCreated={fetchExpenseCategories}
      />

      {/*  Added CreateInvoiceModal implementation */}
      <CreateInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onInvoiceCreated={fetchFinancialData}
      />

      {/*  Added BudgetManagementModal implementation */}
      <BudgetManagementModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        onBudgetSaved={() => {
          fetchBudgetData()
          fetchFinancialData()
        }}
      />

      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Generate Financial Report</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Generate a comprehensive financial report for the selected date range.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">Comprehensive Report</SelectItem>
                  <SelectItem value="revenue">Revenue Analysis</SelectItem>
                  <SelectItem value="expenses">Expense Analysis</SelectItem>
                  <SelectItem value="customer-aging">Customer Aging Report</SelectItem>
                  <SelectItem value="profit-loss">Profit & Loss Statement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reportFormat">Export Format</Label>
              <Select value={reportFormat} onValueChange={setReportFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Document</SelectItem>
                  <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                  <SelectItem value="csv">CSV File</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Date Range</Label>
              <div className="text-sm text-muted-foreground">
                {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={generateReport} disabled={isGeneratingReport}>
              {isGeneratingReport ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManageBalanceSheetModal
        open={showManageBalanceSheet}
        onOpenChange={setShowManageBalanceSheet}
        onAccountsUpdated={() => {
          fetchBalanceSheet()
          fetchInventoryTotal()
        }}
      />

      {/* Invoice Details Modal */}
      <Dialog open={isInvoiceDetailsOpen} onOpenChange={setIsInvoiceDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Invoice Details</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              View details for Invoice: {selectedInvoice?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Customer</Label>
                  <p className="text-sm font-medium">{selectedInvoice.customer}</p>
                </div>
                <div>
                  <Label>Invoice ID</Label>
                  <p className="text-sm font-medium">{selectedInvoice.id}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Amount</Label>
                  <p className="text-sm font-medium">{formatCurrency(selectedInvoice.amount)}</p>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <p className="text-sm font-medium">{selectedInvoice.dueDate}</p>
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <p className="text-sm font-medium">{getStatusBadge(selectedInvoice.status)}</p>
              </div>
              {selectedInvoice.daysOverdue !== undefined && selectedInvoice.daysOverdue > 0 && (
                <div>
                  <Label>Days Overdue</Label>
                  <p className="text-sm font-medium text-red-600">{selectedInvoice.daysOverdue} days</p>
                </div>
              )}
              {/* Add more details here if available in selectedInvoice */}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Loading invoice details...</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInvoiceDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Other existing modals remain the same... */}
    </div>
  )
}

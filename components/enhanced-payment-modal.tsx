"use client"

import { CardDescription } from "@/components/ui/card"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { processPayment } from "@/app/actions/customer-service-actions"
import { format } from "date-fns"
import { formatCurrency } from "@/lib/currency"
import { toast } from "sonner"
import {
  CreditCard,
  Smartphone,
  Building2,
  Banknote,
  CalendarIcon,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Receipt,
  Zap,
  Shield,
  Info,
} from "lucide-react"

interface EnhancedPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: number
  customerName: string
  currentBalance: number
  outstandingInvoices?: Array<{
    id: string
    amount: number
    dueDate: string
    description: string
  }>
}

export function EnhancedPaymentModal({
  open,
  onOpenChange,
  customerId,
  customerName,
  currentBalance,
  outstandingInvoices = [],
}: EnhancedPaymentModalProps) {
  const [paymentType, setPaymentType] = useState("service")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("")
  const [reference, setReference] = useState("")
  const [mpesaNumber, setMpesaNumber] = useState("")
  const [airtelNumber, setAirtelNumber] = useState("")
  const [bankAccount, setBankAccount] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [paymentDate, setPaymentDate] = useState<Date>(new Date())
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sendReceipt, setSendReceipt] = useState(true)
  const [autoAllocate, setAutoAllocate] = useState(true)
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])

  const paymentTypes = [
    {
      value: "service",
      label: "Service Payment",
      description: "Regular monthly service payment",
      icon: Receipt,
    },
    {
      value: "advance",
      label: "Advance Payment",
      description: "Payment for future months",
      icon: Calendar,
    },
    {
      value: "penalty",
      label: "Penalty Payment",
      description: "Late payment fees or penalties",
      icon: AlertCircle,
    },
  ]

  const paymentMethods = [
    {
      value: "mpesa",
      label: "M-Pesa",
      icon: Smartphone,
      description: "Mobile money payment",
      fee: 0.5,
      processingTime: "Instant",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      value: "airtel",
      label: "Airtel Money",
      icon: Smartphone,
      description: "Airtel mobile money",
      fee: 0.5,
      processingTime: "Instant",
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      value: "bank",
      label: "Bank Transfer",
      icon: Building2,
      description: "Direct bank transfer",
      fee: 2.0,
      processingTime: "1-2 hours",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      value: "cash",
      label: "Cash",
      icon: Banknote,
      description: "Cash payment at office",
      fee: 0,
      processingTime: "Instant",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
    },
    {
      value: "card",
      label: "Credit/Debit Card",
      icon: CreditCard,
      description: "Card payment",
      fee: 2.5,
      processingTime: "Instant",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ]

  const selectedMethod = paymentMethods.find((m) => m.value === method)
  const paymentAmount = Number.parseFloat(amount) || 0
  const processingFee = selectedMethod ? (paymentAmount * selectedMethod.fee) / 100 : 0
  const totalAmount = paymentAmount + processingFee
  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + inv.amount, 0)

  const generateReference = () => {
    const prefix = method.toUpperCase().substring(0, 3)
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.random().toString(36).substring(2, 5).toUpperCase()
    setReference(`${prefix}${timestamp}${random}`)
  }

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString())
  }

  const handleSubmit = async () => {
    if (!amount || !paymentType) return

    if (!method) {
      toast.error("Please select a payment method")
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("customer_id", customerId.toString())
      formData.append("amount", totalAmount.toString())
      formData.append("method", method)
      formData.append("reference", reference)
      formData.append("payment_type", paymentType)
      formData.append("payment_date", paymentDate.toISOString())
      formData.append("notes", notes)
      formData.append("send_receipt", sendReceipt.toString())
      formData.append("auto_allocate", autoAllocate.toString())

      if (selectedInvoices.length > 0) {
        formData.append("selected_invoices", JSON.stringify(selectedInvoices))
      }

      const result = await processPayment(formData)

      if (result.success) {
        toast.success(result.message || "Payment processed successfully")
        onOpenChange(false)
        // Reset form
        setAmount("")
        setMethod("")
        setReference("")
        setMpesaNumber("")
        setAirtelNumber("")
        setBankAccount("")
        setCardNumber("")
        setExpiryDate("")
        setCvv("")
        setNotes("")
        setSelectedInvoices([])
      } else {
        toast.error(result.error || "Failed to process payment")
      }
    } catch (error) {
      console.error("Error processing payment:", error)
      toast.error("Failed to process payment")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoices((prev) =>
      prev.includes(invoiceId) ? prev.filter((id) => id !== invoiceId) : [...prev, invoiceId],
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Process Payment for {customerName}
          </DialogTitle>
          <DialogDescription>Record a new payment and manage invoice allocations</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Details Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Type</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentType} onValueChange={setPaymentType}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {paymentTypes.map((type) => {
                      const Icon = type.icon
                      return (
                        <div key={type.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={type.value} id={type.value} />
                          <Label htmlFor={type.value} className="cursor-pointer flex-1">
                            <Card className="p-3 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center space-x-3">
                                <Icon className="h-5 w-5 text-blue-600" />
                                <div>
                                  <div className="font-medium">{type.label}</div>
                                  <div className="text-sm text-muted-foreground">{type.description}</div>
                                </div>
                              </div>
                            </Card>
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Amount and Date */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Amount</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="amount">Amount (KES)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-10"
                    />
                  </div>
                  {totalOutstanding > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAmount(Math.abs(currentBalance))}
                        disabled={currentBalance >= 0}
                      >
                        Clear Balance (KES {Math.round(Math.abs(currentBalance))})
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAmount(totalOutstanding)}
                      >
                        Pay All Outstanding (KES {Math.round(totalOutstanding)})
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="payment-date">Payment Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={paymentDate}
                          onSelect={(date) => date && setPaymentDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="reference">Reference Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="reference"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Payment reference"
                      />
                      <Button type="button" variant="outline" onClick={generateReference}>
                        <Zap className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes about this payment"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {paymentMethods.map((paymentMethod) => (
                    <Card
                      key={paymentMethod.value}
                      className={`cursor-pointer transition-all ${
                        method === paymentMethod.value
                          ? "ring-2 ring-primary border-primary"
                          : "hover:shadow-sm border-gray-200"
                      }`}
                      onClick={() => setMethod(paymentMethod.value)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${paymentMethod.bgColor}`}>
                            <paymentMethod.icon className={`w-5 h-5 ${paymentMethod.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{paymentMethod.label}</div>
                            <div className="text-sm text-muted-foreground">{paymentMethod.description}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {paymentMethod.fee}% fee
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {paymentMethod.processingTime}
                              </Badge>
                            </div>
                          </div>
                          {method === paymentMethod.value && <CheckCircle className="w-5 h-5 text-green-500" />}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Method-specific fields */}
                {method === "mpesa" && (
                  <div className="space-y-3 p-4 border rounded-lg bg-green-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">M-Pesa Payment Details</span>
                    </div>
                    <div>
                      <Label htmlFor="mpesa-number">M-Pesa Number</Label>
                      <Input
                        id="mpesa-number"
                        value={mpesaNumber}
                        onChange={(e) => setMpesaNumber(e.target.value)}
                        placeholder="254712345678"
                      />
                    </div>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Payment will be processed instantly. Customer will receive SMS confirmation.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {method === "airtel" && (
                  <div className="space-y-3 p-4 border rounded-lg bg-red-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-800">Airtel Money Payment Details</span>
                    </div>
                    <div>
                      <Label htmlFor="airtel-number">Airtel Number</Label>
                      <Input
                        id="airtel-number"
                        value={airtelNumber}
                        onChange={(e) => setAirtelNumber(e.target.value)}
                        placeholder="254712345678"
                      />
                    </div>
                  </div>
                )}

                {method === "bank" && (
                  <div className="space-y-3 p-4 border rounded-lg bg-blue-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Bank Transfer Details</span>
                    </div>
                    <div>
                      <Label htmlFor="bank-account">Bank Account / Reference</Label>
                      <Input
                        id="bank-account"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        placeholder="Account number or transfer reference"
                      />
                    </div>
                  </div>
                )}

                {method === "card" && (
                  <div className="space-y-3 p-4 border rounded-lg bg-purple-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-purple-800">Card Payment Details</span>
                    </div>
                    <div>
                      <Label htmlFor="card-number">Card Number</Label>
                      <Input
                        id="card-number"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="expiry-date">Expiry Date</Label>
                        <Input
                          id="expiry-date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          placeholder="MM/YY"
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          placeholder="123"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="send-receipt" checked={sendReceipt} onCheckedChange={setSendReceipt} />
                  <Label htmlFor="send-receipt" className="text-sm">
                    Send payment receipt via email
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="auto-allocate" checked={autoAllocate} onCheckedChange={setAutoAllocate} />
                  <Label htmlFor="auto-allocate" className="text-sm">
                    Automatically allocate payment to outstanding invoices
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Column */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Current Balance:</span>
                  <span className={`font-semibold ${currentBalance < 0 ? "text-red-600" : "text-green-600"}`}>
                    KES {Math.round(currentBalance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Outstanding Invoices:</span>
                  <span className="font-semibold">{outstandingInvoices.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Outstanding:</span>
                  <span className="font-semibold text-red-600">KES {Math.round(totalOutstanding)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Payment Amount:</span>
                    <span className="font-semibold">KES {Math.round(paymentAmount)}</span>
                  </div>
                  {processingFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Processing Fee ({selectedMethod?.fee}%):</span>
                      <span className="text-sm">KES {Math.round(processingFee)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-medium">Total Amount:</span>
                    <span className="font-bold text-lg">KES {Math.round(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">New Balance:</span>
                    <span
                      className={`font-semibold ${currentBalance + paymentAmount < 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      KES {Math.round(currentBalance + paymentAmount)}
                    </span>
                  </div>
                  {selectedMethod && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-muted-foreground">Processing Time:</div>
                      <div className="font-medium">{selectedMethod.processingTime}</div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!amount || !paymentType || isLoading || !method}
                  className="w-full mt-6"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Process Payment
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Outstanding Invoices */}
            {outstandingInvoices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Outstanding Invoices</CardTitle>
                  <CardDescription className="text-xs">
                    {autoAllocate
                      ? "Select invoices to pay, or leave unselected to apply to oldest first"
                      : "Manual allocation - select invoices to pay"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {outstandingInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className={`flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50 ${
                          selectedInvoices.includes(invoice.id) ? "bg-blue-50 border-blue-300" : ""
                        }`}
                        onClick={() => toggleInvoiceSelection(invoice.id)}
                      >
                        <Checkbox
                          checked={selectedInvoices.includes(invoice.id)}
                          onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{invoice.id}</div>
                          <div className="text-xs text-muted-foreground">{invoice.description}</div>
                          <div className="text-xs text-muted-foreground">Due: {invoice.dueDate}</div>
                        </div>
                        <div className="text-sm font-semibold">KES {invoice.amount}</div>
                      </div>
                    ))}
                  </div>
                  {selectedInvoices.length === 0 && autoAllocate && (
                    <Alert className="mt-3">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Payment will be applied to the oldest invoice first
                      </AlertDescription>
                    </Alert>
                  )}
                  {selectedInvoices.length > 0 && (
                    <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                      <div className="font-medium">Selected: {selectedInvoices.length} invoice(s)</div>
                      <div className="text-xs text-muted-foreground">
                        Total:{" "}
                        {formatCurrency(
                          outstandingInvoices
                            .filter((inv) => selectedInvoices.includes(inv.id))
                            .reduce((sum, inv) => sum + inv.amount, 0),
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { X, FileText } from "lucide-react"

interface PaymentModalProps {
  customerId: number
  customerName: string
  onClose: () => void
  onSuccess: () => void
}

interface Invoice {
  id: number
  invoice_number: string
  amount: number
  paid_amount: number
  balance_due: number
  status: string
  due_date: string
  description: string
}

export default function PaymentModal({ customerId, customerName, onClose, onSuccess }: PaymentModalProps) {
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("mpesa")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [description, setDescription] = useState("")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(true)

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await fetch(`/api/customers/${customerId}/invoices/unpaid`)
        const data = await response.json()
        if (data.success) {
          setInvoices(data.invoices)
        }
      } catch (error) {
        console.error("Error fetching invoices:", error)
      } finally {
        setLoadingInvoices(false)
      }
    }

    fetchInvoices()
  }, [customerId])

  const toggleInvoiceSelection = (invoiceId: number) => {
    setSelectedInvoices((prev) =>
      prev.includes(invoiceId) ? prev.filter((id) => id !== invoiceId) : [...prev, invoiceId],
    )
  }

  const selectedTotal = invoices
    .filter((inv) => selectedInvoices.includes(inv.id))
    .reduce((sum, inv) => sum + inv.balance_due, 0)

  const handleProcessPayment = async () => {
    if (!amount) {
      toast.error("Please enter an amount")
      return
    }

    if (paymentMethod === "mpesa" && !phoneNumber) {
      toast.error("Please enter a phone number for M-Pesa payments")
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/finance/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number.parseFloat(amount),
          payment_method: paymentMethod,
          phone_number: phoneNumber,
          description: description || `Payment for ${customerName}`,
          reference_number: referenceNumber,
          selected_invoices: selectedInvoices.length > 0 ? selectedInvoices : undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Payment processed successfully")
        onSuccess()
      } else {
        toast.error(data.error || "Failed to process payment")
      }
    } catch (error) {
      console.error("Error processing payment:", error)
      toast.error("Failed to process payment")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <DialogTitle className="text-xl font-semibold">Process Payment</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            Process a payment for {customerName}. Enter the payment details below.
          </DialogDescription>
          <button
            onClick={onClose}
            className="absolute right-0 top-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <div className="space-y-5 pt-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Customer</Label>
            <div className="px-3 py-2 bg-muted text-muted-foreground rounded-md border">{customerName}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">
              Amount (KES) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="focus-visible:ring-purple-500 focus-visible:ring-2"
              required
            />
            {selectedInvoices.length > 0 && (
              <p className="text-sm text-muted-foreground">Selected invoices total: KES {selectedTotal.toFixed(2)}</p>
            )}
          </div>

          {invoices.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Apply Payment to Invoices (Optional)</Label>
              <p className="text-xs text-muted-foreground">
                Select specific invoices to pay, or leave unselected to automatically apply to oldest invoices first.
              </p>
              <div className="border rounded-md max-h-[200px] overflow-y-auto">
                {loadingInvoices ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Loading invoices...</div>
                ) : (
                  <div className="divide-y">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-start gap-3 p-3 hover:bg-muted/50">
                        <Checkbox
                          id={`invoice-${invoice.id}`}
                          checked={selectedInvoices.includes(invoice.id)}
                          onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                          className="mt-1"
                        />
                        <label htmlFor={`invoice-${invoice.id}`} className="flex-1 cursor-pointer">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{invoice.invoice_number}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">{invoice.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">KES {invoice.balance_due.toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">
                                Due: {new Date(invoice.due_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="payment-method" className="text-sm font-medium">
              Payment Method
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="payment-method" className="focus:ring-purple-500 focus:ring-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Credit/Debit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === "mpesa" && (
            <div className="space-y-2">
              <Label htmlFor="phone-number" className="text-sm font-medium">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone-number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="254712345678"
                className="focus-visible:ring-purple-500 focus-visible:ring-2"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Payment description..."
              rows={3}
              className="focus-visible:ring-purple-500 focus-visible:ring-2 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-number" className="text-sm font-medium">
              Reference Number
            </Label>
            <Input
              id="reference-number"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Optional reference number"
              className="focus-visible:ring-purple-500 focus-visible:ring-2"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="px-6 bg-transparent">
              Cancel
            </Button>
            <Button
              onClick={handleProcessPayment}
              disabled={isProcessing}
              className="px-6 bg-black hover:bg-black/90 text-white"
            >
              {isProcessing ? "Processing..." : "Process Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreditCard, Smartphone, Banknote, Building2, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"

interface PaymentProcessorProps {
  customerId?: number
  onPaymentComplete?: (paymentId: string) => void
}

export function PaymentProcessor({ customerId, onPaymentComplete }: PaymentProcessorProps) {
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; paymentId?: string } | null>(null)
  const [formData, setFormData] = useState({
    customer_id: customerId || "",
    amount: "",
    payment_method: "",
    description: "",
    reference: "",
    phone_number: "",
    notes: "",
  })

  const paymentMethods = [
    { value: "mpesa", label: "M-Pesa", icon: Smartphone, description: "Mobile money payment" },
    { value: "cash", label: "Cash", icon: Banknote, description: "Cash payment" },
    { value: "card", label: "Card", icon: CreditCard, description: "Credit/Debit card" },
    { value: "bank_transfer", label: "Bank Transfer", icon: Building2, description: "Direct bank transfer" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setResult(null)

    try {
      const response = await fetch("/api/payments/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: Number.parseFloat(formData.amount),
          customer_id: Number.parseInt(formData.customer_id.toString()),
          metadata: {
            phone_number: formData.phone_number,
            notes: formData.notes,
          },
        }),
      })

      const data = await response.json()
      setResult(data)

      if (data.success && onPaymentComplete) {
        onPaymentComplete(data.payment_id)
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Failed to process payment. Please try again.",
      })
    } finally {
      setProcessing(false)
    }
  }

  const resetForm = () => {
    setFormData({
      customer_id: customerId || "",
      amount: "",
      payment_method: "",
      description: "",
      reference: "",
      phone_number: "",
      notes: "",
    })
    setResult(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Process Payment
          </CardTitle>
          <CardDescription>Process payments through multiple payment gateways</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Selection */}
            {!customerId && (
              <div className="space-y-2">
                <Label htmlFor="customer_id">Customer ID</Label>
                <Input
                  id="customer_id"
                  type="number"
                  value={formData.customer_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customer_id: e.target.value }))}
                  placeholder="Enter customer ID"
                  required
                />
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon
                  return (
                    <div
                      key={method.value}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        formData.payment_method === method.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setFormData((prev) => ({ ...prev, payment_method: method.value }))}
                    >
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4" />
                        <div>
                          <p className="font-medium text-sm">{method.label}</p>
                          <p className="text-xs text-muted-foreground">{method.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* M-Pesa Phone Number */}
            {formData.payment_method === "mpesa" && (
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone_number: e.target.value }))}
                  placeholder="254712345678"
                  required
                />
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Payment description"
                required
              />
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="reference">Reference (Optional)</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData((prev) => ({ ...prev, reference: e.target.value }))}
                placeholder="Payment reference"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
                rows={3}
              />
            </div>

            {/* Result Alert */}
            {result && (
              <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                    {result.message}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={processing || !formData.payment_method || !formData.amount}
                className="flex-1"
              >
                {processing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Process Payment
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Payment Status Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Payment Status Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">Pending:</span>
            <span className="text-muted-foreground">Payment initiated, awaiting confirmation</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="font-medium">Completed:</span>
            <span className="text-muted-foreground">Payment successful, services activated</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="font-medium">Failed:</span>
            <span className="text-muted-foreground">Payment unsuccessful, retry required</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <span className="font-medium">Processing:</span>
            <span className="text-muted-foreground">Payment being processed by gateway</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

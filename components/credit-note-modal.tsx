"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface CreditNoteModalProps {
  customerId: number
  customerName: string
  onClose: () => void
  onSuccess: () => void
}

export default function CreditNoteModal({ customerId, customerName, onClose, onSuccess }: CreditNoteModalProps) {
  const [creditType, setCreditType] = useState("adjustment")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [autoApply, setAutoApply] = useState(true)
  const [refundMethod, setRefundMethod] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateCreditNote = async () => {
    if (!amount || !reason) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/finance/credit-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credit_type: creditType,
          amount: Number.parseFloat(amount),
          reason,
          reference_number: referenceNumber,
          auto_apply: autoApply,
          refund_method: creditType === "refund" ? refundMethod : null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Credit note created successfully")
        onSuccess()
      } else {
        toast.error(data.error || "Failed to create credit note")
      }
    } catch (error) {
      console.error("Error creating credit note:", error)
      toast.error("Failed to create credit note")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Credit Note</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Customer</Label>
            <Input value={customerName} disabled />
          </div>

          <div>
            <Label>Credit Type</Label>
            <Select value={creditType} onValueChange={setCreditType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adjustment">Account Adjustment</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="discount">Discount</SelectItem>
                <SelectItem value="goodwill">Goodwill Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Amount (KES) *</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Reason *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for credit note..."
              rows={3}
            />
          </div>

          <div>
            <Label>Reference Number</Label>
            <Input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Optional reference number"
            />
          </div>

          {creditType === "refund" && (
            <div>
              <Label>Refund Method</Label>
              <Select value={refundMethod} onValueChange={setRefundMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select refund method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch id="auto-apply" checked={autoApply} onCheckedChange={setAutoApply} />
            <Label htmlFor="auto-apply">Auto-apply to outstanding invoices</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreateCreditNote} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Credit Note"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

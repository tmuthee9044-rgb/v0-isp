"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface RecurringInvoiceModalProps {
  customerId: number
  customerName: string
  onClose: () => void
  onSuccess: () => void
}

export default function RecurringInvoiceModal({
  customerId,
  customerName,
  onClose,
  onSuccess,
}: RecurringInvoiceModalProps) {
  const [frequency, setFrequency] = useState("monthly")
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateRecurringInvoice = async () => {
    if (!amount || !startDate || !description) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsCreating(true)
    try {
      // Note: This would need a new API endpoint for recurring invoices
      const response = await fetch(`/api/customers/${customerId}/finance/recurring-invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frequency,
          start_date: startDate.toISOString(),
          end_date: endDate?.toISOString(),
          amount: Number.parseFloat(amount),
          description,
        }),
      })

      if (response.ok) {
        toast.success("Recurring invoice setup successfully")
        onSuccess()
      } else {
        toast.error("Failed to setup recurring invoice")
      }
    } catch (error) {
      console.error("Error creating recurring invoice:", error)
      toast.error("Failed to setup recurring invoice")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Setup Recurring Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Customer</Label>
            <Input value={customerName} disabled />
          </div>

          <div>
            <Label>Description *</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Monthly service charges"
            />
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
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>End Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "No end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreateRecurringInvoice} disabled={isCreating}>
              {isCreating ? "Creating..." : "Setup Recurring Invoice"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

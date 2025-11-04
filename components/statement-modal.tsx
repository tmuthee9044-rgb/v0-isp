"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Download } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface StatementModalProps {
  customerId: number
  customerName: string
  onClose: () => void
  onSuccess: () => void
}

export default function StatementModal({ customerId, customerName, onClose, onSuccess }: StatementModalProps) {
  const [fromDate, setFromDate] = useState<Date>()
  const [toDate, setToDate] = useState<Date>()
  const [statementType, setStatementType] = useState("full")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateStatement = async () => {
    if (!fromDate || !toDate) {
      toast.error("Please select both from and to dates")
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/finance/statements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_date: fromDate.toISOString(),
          to_date: toDate.toISOString(),
          statement_type: statementType,
          format: "pdf",
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `statement-${customerId}-${format(fromDate, "yyyy-MM-dd")}-${format(toDate, "yyyy-MM-dd")}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast.success("Statement generated successfully")
        onSuccess()
      } else {
        toast.error("Failed to generate statement")
      }
    } catch (error) {
      console.error("Error generating statement:", error)
      toast.error("Failed to generate statement")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Statement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Customer</Label>
            <Input value={customerName} disabled />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label>Statement Type</Label>
            <Select value={statementType} onValueChange={setStatementType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Statement</SelectItem>
                <SelectItem value="invoices_only">Invoices Only</SelectItem>
                <SelectItem value="payments_only">Payments Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleGenerateStatement} disabled={isGenerating}>
              <Download className="mr-2 h-4 w-4" />
              {isGenerating ? "Generating..." : "Generate Statement"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface LedgerEntry {
  transaction_date: string
  entry_number: string
  description: string
  debit_amount: number
  credit_amount: number
  running_balance: number
  status: string
}

interface AccountLedgerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: {
    id: number
    account_code: string
    account_name: string
    account_type: string
  }
}

export function AccountLedgerModal({ open, onOpenChange, account }: AccountLedgerModalProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [totals, setTotals] = useState({ debits: 0, credits: 0, balance: 0 })
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchLedger()
    }
  }, [open])

  const fetchLedger = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)

      const response = await fetch(`/api/finance/ledger/${account.id}?${params}`)
      const data = await response.json()

      setEntries(data.entries || [])
      setTotals({
        debits: data.total_debits || 0,
        credits: data.total_credits || 0,
        balance: data.current_balance || 0,
      })
    } catch (error) {
      console.error("Error fetching ledger:", error)
      toast({
        title: "Error",
        description: "Failed to fetch ledger entries",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const exportToCSV = () => {
    const headers = ["Date", "Entry Number", "Description", "Debit", "Credit", "Balance"]
    const rows = entries.map((entry) => [
      entry.transaction_date,
      entry.entry_number,
      entry.description,
      entry.debit_amount || 0,
      entry.credit_amount || 0,
      entry.running_balance,
    ])

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
      "",
      `Total Debits,${totals.debits}`,
      `Total Credits,${totals.credits}`,
      `Current Balance,${totals.balance}`,
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ledger-${account.account_code}-${Date.now()}.csv`
    a.click()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Account Ledger: {account.account_code} - {account.account_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button onClick={fetchLedger} disabled={loading}>
              Apply Filter
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Total Debits</p>
              <p className="text-2xl font-bold">{formatCurrency(totals.debits)}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Total Credits</p>
              <p className="text-2xl font-bold">{formatCurrency(totals.credits)}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold">{formatCurrency(totals.balance)}</p>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(entry.transaction_date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.entry_number}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(entry.running_balance)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

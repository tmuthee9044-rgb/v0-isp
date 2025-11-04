"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface FinanceDocument {
  id: number
  type: "invoice" | "payment" | "credit_note"
  reference_number?: string
  invoice_number?: string
  description?: string
  notes?: string
  amount?: number
  total_amount?: number
  status: string
  due_date?: string
  created_at?: string
  invoice_date?: string
  payment_date?: string
}

export default function EditDocumentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [document, setDocument] = useState<FinanceDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await fetch(`/api/finance/documents/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setDocument(data.document)
        } else {
          toast({
            title: "Error",
            description: "Failed to load document",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Failed to fetch document:", error)
        toast({
          title: "Error",
          description: "Failed to load document",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [params.id])

  const handleSave = async () => {
    if (!document) return

    setSaving(true)
    try {
      const response = await fetch(`/api/finance/documents/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(document),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Document updated successfully",
        })
        router.push(`/finance/documents/${params.id}/view`)
      } else {
        throw new Error("Failed to update document")
      }
    } catch (error) {
      console.error("Failed to update document:", error)
      toast({
        title: "Error",
        description: "Failed to update document",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <FileText className="h-8 w-8 animate-pulse mx-auto mb-4" />
            <p>Loading document...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <FileText className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p>Document not found</p>
            <Button onClick={() => router.back()} className="mt-4">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Document</h1>
            <p className="text-muted-foreground">{document.reference_number || document.invoice_number}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Document Type</Label>
              <Select
                value={document.type}
                onValueChange={(value: "invoice" | "payment" | "credit_note") =>
                  setDocument({ ...document, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="credit_note">Credit Note</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={document.status} onValueChange={(value) => setDocument({ ...document, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                value={document.reference_number || ""}
                onChange={(e) => setDocument({ ...document, reference_number: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (KSh)</Label>
              <Input
                id="amount"
                type="number"
                value={Math.round(document.amount || document.total_amount || 0)}
                onChange={(e) => setDocument({ ...document, amount: Number.parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={document.due_date ? new Date(document.due_date).toISOString().split("T")[0] : ""}
                onChange={(e) => setDocument({ ...document, due_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_date">Invoice Date</Label>
              <Input
                id="invoice_date"
                type="date"
                value={document.invoice_date ? new Date(document.invoice_date).toISOString().split("T")[0] : ""}
                onChange={(e) => setDocument({ ...document, invoice_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={document.description || ""}
              onChange={(e) => setDocument({ ...document, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={document.notes || ""}
              onChange={(e) => setDocument({ ...document, notes: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

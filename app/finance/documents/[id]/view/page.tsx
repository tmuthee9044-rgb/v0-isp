"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, Printer as Print, Edit, Calendar, DollarSign, FileText, User } from "lucide-react"
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
  customer_name?: string
  customer_email?: string
}

export default function ViewDocumentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [document, setDocument] = useState<FinanceDocument | null>(null)
  const [loading, setLoading] = useState(true)

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

  const handleDownload = () => {
    toast({ title: "Download", description: "Document download started" })
  }

  const handlePrint = () => {
    window.print()
  }

  const handleEdit = () => {
    router.push(`/finance/documents/${params.id}/edit`)
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
            <h1 className="text-2xl font-bold">
              {document.type === "invoice" ? "Invoice" : document.type === "payment" ? "Payment" : "Credit Note"}
            </h1>
            <p className="text-muted-foreground">{document.reference_number || document.invoice_number}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Print className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <Badge variant="outline" className="mt-1">
                  {document.type.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge variant={document.status === "paid" ? "default" : "destructive"} className="mt-1">
                  {document.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            {document.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1">{document.description}</p>
              </div>
            )}

            {document.notes && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                <p className="mt-1 text-sm text-muted-foreground">{document.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">
                  KSh {Math.round(document.amount || document.total_amount || 0).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {document.created_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{new Date(document.created_at).toLocaleDateString()}</span>
                </div>
              )}
              {document.invoice_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Date:</span>
                  <span>{new Date(document.invoice_date).toLocaleDateString()}</span>
                </div>
              )}
              {document.due_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span>{new Date(document.due_date).toLocaleDateString()}</span>
                </div>
              )}
              {document.payment_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Date:</span>
                  <span>{new Date(document.payment_date).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {(document.customer_name || document.customer_email) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {document.customer_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{document.customer_name}</span>
                  </div>
                )}
                {document.customer_email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{document.customer_email}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

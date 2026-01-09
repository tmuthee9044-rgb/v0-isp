"use client"

import { useParams } from "next/navigation"
import { useEffect } from "react"

export default function InvoiceViewPage() {
  const params = useParams()
  const customerId = params.id as string
  const invoiceId = params.invoiceId as string

  useEffect(() => {
    // Redirect to the API endpoint that generates the HTML
    window.location.href = `/api/customers/${customerId}/invoices/${invoiceId}/view`
  }, [customerId, invoiceId])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading invoice...</p>
      </div>
    </div>
  )
}

"use client"

import { notFound } from "next/navigation"

interface PrintDocumentPageProps {
  params: { id: string }
}

interface DocumentData {
  id: string
  type: string
  reference_number?: string
  invoice_number?: string
  date?: string
  due_date?: string
  status: string
  amount: string
  description?: string
  first_name?: string
  last_name?: string
  business_name?: string
  customer_type?: string
  email?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
}

export default async function PrintDocumentPage({ params }: PrintDocumentPageProps) {
  try {
    const response = await fetch(`/api/finance/documents/${params.id}`, {
      cache: "no-store",
    })

    if (!response.ok) {
      notFound()
    }

    const data = await response.json()
    const document: DocumentData = data.document

    return (
      <div className="print-document max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-white">
        <style jsx global>{`
          @media print {
            body { margin: 0; }
            .print-document { margin: 0; padding: 20px; }
            .no-print { display: none; }
          }
          @media (max-width: 640px) {
            .print-document { padding: 12px; }
          }
        `}</style>

        <div className="no-print mb-4 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-3 py-2 text-sm sm:px-4 rounded hover:bg-blue-700"
          >
            Print Document
          </button>
          <button
            onClick={() => window.close()}
            className="bg-gray-600 text-white px-3 py-2 text-sm sm:px-4 rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>

        <div className="header text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{document.type.toUpperCase()}</h1>
          <h2 className="text-lg sm:text-xl">{document.reference_number || document.invoice_number}</h2>
        </div>

        <div className="document-info mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm sm:text-base">
            <div>
              <p>
                <strong>Date:</strong> {document.date ? new Date(document.date).toLocaleDateString() : "N/A"}
              </p>
              <p>
                <strong>Due Date:</strong>{" "}
                {document.due_date ? new Date(document.due_date).toLocaleDateString() : "N/A"}
              </p>
            </div>
            <div>
              <p>
                <strong>Status:</strong> <span className="capitalize">{document.status}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="customer-info mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold mb-2">Customer Information</h3>
          <div className="text-sm sm:text-base space-y-1">
            <p>
              <strong>Name:</strong>{" "}
              {document.customer_type === "company" || document.customer_type === "school"
                ? document.business_name
                : `${document.first_name} ${document.last_name}`}
            </p>
            <p>
              <strong>Email:</strong> {document.email}
            </p>
            <p>
              <strong>Address:</strong> {document.address}, {document.city}, {document.state} {document.postal_code}
            </p>
          </div>
        </div>

        <div className="amount mb-4 sm:mb-6">
          <p className="text-lg sm:text-xl font-bold">
            <strong>Total Amount:</strong> {Math.round(Number.parseFloat(document.amount || "0"))} Sh
          </p>
        </div>

        {document.description && (
          <div className="description">
            <h3 className="text-base sm:text-lg font-semibold mb-2">Description</h3>
            <p className="text-sm sm:text-base">{document.description}</p>
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error("Error fetching document for print:", error)
    notFound()
  }
}

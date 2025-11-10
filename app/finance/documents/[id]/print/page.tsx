"use client"

import { neon } from "@neondatabase/serverless"
import { notFound } from "next/navigation"

const sql = neon(process.env.DATABASE_URL!)

interface PrintDocumentPageProps {
  params: { id: string }
}

export default async function PrintDocumentPage({ params }: PrintDocumentPageProps) {
  try {
    const documents = await sql`
      SELECT 
        fd.*,
        c.first_name,
        c.last_name,
        c.business_name,
        c.customer_type,
        c.email,
        c.address,
        c.city,
        c.state,
        c.postal_code
      FROM finance_documents fd
      LEFT JOIN customers c ON fd.customer_id = c.id
      WHERE fd.id = ${params.id}
    `

    if (documents.length === 0) {
      notFound()
    }

    const document = documents[0]

    return (
      <div className="print-document max-w-4xl mx-auto p-8 bg-white">
        <style jsx global>{`
          @media print {
            body { margin: 0; }
            .print-document { margin: 0; padding: 20px; }
            .no-print { display: none; }
          }
        `}</style>

        <div className="no-print mb-4">
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Print Document
          </button>
          <button
            onClick={() => window.close()}
            className="ml-2 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>

        <div className="header text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{document.type.toUpperCase()}</h1>
          <h2 className="text-xl">{document.reference_number || document.invoice_number}</h2>
        </div>

        <div className="document-info mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>
                <strong>Date:</strong> {new Date(document.date).toLocaleDateString()}
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

        <div className="customer-info mb-6">
          <h3 className="text-lg font-semibold mb-2">Customer Information</h3>
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

        <div className="amount mb-6">
          <p className="text-xl font-bold">
            <strong>Total Amount:</strong> {Math.round(Number.parseFloat(document.amount || "0"))} Sh
          </p>
        </div>

        {document.description && (
          <div className="description">
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p>{document.description}</p>
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error("Error fetching document for print:", error)
    notFound()
  }
}

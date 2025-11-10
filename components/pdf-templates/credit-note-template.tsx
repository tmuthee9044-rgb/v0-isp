interface CreditNoteData {
  customer: {
    id: number
    first_name: string
    last_name: string
    business_name?: string
    email: string
    phone: string
    address: string
    account_number: string
  }
  company: {
    company_name: string
    address: string
    phone: string
    email: string
    tax_number: string
    registration_number: string
    website?: string
  }
  creditNote: {
    credit_note_number: string
    credit_note_date: string
    original_invoice_number?: string
    reason: string
    subtotal: number
    tax_amount: number
    total_amount: number
    status: string
  }
  items: Array<{
    description: string
    quantity: number
    unit_price: number
    total_amount: number
    tax_rate: number
  }>
}

interface CreditNoteTemplateProps {
  data: CreditNoteData
}

export function CreditNoteTemplate({ data }: CreditNoteTemplateProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-KE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "applied":
        return "text-green-600 bg-green-100"
      case "pending":
        return "text-yellow-600 bg-yellow-100"
      case "cancelled":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 text-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-blue-600 mb-2">{data.company.company_name}</h1>
          <div className="text-gray-600 space-y-1">
            <p>{data.company.address}</p>
            <p>Phone: {data.company.phone}</p>
            <p>Email: {data.company.email}</p>
            {data.company.website && <p>Website: {data.company.website}</p>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-red-600 mb-2">CREDIT NOTE</h2>
          <div className="text-gray-600 space-y-1">
            <p>
              <strong>Credit Note #:</strong> {data.creditNote.credit_note_number}
            </p>
            <p>
              <strong>Date:</strong> {formatDate(data.creditNote.credit_note_date)}
            </p>
            {data.creditNote.original_invoice_number && (
              <p>
                <strong>Original Invoice:</strong> {data.creditNote.original_invoice_number}
              </p>
            )}
            <div
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(data.creditNote.status)}`}
            >
              {data.creditNote.status.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Credit To */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Credit To:</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold text-lg">
                {data.customer.business_name || `${data.customer.first_name} ${data.customer.last_name}`}
              </p>
              <p>
                <strong>Account #:</strong> {data.customer.account_number}
              </p>
              <p>
                <strong>Email:</strong> {data.customer.email}
              </p>
              <p>
                <strong>Phone:</strong> {data.customer.phone}
              </p>
            </div>
            <div>
              <p>
                <strong>Address:</strong>
              </p>
              <p>{data.customer.address}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reason for Credit */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Reason for Credit</h3>
        <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
          <p className="text-gray-700">{data.creditNote.reason}</p>
        </div>
      </div>

      {/* Credit Note Items */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Credit Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-3 text-left">Description</th>
                <th className="border border-gray-300 px-4 py-3 text-center">Qty</th>
                <th className="border border-gray-300 px-4 py-3 text-right">Unit Price</th>
                <th className="border border-gray-300 px-4 py-3 text-right">Tax Rate</th>
                <th className="border border-gray-300 px-4 py-3 text-right">Credit Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-300 px-4 py-3">{item.description}</td>
                  <td className="border border-gray-300 px-4 py-3 text-center">{item.quantity}</td>
                  <td className="border border-gray-300 px-4 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="border border-gray-300 px-4 py-3 text-right">{item.tax_rate}%</td>
                  <td className="border border-gray-300 px-4 py-3 text-right font-semibold text-red-600">
                    {formatCurrency(item.total_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="bg-red-50 p-4 rounded-lg space-y-2 border border-red-200">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="text-red-600">{formatCurrency(data.creditNote.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax Credit:</span>
              <span className="text-red-600">{formatCurrency(data.creditNote.tax_amount)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-lg font-bold">
              <span>Total Credit Amount:</span>
              <span className="text-red-600">{formatCurrency(data.creditNote.total_amount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Application */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Credit Application</h3>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-700">
            This credit note will be applied to your account balance. If you have outstanding invoices, the credit will
            be automatically applied to reduce your balance. Any remaining credit will be held on your account for
            future use.
          </p>
          <div className="mt-3 p-3 bg-white rounded border">
            <p>
              <strong>Credit Note Reference:</strong> {data.creditNote.credit_note_number}
            </p>
            <p>
              <strong>Amount to be Credited:</strong>{" "}
              <span className="text-green-600 font-semibold">{formatCurrency(data.creditNote.total_amount)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Company Details */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Company Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <p>
              <strong>Tax ID:</strong> {data.company.tax_number}
            </p>
            <p>
              <strong>Registration #:</strong> {data.company.registration_number}
            </p>
          </div>
          <div>
            <p>
              <strong>Contact:</strong> {data.company.email}
            </p>
            <p>
              <strong>Phone:</strong> {data.company.phone}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-4 text-xs text-gray-500">
        <div className="flex justify-between">
          <div>
            <p>This credit note has been issued in accordance with applicable tax regulations.</p>
            <p>For inquiries regarding this credit note, please contact us at {data.company.email}</p>
          </div>
          <div className="text-right">
            <p>Generated on: {formatDate(new Date().toISOString())}</p>
            <p>Page 1 of 1</p>
          </div>
        </div>
      </div>
    </div>
  )
}

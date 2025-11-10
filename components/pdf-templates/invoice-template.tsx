interface InvoiceData {
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
  invoice: {
    invoice_number: string
    invoice_date: string
    due_date: string
    subtotal: number
    tax_amount: number
    discount_amount: number
    amount: number
    status: string
    payment_terms: number
    service_period_start?: string
    service_period_end?: string
  }
  items: Array<{
    description: string
    quantity: number
    unit_price: number
    total_amount: number
    tax_rate: number
  }>
}

interface InvoiceTemplateProps {
  data: InvoiceData
}

export function InvoiceTemplate({ data }: InvoiceTemplateProps) {
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
      case "paid":
        return "text-green-600 bg-green-100"
      case "overdue":
        return "text-red-600 bg-red-100"
      case "pending":
        return "text-yellow-600 bg-yellow-100"
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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">INVOICE</h2>
          <div className="text-gray-600 space-y-1">
            <p>
              <strong>Invoice #:</strong> {data.invoice.invoice_number}
            </p>
            <p>
              <strong>Date:</strong> {formatDate(data.invoice.invoice_date)}
            </p>
            <p>
              <strong>Due Date:</strong> {formatDate(data.invoice.due_date)}
            </p>
            <div
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(data.invoice.status)}`}
            >
              {data.invoice.status.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Bill To:</h3>
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
                <strong>Billing Address:</strong>
              </p>
              <p>{data.customer.address}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Service Period */}
      {data.invoice.service_period_start && data.invoice.service_period_end && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Service Period</h3>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p>
              <strong>From:</strong> {formatDate(data.invoice.service_period_start)} <strong>To:</strong>{" "}
              {formatDate(data.invoice.service_period_end)}
            </p>
          </div>
        </div>
      )}

      {/* Invoice Items */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Invoice Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-3 text-left">Description</th>
                <th className="border border-gray-300 px-4 py-3 text-center">Qty</th>
                <th className="border border-gray-300 px-4 py-3 text-right">Unit Price</th>
                <th className="border border-gray-300 px-4 py-3 text-right">Tax Rate</th>
                <th className="border border-gray-300 px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-300 px-4 py-3">{item.description}</td>
                  <td className="border border-gray-300 px-4 py-3 text-center">{item.quantity}</td>
                  <td className="border border-gray-300 px-4 py-3 text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="border border-gray-300 px-4 py-3 text-right">{item.tax_rate}%</td>
                  <td className="border border-gray-300 px-4 py-3 text-right font-semibold">
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
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(data.invoice.subtotal)}</span>
            </div>
            {data.invoice.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-{formatCurrency(data.invoice.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>{formatCurrency(data.invoice.tax_amount)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-lg font-bold">
              <span>Total Amount:</span>
              <span className="text-blue-600">{formatCurrency(data.invoice.amount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Terms */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Payment Information</h3>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p>
            <strong>Payment Terms:</strong> Net {data.invoice.payment_terms} days
          </p>
          <p>
            <strong>Due Date:</strong> {formatDate(data.invoice.due_date)}
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Please include the invoice number ({data.invoice.invoice_number}) when making payment. Late payments may
            incur additional charges.
          </p>
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
            <p>Thank you for your business!</p>
            <p>This is a computer-generated invoice and does not require a signature.</p>
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

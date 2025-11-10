interface StatementData {
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
  statement: {
    statement_number: string
    statement_date: string
    period_start: string
    period_end: string
    opening_balance: number
    closing_balance: number
  }
  transactions: Array<{
    date: string
    description: string
    reference: string
    debit: number
    credit: number
    balance: number
  }>
}

interface StatementTemplateProps {
  data: StatementData
}

export function StatementTemplate({ data }: StatementTemplateProps) {
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

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 text-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-blue-600 mb-2">{data.company.company_name}</h1>
          <div className="text-gray-600 space-y-1">
            <p>{data.company.address}</p>
            <p>Phone: {data.company.phone}</p>
            <p>Email: {data.company.email}</p>
            {data.company.website && <p>Website: {data.company.website}</p>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-800 mb-2">ACCOUNT STATEMENT</h2>
          <div className="text-gray-600 space-y-1">
            <p>
              <strong>Statement #:</strong> {data.statement.statement_number}
            </p>
            <p>
              <strong>Date:</strong> {formatDate(data.statement.statement_date)}
            </p>
            <p>
              <strong>Tax ID:</strong> {data.company.tax_number}
            </p>
            <p>
              <strong>Reg #:</strong> {data.company.registration_number}
            </p>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Account Holder Information</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>
                <strong>Name:</strong>{" "}
                {data.customer.business_name || `${data.customer.first_name} ${data.customer.last_name}`}
              </p>
              <p>
                <strong>Account #:</strong> {data.customer.account_number}
              </p>
              <p>
                <strong>Email:</strong> {data.customer.email}
              </p>
            </div>
            <div>
              <p>
                <strong>Phone:</strong> {data.customer.phone}
              </p>
              <p>
                <strong>Address:</strong> {data.customer.address}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statement Period */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Statement Period</h3>
        <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg">
          <div>
            <p>
              <strong>From:</strong> {formatDate(data.statement.period_start)}
            </p>
            <p>
              <strong>To:</strong> {formatDate(data.statement.period_end)}
            </p>
          </div>
          <div className="text-right">
            <p>
              <strong>Opening Balance:</strong> {formatCurrency(data.statement.opening_balance)}
            </p>
            <p>
              <strong>Closing Balance:</strong>{" "}
              <span
                className={data.statement.closing_balance < 0 ? "text-red-600 font-bold" : "text-green-600 font-bold"}
              >
                {formatCurrency(data.statement.closing_balance)}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Transaction History</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">Date</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Description</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Reference</th>
                <th className="border border-gray-300 px-3 py-2 text-right">Debit</th>
                <th className="border border-gray-300 px-3 py-2 text-right">Credit</th>
                <th className="border border-gray-300 px-3 py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((transaction, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-300 px-3 py-2">{formatDate(transaction.date)}</td>
                  <td className="border border-gray-300 px-3 py-2">{transaction.description}</td>
                  <td className="border border-gray-300 px-3 py-2">{transaction.reference}</td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {transaction.debit > 0 ? formatCurrency(transaction.debit) : "-"}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {transaction.credit > 0 ? formatCurrency(transaction.credit) : "-"}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                    <span className={transaction.balance < 0 ? "text-red-600" : "text-green-600"}>
                      {formatCurrency(transaction.balance)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-8">
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-gray-600">Total Debits</p>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(data.transactions.reduce((sum, t) => sum + t.debit, 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Total Credits</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(data.transactions.reduce((sum, t) => sum + t.credit, 0))}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Current Balance</p>
              <p
                className={`text-lg font-bold ${data.statement.closing_balance < 0 ? "text-red-600" : "text-green-600"}`}
              >
                {formatCurrency(data.statement.closing_balance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-4 text-xs text-gray-500">
        <div className="flex justify-between">
          <div>
            <p>This is a computer-generated statement and does not require a signature.</p>
            <p>
              For inquiries, please contact us at {data.company.email} or {data.company.phone}
            </p>
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

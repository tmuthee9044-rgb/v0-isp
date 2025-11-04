export function generateStatementHTML(data: any): string {
  const { customer, company, statement, transactions } = data

  return `
    <div class="max-w-4xl mx-auto p-8 bg-white">
      <!-- Header -->
      <div class="flex justify-between items-start mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">${company.company_name}</h1>
          <div class="text-gray-600 mt-2">
            <p>${company.address}</p>
            <p>Phone: ${company.phone} | Email: ${company.email}</p>
            <p>Tax Number: ${company.tax_number}</p>
          </div>
        </div>
        <div class="text-right">
          <h2 class="text-2xl font-bold text-blue-600">STATEMENT</h2>
          <p class="text-gray-600">Statement #: ${statement.statement_number}</p>
          <p class="text-gray-600">Date: ${new Date(statement.statement_date).toLocaleDateString()}</p>
        </div>
      </div>

      <!-- Customer Info -->
      <div class="mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 class="font-semibold text-gray-900 mb-2">Statement For:</h3>
        <div class="text-gray-700">
          <p class="font-medium">${customer.business_name || `${customer.first_name} ${customer.last_name}`}</p>
          <p>${customer.address}</p>
          <p>Email: ${customer.email} | Phone: ${customer.phone}</p>
          <p>Account: ${customer.account_number}</p>
        </div>
      </div>

      <!-- Statement Period -->
      <div class="mb-6 flex justify-between items-center">
        <div>
          <p class="text-gray-600">Statement Period: ${new Date(statement.period_start).toLocaleDateString()} - ${new Date(statement.period_end).toLocaleDateString()}</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-semibold">Current Balance: <span class="text-blue-600">$${Number(statement.closing_balance).toFixed(2)}</span></p>
        </div>
      </div>

      <!-- Transactions Table -->
      <div class="mb-8">
        <table class="w-full border-collapse border border-gray-300">
          <thead>
            <tr class="bg-gray-100">
              <th class="border border-gray-300 px-4 py-2 text-left">Date</th>
              <th class="border border-gray-300 px-4 py-2 text-left">Description</th>
              <th class="border border-gray-300 px-4 py-2 text-left">Reference</th>
              <th class="border border-gray-300 px-4 py-2 text-right">Debit</th>
              <th class="border border-gray-300 px-4 py-2 text-right">Credit</th>
              <th class="border border-gray-300 px-4 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-gray-300 px-4 py-2">${new Date(statement.period_start).toLocaleDateString()}</td>
              <td class="border border-gray-300 px-4 py-2 font-medium">Opening Balance</td>
              <td class="border border-gray-300 px-4 py-2">-</td>
              <td class="border border-gray-300 px-4 py-2 text-right">-</td>
              <td class="border border-gray-300 px-4 py-2 text-right">-</td>
              <td class="border border-gray-300 px-4 py-2 text-right font-medium">$${Number(statement.opening_balance).toFixed(2)}</td>
            </tr>
            ${transactions
              .map(
                (transaction: any) => `
              <tr>
                <td class="border border-gray-300 px-4 py-2">${new Date(transaction.date).toLocaleDateString()}</td>
                <td class="border border-gray-300 px-4 py-2">${transaction.description}</td>
                <td class="border border-gray-300 px-4 py-2">${transaction.reference}</td>
                <td class="border border-gray-300 px-4 py-2 text-right">${transaction.debit > 0 ? `$${transaction.debit.toFixed(2)}` : "-"}</td>
                <td class="border border-gray-300 px-4 py-2 text-right">${transaction.credit > 0 ? `$${transaction.credit.toFixed(2)}` : "-"}</td>
                <td class="border border-gray-300 px-4 py-2 text-right">$${transaction.balance.toFixed(2)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div class="text-center text-gray-500 text-sm mt-8">
        <p>This statement was generated on ${new Date().toLocaleDateString()}</p>
        <p>For questions about this statement, please contact us at ${company.email}</p>
      </div>
    </div>
  `
}

export function generateInvoiceHTML(data: any): string {
  const { customer, company, invoice, items } = data

  return `
    <div class="max-w-4xl mx-auto p-8 bg-white">
      <!-- Header -->
      <div class="flex justify-between items-start mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">${company.company_name}</h1>
          <div class="text-gray-600 mt-2">
            <p>${company.address}</p>
            <p>Phone: ${company.phone} | Email: ${company.email}</p>
            <p>Tax Number: ${company.tax_number}</p>
          </div>
        </div>
        <div class="text-right">
          <h2 class="text-2xl font-bold text-blue-600">INVOICE</h2>
          <p class="text-gray-600">Invoice #: ${invoice.invoice_number}</p>
          <p class="text-gray-600">Date: ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
          <p class="text-gray-600">Due Date: ${new Date(invoice.due_date).toLocaleDateString()}</p>
        </div>
      </div>

      <!-- Customer Info -->
      <div class="mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 class="font-semibold text-gray-900 mb-2">Bill To:</h3>
        <div class="text-gray-700">
          <p class="font-medium">${customer.business_name || `${customer.first_name} ${customer.last_name}`}</p>
          <p>${customer.address}</p>
          <p>Email: ${customer.email} | Phone: ${customer.phone}</p>
          <p>Account: ${customer.account_number}</p>
        </div>
      </div>

      <!-- Items Table -->
      <div class="mb-8">
        <table class="w-full border-collapse border border-gray-300">
          <thead>
            <tr class="bg-gray-100">
              <th class="border border-gray-300 px-4 py-2 text-left">Description</th>
              <th class="border border-gray-300 px-4 py-2 text-center">Quantity</th>
              <th class="border border-gray-300 px-4 py-2 text-right">Unit Price</th>
              <th class="border border-gray-300 px-4 py-2 text-right">Tax Rate</th>
              <th class="border border-gray-300 px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item: any) => `
              <tr>
                <td class="border border-gray-300 px-4 py-2">${item.description}</td>
                <td class="border border-gray-300 px-4 py-2 text-center">${item.quantity}</td>
                <td class="border border-gray-300 px-4 py-2 text-right">$${item.unit_price.toFixed(2)}</td>
                <td class="border border-gray-300 px-4 py-2 text-right">${item.tax_rate}%</td>
                <td class="border border-gray-300 px-4 py-2 text-right">$${item.total_amount.toFixed(2)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div class="flex justify-end mb-8">
        <div class="w-64">
          <div class="flex justify-between py-2">
            <span class="text-gray-600">Subtotal:</span>
            <span>$${invoice.subtotal.toFixed(2)}</span>
          </div>
          ${
            invoice.discount_amount > 0
              ? `
            <div class="flex justify-between py-2">
              <span class="text-gray-600">Discount:</span>
              <span>-$${invoice.discount_amount.toFixed(2)}</span>
            </div>
          `
              : ""
          }
          <div class="flex justify-between py-2">
            <span class="text-gray-600">Tax:</span>
            <span>$${invoice.tax_amount.toFixed(2)}</span>
          </div>
          <div class="flex justify-between py-2 border-t border-gray-300 font-bold text-lg">
            <span>Total:</span>
            <span class="text-blue-600">$${invoice.amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- Payment Terms -->
      <div class="text-gray-600 text-sm">
        <p>Payment Terms: Net ${invoice.payment_terms} days</p>
        ${
          invoice.service_period_start && invoice.service_period_end
            ? `
          <p>Service Period: ${new Date(invoice.service_period_start).toLocaleDateString()} - ${new Date(invoice.service_period_end).toLocaleDateString()}</p>
        `
            : ""
        }
      </div>

      <!-- Footer -->
      <div class="text-center text-gray-500 text-sm mt-8">
        <p>Thank you for your business!</p>
        <p>For questions about this invoice, please contact us at ${company.email}</p>
      </div>
    </div>
  `
}

export function generateCreditNoteHTML(data: any): string {
  const { customer, company, creditNote, items } = data

  return `
    <div class="max-w-4xl mx-auto p-8 bg-white">
      <!-- Header -->
      <div class="flex justify-between items-start mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">${company.company_name}</h1>
          <div class="text-gray-600 mt-2">
            <p>${company.address}</p>
            <p>Phone: ${company.phone} | Email: ${company.email}</p>
            <p>Tax Number: ${company.tax_number}</p>
          </div>
        </div>
        <div class="text-right">
          <h2 class="text-2xl font-bold text-red-600">CREDIT NOTE</h2>
          <p class="text-gray-600">Credit Note #: ${creditNote.credit_note_number}</p>
          <p class="text-gray-600">Date: ${new Date(creditNote.credit_note_date).toLocaleDateString()}</p>
          <p class="text-gray-600">Original Invoice: ${creditNote.original_invoice_number}</p>
        </div>
      </div>

      <!-- Customer Info -->
      <div class="mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 class="font-semibold text-gray-900 mb-2">Credit To:</h3>
        <div class="text-gray-700">
          <p class="font-medium">${customer.business_name || `${customer.first_name} ${customer.last_name}`}</p>
          <p>${customer.address}</p>
          <p>Email: ${customer.email} | Phone: ${customer.phone}</p>
          <p>Account: ${customer.account_number}</p>
        </div>
      </div>

      <!-- Reason -->
      <div class="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400">
        <h3 class="font-semibold text-gray-900 mb-2">Reason for Credit:</h3>
        <p class="text-gray-700">${creditNote.reason}</p>
      </div>

      <!-- Items Table -->
      <div class="mb-8">
        <table class="w-full border-collapse border border-gray-300">
          <thead>
            <tr class="bg-gray-100">
              <th class="border border-gray-300 px-4 py-2 text-left">Description</th>
              <th class="border border-gray-300 px-4 py-2 text-center">Quantity</th>
              <th class="border border-gray-300 px-4 py-2 text-right">Unit Price</th>
              <th class="border border-gray-300 px-4 py-2 text-right">Tax Rate</th>
              <th class="border border-gray-300 px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item: any) => `
              <tr>
                <td class="border border-gray-300 px-4 py-2">${item.description}</td>
                <td class="border border-gray-300 px-4 py-2 text-center">${item.quantity}</td>
                <td class="border border-gray-300 px-4 py-2 text-right">$${item.unit_price.toFixed(2)}</td>
                <td class="border border-gray-300 px-4 py-2 text-right">${item.tax_rate}%</td>
                <td class="border border-gray-300 px-4 py-2 text-right">$${item.total_amount.toFixed(2)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div class="flex justify-end mb-8">
        <div class="w-64">
          <div class="flex justify-between py-2">
            <span class="text-gray-600">Subtotal:</span>
            <span>$${creditNote.subtotal.toFixed(2)}</span>
          </div>
          <div class="flex justify-between py-2">
            <span class="text-gray-600">Tax:</span>
            <span>$${creditNote.tax_amount.toFixed(2)}</span>
          </div>
          <div class="flex justify-between py-2 border-t border-gray-300 font-bold text-lg">
            <span>Credit Amount:</span>
            <span class="text-red-600">$${creditNote.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center text-gray-500 text-sm mt-8">
        <p>This credit note was issued on ${new Date().toLocaleDateString()}</p>
        <p>For questions about this credit note, please contact us at ${company.email}</p>
      </div>
    </div>
  `
}

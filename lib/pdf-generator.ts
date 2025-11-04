import jsPDF from "jspdf"
import "jspdf-autotable"
import { neon } from "@neondatabase/serverless"

interface CompanySettings {
  company_name?: string
  company_trading_name?: string
  company_registration_number?: string
  company_tax_number?: string
  primary_phone?: string
  primary_email?: string
  website?: string
  street_address?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  branding_primary_color?: string
  branding_secondary_color?: string
  currency?: string
}

interface InvoiceData {
  id: string
  invoice_number: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  customer_address?: string
  issue_date: string
  due_date: string
  items: Array<{
    description: string
    quantity: number
    unit_price: number
    total: number
  }>
  subtotal: number
  tax_amount: number
  total_amount: number
  status: string
}

interface StatementData {
  customer_name: string
  customer_id: string
  statement_period: string
  opening_balance: number
  closing_balance: number
  transactions: Array<{
    date: string
    description: string
    debit: number
    credit: number
    balance: number
  }>
}

interface CreditNoteData {
  credit_note_number: string
  issue_date: string
  customer_name: string
  invoice_number?: string
  amount: number
  reason?: string
}

export class PDFGenerator {
  private doc: jsPDF
  private companySettings: CompanySettings

  constructor(companySettings: CompanySettings) {
    this.doc = new jsPDF()
    this.companySettings = companySettings
  }

  private addLetterhead() {
    const primaryColor = this.companySettings.branding_primary_color || "#2563eb"
    const secondaryColor = this.companySettings.branding_secondary_color || "#4b5563"

    // Header background
    this.doc.setFillColor(primaryColor)
    this.doc.rect(0, 0, 210, 40, "F")

    // Company name
    this.doc.setTextColor(255, 255, 255)
    this.doc.setFontSize(24)
    this.doc.setFont("helvetica", "bold")
    this.doc.text(this.companySettings.company_name || "ISP Company", 20, 25)

    // Trading name
    if (this.companySettings.company_trading_name) {
      this.doc.setFontSize(12)
      this.doc.setFont("helvetica", "normal")
      this.doc.text(`Trading as: ${this.companySettings.company_trading_name}`, 20, 32)
    }

    // Contact information on the right
    this.doc.setFontSize(10)
    this.doc.setFont("helvetica", "normal")
    let yPos = 15

    if (this.companySettings.primary_phone) {
      this.doc.text(`Tel: ${this.companySettings.primary_phone}`, 140, yPos)
      yPos += 5
    }

    if (this.companySettings.primary_email) {
      this.doc.text(`Email: ${this.companySettings.primary_email}`, 140, yPos)
      yPos += 5
    }

    if (this.companySettings.website) {
      this.doc.text(`Web: ${this.companySettings.website}`, 140, yPos)
      yPos += 5
    }

    // Address
    if (this.companySettings.street_address) {
      const address = [
        this.companySettings.street_address,
        this.companySettings.city,
        this.companySettings.state,
        this.companySettings.postal_code,
        this.companySettings.country,
      ]
        .filter(Boolean)
        .join(", ")

      this.doc.text(`Address: ${address}`, 140, yPos)
    }

    // Registration details
    this.doc.setTextColor(100, 100, 100)
    this.doc.setFontSize(8)
    let regYPos = 280

    if (this.companySettings.company_registration_number) {
      this.doc.text(`Registration No: ${this.companySettings.company_registration_number}`, 20, regYPos)
      regYPos += 4
    }

    if (this.companySettings.company_tax_number) {
      this.doc.text(`Tax ID: ${this.companySettings.company_tax_number}`, 20, regYPos)
    }

    // Reset text color
    this.doc.setTextColor(0, 0, 0)
  }

  generateInvoice(invoiceData: InvoiceData): Uint8Array {
    this.addLetterhead()

    // Invoice title and details
    this.doc.setFontSize(20)
    this.doc.setFont("helvetica", "bold")
    this.doc.setTextColor(this.companySettings.branding_primary_color || "#2563eb")
    this.doc.text("INVOICE", 20, 60)

    // Invoice details
    this.doc.setFontSize(12)
    this.doc.setTextColor(0, 0, 0)
    this.doc.setFont("helvetica", "normal")

    this.doc.text(`Invoice #: ${invoiceData.invoice_number}`, 20, 75)
    this.doc.text(`Issue Date: ${new Date(invoiceData.issue_date).toLocaleDateString()}`, 20, 85)
    this.doc.text(`Due Date: ${new Date(invoiceData.due_date).toLocaleDateString()}`, 20, 95)

    // Customer details
    this.doc.setFont("helvetica", "bold")
    this.doc.text("Bill To:", 120, 75)
    this.doc.setFont("helvetica", "normal")
    this.doc.text(invoiceData.customer_name, 120, 85)

    if (invoiceData.customer_email) {
      this.doc.text(invoiceData.customer_email, 120, 95)
    }

    if (invoiceData.customer_phone) {
      this.doc.text(invoiceData.customer_phone, 120, 105)
    }

    // Items table
    const tableData = invoiceData.items.map((item) => [
      item.description,
      item.quantity.toString(),
      `${this.companySettings.currency || "KES"} ${item.unit_price.toFixed(2)}`,
      `${this.companySettings.currency || "KES"} ${item.total.toFixed(2)}`,
    ])
    ;(this.doc as any).autoTable({
      startY: 120,
      head: [["Description", "Qty", "Unit Price", "Total"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: this.companySettings.branding_primary_color || "#2563eb",
        textColor: 255,
      },
      styles: {
        fontSize: 10,
      },
    })

    // Totals
    const finalY = (this.doc as any).lastAutoTable.finalY + 20
    const currency = this.companySettings.currency || "KES"

    this.doc.text(`Subtotal: ${currency} ${invoiceData.subtotal.toFixed(2)}`, 140, finalY)
    this.doc.text(`Tax: ${currency} ${invoiceData.tax_amount.toFixed(2)}`, 140, finalY + 10)

    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(14)
    this.doc.text(`Total: ${currency} ${invoiceData.total_amount.toFixed(2)}`, 140, finalY + 25)

    return this.doc.output("arraybuffer") as Uint8Array
  }

  generateStatement(statementData: StatementData): Uint8Array {
    this.addLetterhead()

    // Statement title
    this.doc.setFontSize(20)
    this.doc.setFont("helvetica", "bold")
    this.doc.setTextColor(this.companySettings.branding_primary_color || "#2563eb")
    this.doc.text("ACCOUNT STATEMENT", 20, 60)

    // Statement details
    this.doc.setFontSize(12)
    this.doc.setTextColor(0, 0, 0)
    this.doc.setFont("helvetica", "normal")

    this.doc.text(`Customer: ${statementData.customer_name}`, 20, 75)
    this.doc.text(`Customer ID: ${statementData.customer_id}`, 20, 85)
    this.doc.text(`Period: ${statementData.statement_period}`, 20, 95)

    // Balance summary
    const currency = this.companySettings.currency || "KES"
    this.doc.text(`Opening Balance: ${currency} ${statementData.opening_balance.toFixed(2)}`, 120, 75)
    this.doc.text(`Closing Balance: ${currency} ${statementData.closing_balance.toFixed(2)}`, 120, 85)

    // Transactions table
    const tableData = statementData.transactions.map((txn) => [
      new Date(txn.date).toLocaleDateString(),
      txn.description,
      txn.debit > 0 ? `${currency} ${txn.debit.toFixed(2)}` : "",
      txn.credit > 0 ? `${currency} ${txn.credit.toFixed(2)}` : "",
      `${currency} ${txn.balance.toFixed(2)}`,
    ])
    ;(this.doc as any).autoTable({
      startY: 110,
      head: [["Date", "Description", "Debit", "Credit", "Balance"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: this.companySettings.branding_primary_color || "#2563eb",
        textColor: 255,
      },
      styles: {
        fontSize: 9,
      },
    })

    return this.doc.output("arraybuffer") as Uint8Array
  }

  generateReceipt(paymentData: any): Uint8Array {
    this.addLetterhead()

    // Receipt title
    this.doc.setFontSize(20)
    this.doc.setFont("helvetica", "bold")
    this.doc.setTextColor(this.companySettings.branding_primary_color || "#2563eb")
    this.doc.text("PAYMENT RECEIPT", 20, 60)

    // Receipt details
    this.doc.setFontSize(12)
    this.doc.setTextColor(0, 0, 0)
    this.doc.setFont("helvetica", "normal")

    const currency = this.companySettings.currency || "KES"

    this.doc.text(`Receipt #: ${paymentData.reference_number}`, 20, 75)
    this.doc.text(`Date: ${new Date(paymentData.payment_date).toLocaleDateString()}`, 20, 85)
    this.doc.text(`Customer: ${paymentData.customer_name}`, 20, 95)
    this.doc.text(`Amount: ${currency} ${paymentData.amount.toFixed(2)}`, 20, 105)
    this.doc.text(`Payment Method: ${paymentData.payment_method.toUpperCase()}`, 20, 115)

    if (paymentData.description) {
      this.doc.text(`Description: ${paymentData.description}`, 20, 125)
    }

    // Thank you message
    this.doc.setFontSize(14)
    this.doc.setFont("helvetica", "bold")
    this.doc.text("Thank you for your payment!", 20, 150)

    return this.doc.output("arraybuffer") as Uint8Array
  }

  generateCreditNote(creditNoteData: CreditNoteData): Uint8Array {
    this.addLetterhead()

    // Credit Note title
    this.doc.setFontSize(20)
    this.doc.setFont("helvetica", "bold")
    this.doc.setTextColor(this.companySettings.branding_primary_color || "#2563eb")
    this.doc.text("CREDIT NOTE", 20, 60)

    // Credit Note details
    this.doc.setFontSize(12)
    this.doc.setTextColor(0, 0, 0)
    this.doc.setFont("helvetica", "normal")

    const currency = this.companySettings.currency || "KES"

    this.doc.text(`Credit Note #: ${creditNoteData.credit_note_number}`, 20, 75)
    this.doc.text(`Issue Date: ${new Date(creditNoteData.issue_date).toLocaleDateString()}`, 20, 85)
    this.doc.text(`Customer: ${creditNoteData.customer_name}`, 20, 95)

    if (creditNoteData.invoice_number) {
      this.doc.text(`Related Invoice: ${creditNoteData.invoice_number}`, 20, 105)
    }

    // Credit amount
    this.doc.setFontSize(16)
    this.doc.setFont("helvetica", "bold")
    this.doc.text(`Credit Amount: ${currency} ${creditNoteData.amount.toFixed(2)}`, 20, 125)

    // Reason
    this.doc.setFontSize(12)
    this.doc.setFont("helvetica", "normal")
    if (creditNoteData.reason) {
      this.doc.text("Reason:", 20, 145)
      const splitReason = this.doc.splitTextToSize(creditNoteData.reason, 170)
      this.doc.text(splitReason, 20, 155)
    }

    return this.doc.output("arraybuffer") as Uint8Array
  }

  static async generateStatementPDF(customerId: number, fromDate: string, toDate: string): Promise<string> {
    try {
      const companySettings = await getCompanySettings()
      const generator = new PDFGenerator(companySettings)

      const sql = neon(process.env.DATABASE_URL!)

      const customerResult = await sql`
        SELECT name, email, phone, address 
        FROM customers 
        WHERE id = ${customerId}
      `
      const customer = customerResult[0] || { name: `Customer ${customerId}` }

      const transactionsResult = await sql`
        SELECT 
          created_at as date,
          description,
          CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END as debit,
          CASE WHEN amount > 0 THEN amount ELSE 0 END as credit,
          0 as balance
        FROM payments 
        WHERE customer_id = ${customerId}
          AND created_at >= ${fromDate}::date
          AND created_at <= ${toDate}::date
        ORDER BY created_at ASC
      `

      let runningBalance = 0
      const transactions = transactionsResult.map((txn) => {
        runningBalance += (txn.credit as number) - (txn.debit as number)
        return {
          ...txn,
          balance: runningBalance,
          date: txn.date.toISOString(),
          debit: txn.debit as number,
          credit: txn.credit as number,
        }
      })

      const statementData: StatementData = {
        customer_name: customer.name || `Customer ${customerId}`,
        customer_id: customerId.toString(),
        statement_period: `${new Date(fromDate).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()}`,
        opening_balance: 0,
        closing_balance: runningBalance,
        transactions: transactions,
      }

      const pdfBuffer = generator.generateStatement(statementData)
      return Buffer.from(pdfBuffer).toString("base64")
    } catch (error) {
      console.error("Error generating statement PDF:", error)
      throw new Error("Failed to generate statement PDF")
    }
  }

  static async generateInvoicePDF(invoiceId: string): Promise<Uint8Array> {
    try {
      const companySettings = await getCompanySettings()
      const generator = new PDFGenerator(companySettings)

      const sql = neon(process.env.DATABASE_URL!)
      const invoiceResult = await sql`
        SELECT 
          i.*,
          c.name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone,
          c.address as customer_address
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        WHERE i.id = ${invoiceId}
      `

      if (invoiceResult.length === 0) {
        throw new Error("Invoice not found")
      }

      const invoice = invoiceResult[0]
      const invoiceData: InvoiceData = {
        id: invoice.id,
        invoice_number: invoice.invoice_number || `INV-${invoice.id}`,
        customer_name: invoice.customer_name,
        customer_email: invoice.customer_email,
        customer_phone: invoice.customer_phone,
        customer_address: invoice.customer_address,
        issue_date: invoice.created_at.toISOString(),
        due_date: invoice.due_date?.toISOString() || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          {
            description: invoice.description || "Service charges",
            quantity: 1,
            unit_price: invoice.amount,
            total: invoice.amount,
          },
        ],
        subtotal: invoice.amount,
        tax_amount: 0,
        total_amount: invoice.amount,
        status: invoice.status || "pending",
      }

      return generator.generateInvoice(invoiceData)
    } catch (error) {
      console.error("Error generating invoice PDF:", error)
      throw new Error("Failed to generate invoice PDF")
    }
  }

  static async generateReceiptPDF(paymentId: string): Promise<Uint8Array> {
    try {
      const companySettings = await getCompanySettings()
      const generator = new PDFGenerator(companySettings)

      const sql = neon(process.env.DATABASE_URL!)
      const paymentResult = await sql`
        SELECT 
          p.*,
          c.name as customer_name
        FROM payments p
        JOIN customers c ON p.customer_id = c.id
        WHERE p.id = ${paymentId}
      `

      if (paymentResult.length === 0) {
        throw new Error("Payment not found")
      }

      const payment = paymentResult[0]
      const paymentData = {
        reference_number: payment.reference_number || `PAY-${payment.id}`,
        payment_date: payment.created_at.toISOString(),
        customer_name: payment.customer_name,
        amount: payment.amount,
        payment_method: payment.payment_method || "cash",
        description: payment.description,
      }

      return generator.generateReceipt(paymentData)
    } catch (error) {
      console.error("Error generating receipt PDF:", error)
      throw new Error("Failed to generate receipt PDF")
    }
  }

  static async generateCreditNotePDF(creditNoteId: string): Promise<Uint8Array> {
    try {
      const companySettings = await getCompanySettings()
      const generator = new PDFGenerator(companySettings)

      const sql = neon(process.env.DATABASE_URL!)
      const creditNoteResult = await sql`
        SELECT 
          cn.*,
          c.name as customer_name,
          i.invoice_number
        FROM credit_notes cn
        JOIN customers c ON cn.customer_id = c.id
        LEFT JOIN invoices i ON cn.invoice_id = i.id
        WHERE cn.id = ${creditNoteId}
      `

      if (creditNoteResult.length === 0) {
        throw new Error("Credit note not found")
      }

      const creditNote = creditNoteResult[0]
      const creditNoteData = {
        credit_note_number: creditNote.credit_note_number || `CN-${creditNote.id}`,
        issue_date: creditNote.created_at.toISOString(),
        customer_name: creditNote.customer_name,
        invoice_number: creditNote.invoice_number,
        amount: creditNote.amount,
        reason: creditNote.reason || creditNote.description,
      }

      return generator.generateCreditNote(creditNoteData)
    } catch (error) {
      console.error("Error generating credit note PDF:", error)
      throw new Error("Failed to generate credit note PDF")
    }
  }
}

export async function getCompanySettings(): Promise<CompanySettings> {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const result = await sql`
      SELECT 
        company_name,
        company_trading_name,
        company_registration_number,
        company_tax_number,
        primary_phone,
        primary_email,
        website,
        street_address,
        city,
        state,
        postal_code,
        country,
        branding_primary_color,
        branding_secondary_color,
        currency
      FROM system_config 
      LIMIT 1
    `

    if (result.length > 0) {
      return result[0] as CompanySettings
    }
  } catch (error) {
    console.error("Error fetching company settings from database:", error)
  }

  return {
    company_name: "ISP Company",
    primary_phone: "+254 700 000 000",
    primary_email: "info@isp.com",
    currency: "KES",
  }
}

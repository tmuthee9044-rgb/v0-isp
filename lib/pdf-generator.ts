import { getSql } from "./db"

export async function generateInvoicePDF(invoiceId: number) {
  const sql = await getSql()
}

export async function generateReceiptPDF(paymentId: number) {
  const sql = await getSql()
}

export async function generateStatementPDF(customerId: number, startDate: string, endDate: string) {
  const sql = await getSql()
}

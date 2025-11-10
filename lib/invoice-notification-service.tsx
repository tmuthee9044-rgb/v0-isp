import { getSql } from "./db"

export async function sendInvoiceNotification(invoiceId: number) {
  try {
    const sql = await getSql()
  } catch (error) {
    console.error("Error sending invoice notification:", error)
    throw error
  }
}

export async function sendPaymentReminder(invoiceId: number) {
  try {
    const sql = await getSql()
  } catch (error) {
    console.error("Error sending payment reminder:", error)
    throw error
  }
}

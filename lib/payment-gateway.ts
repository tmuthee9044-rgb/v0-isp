import { getSql } from "./db"

export async function processPayment(paymentData: any) {
  const sql = await getSql()
}

export async function verifyPayment(transactionId: string) {
  const sql = await getSql()
}

export async function refundPayment(paymentId: number) {
  const sql = await getSql()
}

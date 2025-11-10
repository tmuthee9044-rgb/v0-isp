import { getSql } from "./db"

export async function generateFinancialReport(
  reportType: string,
  startDate: string,
  endDate: string,
  customerId?: number,
) {
  const sql = await getSql()
}

export async function getRevenueData(startDate: string, endDate: string) {
  const sql = await getSql()
}

export async function getExpenseData(startDate: string, endDate: string) {
  const sql = await getSql()
}

export async function getProfitLossData(startDate: string, endDate: string) {
  const sql = await getSql()
}

export async function getCashFlowData(startDate: string, endDate: string) {
  const sql = await getSql()
}

export async function getBalanceSheetData(date: string) {
  const sql = await getSql()
}

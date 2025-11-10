import { type NextRequest, NextResponse } from "next/server"
import { financialReporting } from "@/lib/financial-reporting"

export async function POST(request: NextRequest) {
  try {
    const { reportType, startDate, endDate, asOfDate } = await request.json()

    if (!reportType) {
      return NextResponse.json({ success: false, error: "Report type is required" }, { status: 400 })
    }

    let reportData

    switch (reportType) {
      case "comprehensive":
        if (!startDate || !endDate) {
          return NextResponse.json(
            { success: false, error: "Start date and end date are required for comprehensive report" },
            { status: 400 },
          )
        }
        reportData = await financialReporting.generateComprehensiveReport(new Date(startDate), new Date(endDate))
        break
      case "profit_loss":
        if (!startDate || !endDate) {
          return NextResponse.json(
            { success: false, error: "Start date and end date are required for profit & loss report" },
            { status: 400 },
          )
        }
        reportData = await financialReporting.generateProfitLossStatement(new Date(startDate), new Date(endDate))
        break
      case "cash_flow":
        if (!startDate || !endDate) {
          return NextResponse.json(
            { success: false, error: "Start date and end date are required for cash flow report" },
            { status: 400 },
          )
        }
        reportData = await financialReporting.generateCashFlowStatement(new Date(startDate), new Date(endDate))
        break
      case "balance_sheet":
        const balanceSheetDate = asOfDate ? new Date(asOfDate) : new Date()
        reportData = await financialReporting.generateBalanceSheet(balanceSheetDate)
        break
      case "trial_balance":
        const trialBalanceDate = asOfDate ? new Date(asOfDate) : new Date()
        reportData = await financialReporting.generateTrialBalance(trialBalanceDate)
        break
      case "customer_aging":
        const agingDate = asOfDate ? new Date(asOfDate) : new Date()
        reportData = await financialReporting.generateCustomerAgingReport(agingDate)
        break
      default:
        return NextResponse.json({ success: false, error: "Invalid report type" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: reportData,
    })
  } catch (error) {
    console.error("Financial reporting error:", error)
    return NextResponse.json({ success: false, error: "Failed to generate financial report" }, { status: 500 })
  }
}

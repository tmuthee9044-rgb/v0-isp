import { type NextRequest, NextResponse } from "next/server"
import { financialReporting } from "@/lib/financial-reporting"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import "jspdf-autotable"

export async function POST(request: NextRequest) {
  try {
    const { reportType, startDate, endDate, asOfDate, exportFormat = "pdf" } = await request.json()

    if (!reportType) {
      return NextResponse.json({ error: "Report type is required" }, { status: 400 })
    }

    // Generate report data
    let reportData: any
    switch (reportType) {
      case "comprehensive":
        if (!startDate || !endDate) {
          return NextResponse.json({ error: "Start date and end date are required" }, { status: 400 })
        }
        reportData = await financialReporting.generateComprehensiveReport(new Date(startDate), new Date(endDate))
        break
      case "profit_loss":
        if (!startDate || !endDate) {
          return NextResponse.json({ error: "Start date and end date are required" }, { status: 400 })
        }
        reportData = await financialReporting.generateProfitLossStatement(new Date(startDate), new Date(endDate))
        break
      case "cash_flow":
        if (!startDate || !endDate) {
          return NextResponse.json({ error: "Start date and end date are required" }, { status: 400 })
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
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }

    // Generate export based on format
    switch (exportFormat) {
      case "pdf":
        return generateFinancialReportPDF(
          reportData,
          reportType,
          new Date(startDate || asOfDate),
          new Date(endDate || asOfDate),
        )
      case "excel":
        return generateFinancialReportExcel(
          reportData,
          reportType,
          new Date(startDate || asOfDate),
          new Date(endDate || asOfDate),
        )
      case "json":
        return NextResponse.json({
          success: true,
          data: reportData,
          metadata: {
            reportType,
            period:
              startDate && endDate
                ? `${new Date(startDate).toISOString().split("T")[0]} to ${new Date(endDate).toISOString().split("T")[0]}`
                : `As of ${new Date(asOfDate || new Date()).toISOString().split("T")[0]}`,
            generatedAt: new Date().toISOString(),
          },
        })
      default:
        return NextResponse.json({ error: "Invalid export format" }, { status: 400 })
    }
  } catch (error) {
    console.error("Financial report export error:", error)
    return NextResponse.json({ error: "Failed to generate financial report" }, { status: 500 })
  }
}

function generateFinancialReportPDF(data: any, reportType: string, startDate: Date, endDate: Date) {
  const doc = new jsPDF()
  const fileName = `financial-report-${reportType}-${Date.now()}.pdf`

  addLetterhead(doc)

  let yPosition = 80 // Start content after letterhead

  // Report Title and Period
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text(`${reportType.replace("_", " ").toUpperCase()} REPORT`, 105, yPosition, { align: "center" })

  yPosition += 12
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  if (reportType.includes("balance_sheet") || reportType.includes("trial_balance") || reportType.includes("aging")) {
    doc.text(`As of: ${endDate.toLocaleDateString()}`, 105, yPosition, { align: "center" })
  } else {
    doc.text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 105, yPosition, {
      align: "center",
    })
  }

  yPosition += 6
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 105, yPosition, { align: "center" })
  doc.setTextColor(0, 0, 0)

  yPosition += 15

  if (reportType === "balance_sheet") {
    // Assets Section
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("ASSETS", 20, yPosition)
    yPosition += 10

    const assetsData = [
      ["Current Assets", ""],
      ["Cash and Equivalents", `KES ${Number(data.assets.current_assets.cash_and_equivalents).toLocaleString()}`],
      ["Accounts Receivable", `KES ${Number(data.assets.current_assets.accounts_receivable).toLocaleString()}`],
      ["Inventory", `KES ${Number(data.assets.current_assets.inventory).toLocaleString()}`],
      ["Prepaid Expenses", `KES ${Number(data.assets.current_assets.prepaid_expenses).toLocaleString()}`],
      ["Total Current Assets", `KES ${Number(data.assets.current_assets.total_current_assets).toLocaleString()}`],
      ["", ""],
      ["Non-Current Assets", ""],
      ["Equipment", `KES ${Number(data.assets.non_current_assets.equipment).toLocaleString()}`],
      [
        "Less: Accumulated Depreciation",
        `(KES ${Number(data.assets.non_current_assets.accumulated_depreciation).toLocaleString()})`,
      ],
      ["Net Equipment", `KES ${Number(data.assets.non_current_assets.net_equipment).toLocaleString()}`],
      ["Intangible Assets", `KES ${Number(data.assets.non_current_assets.intangible_assets).toLocaleString()}`],
      [
        "Total Non-Current Assets",
        `KES ${Number(data.assets.non_current_assets.total_non_current_assets).toLocaleString()}`,
      ],
      ["", ""],
      ["TOTAL ASSETS", `KES ${Number(data.assets.total_assets).toLocaleString()}`],
    ]
    ;(doc as any).autoTable({
      body: assetsData,
      startY: yPosition,
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 120 },
        1: { halign: "right", cellWidth: 60 },
      },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15

    if (yPosition > 240) {
      doc.addPage()
      addLetterhead(doc)
      yPosition = 80
    }

    // Liabilities and Equity Section
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("LIABILITIES AND EQUITY", 20, yPosition)
    yPosition += 10

    const liabilitiesData = [
      ["Current Liabilities", ""],
      ["Accounts Payable", `KES ${Number(data.liabilities.current_liabilities.accounts_payable).toLocaleString()}`],
      ["Accrued Expenses", `KES ${Number(data.liabilities.current_liabilities.accrued_expenses).toLocaleString()}`],
      ["Deferred Revenue", `KES ${Number(data.liabilities.current_liabilities.deferred_revenue).toLocaleString()}`],
      [
        "Current Portion of Debt",
        `KES ${Number(data.liabilities.current_liabilities.current_portion_debt).toLocaleString()}`,
      ],
      [
        "Total Current Liabilities",
        `KES ${Number(data.liabilities.current_liabilities.total_current_liabilities).toLocaleString()}`,
      ],
      ["", ""],
      ["Non-Current Liabilities", ""],
      ["Long-term Debt", `KES ${Number(data.liabilities.non_current_liabilities.long_term_debt).toLocaleString()}`],
      [
        "Total Non-Current Liabilities",
        `KES ${Number(data.liabilities.non_current_liabilities.total_non_current_liabilities).toLocaleString()}`,
      ],
      ["", ""],
      ["TOTAL LIABILITIES", `KES ${Number(data.liabilities.total_liabilities).toLocaleString()}`],
      ["", ""],
      ["Equity", ""],
      ["Owner's Equity", `KES ${Number(data.equity.owners_equity).toLocaleString()}`],
      ["Retained Earnings", `KES ${Number(data.equity.retained_earnings).toLocaleString()}`],
      ["TOTAL EQUITY", `KES ${Number(data.equity.total_equity).toLocaleString()}`],
      ["", ""],
      [
        "TOTAL LIABILITIES AND EQUITY",
        `KES ${Number(data.liabilities.total_liabilities + data.equity.total_equity).toLocaleString()}`,
      ],
    ]
    ;(doc as any).autoTable({
      body: liabilitiesData,
      startY: yPosition,
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 120 },
        1: { halign: "right", cellWidth: 60 },
      },
    })
  } else if (reportType === "trial_balance") {
    // Trial Balance
    const trialBalanceData = data.accounts.map((account: any) => [
      account.account_name,
      account.account_type,
      account.debit_balance > 0 ? `KES ${Number(account.debit_balance).toLocaleString()}` : "",
      account.credit_balance > 0 ? `KES ${Number(account.credit_balance).toLocaleString()}` : "",
    ])

    trialBalanceData.push([
      "TOTALS",
      "",
      `KES ${Number(data.total_debits).toLocaleString()}`,
      `KES ${Number(data.total_credits).toLocaleString()}`,
    ])
    ;(doc as any).autoTable({
      head: [["Account Name", "Type", "Debit", "Credit"]],
      body: trialBalanceData,
      startY: yPosition,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 3 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    const balanceStatus = data.is_balanced ? "BALANCED ✓" : "NOT BALANCED ✗"
    const statusColor = data.is_balanced ? [39, 174, 96] : [231, 76, 60]
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
    doc.text(`Trial Balance Status: ${balanceStatus}`, 20, yPosition)
    doc.setTextColor(0, 0, 0)
  } else if (reportType === "customer_aging") {
    // Customer Aging Summary
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("Aging Summary", 20, yPosition)
    yPosition += 10

    const summaryData = [
      [
        "Current",
        `KES ${((data.aging_summary.total_outstanding * data.aging_summary.current_percentage) / 100).toLocaleString()}`,
        `${data.aging_summary.current_percentage.toFixed(1)}%`,
      ],
      [
        "1-30 Days",
        `KES ${((data.aging_summary.total_outstanding * data.aging_summary.days_1_30_percentage) / 100).toLocaleString()}`,
        `${data.aging_summary.days_1_30_percentage.toFixed(1)}%`,
      ],
      [
        "31-60 Days",
        `KES ${((data.aging_summary.total_outstanding * data.aging_summary.days_31_60_percentage) / 100).toLocaleString()}`,
        `${data.aging_summary.days_31_60_percentage.toFixed(1)}%`,
      ],
      [
        "61-90 Days",
        `KES ${((data.aging_summary.total_outstanding * data.aging_summary.days_61_90_percentage) / 100).toLocaleString()}`,
        `${data.aging_summary.days_61_90_percentage.toFixed(1)}%`,
      ],
      [
        "Over 90 Days",
        `KES ${((data.aging_summary.total_outstanding * data.aging_summary.days_over_90_percentage) / 100).toLocaleString()}`,
        `${data.aging_summary.days_over_90_percentage.toFixed(1)}%`,
      ],
    ]
    ;(doc as any).autoTable({
      head: [["Category", "Amount", "Percentage"]],
      body: summaryData,
      startY: yPosition,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 3 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15

    if (yPosition > 220) {
      doc.addPage()
      addLetterhead(doc)
      yPosition = 80
    }

    // Customer Details
    if (data.customers && data.customers.length > 0) {
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("Customer Details", 20, yPosition)
      yPosition += 8

      const customerData = data.customers
        .slice(0, 20)
        .map((customer: any) => [
          customer.customer_name,
          `KES ${Number(customer.total_outstanding).toLocaleString()}`,
          `KES ${Number(customer.current).toLocaleString()}`,
          `KES ${Number(customer.days_1_30).toLocaleString()}`,
          `KES ${Number(customer.days_31_60).toLocaleString()}`,
          `KES ${Number(customer.days_61_90).toLocaleString()}`,
          `KES ${Number(customer.days_over_90).toLocaleString()}`,
          customer.risk_level,
        ])
      ;(doc as any).autoTable({
        head: [["Customer", "Total", "Current", "1-30", "31-60", "61-90", "90+", "Risk"]],
        body: customerData,
        startY: yPosition,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 7, cellPadding: 2 },
      })
    }
  } else if (reportType === "comprehensive") {
    // Financial Summary
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("Financial Overview", 20, yPosition)
    yPosition += 10

    const summaryData = [
      ["Total Revenue", `KES ${Number(data.total_revenue).toLocaleString()}`],
      ["Total Expenses", `KES ${Number(data.total_expenses).toLocaleString()}`],
      ["Net Profit", `KES ${Number(data.net_profit).toLocaleString()}`],
      ["Gross Margin", `${Number(data.gross_margin).toFixed(2)}%`],
    ]
    ;(doc as any).autoTable({
      head: [["Metric", "Value"]],
      body: summaryData,
      startY: yPosition,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 3 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15

    // Payment Methods Breakdown
    if (data.payment_methods && data.payment_methods.length > 0) {
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("Payment Methods Breakdown", 20, yPosition)
      yPosition += 8

      const paymentMethodData = data.payment_methods.map((pm: any) => [
        pm.method,
        pm.volume.toString(),
        `KES ${Number(pm.amount).toLocaleString()}`,
        `${Number(pm.success_rate).toFixed(1)}%`,
      ])
      ;(doc as any).autoTable({
        head: [["Method", "Volume", "Amount", "Success Rate"]],
        body: paymentMethodData,
        startY: yPosition,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 3 },
      })

      yPosition = (doc as any).lastAutoTable.finalY + 15
    }

    if (yPosition > 220) {
      doc.addPage()
      addLetterhead(doc)
      yPosition = 80
    }

    // Revenue Streams
    if (data.revenue_streams && data.revenue_streams.length > 0) {
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("Revenue Streams", 20, yPosition)
      yPosition += 8

      const revenueStreamData = data.revenue_streams.map((rs: any) => [
        rs.source,
        `KES ${Number(rs.amount).toLocaleString()}`,
        `${Number(rs.percentage).toFixed(1)}%`,
        `${Number(rs.growth).toFixed(1)}%`,
      ])
      ;(doc as any).autoTable({
        head: [["Source", "Amount", "Percentage", "Growth"]],
        body: revenueStreamData,
        startY: yPosition,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 3 },
      })
    }
  } else if (reportType === "profit_loss") {
    // P&L Statement
    const plData = [
      ["Revenue", `KES ${Number(data.revenue.total).toLocaleString()}`],
      ["Total Expenses", `KES ${Number(data.expenses.total).toLocaleString()}`],
      ["Net Income", `KES ${Number(data.net_income).toLocaleString()}`],
    ]
    ;(doc as any).autoTable({
      head: [["Item", "Amount"]],
      body: plData,
      startY: yPosition,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 3 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15

    // Expenses by Category
    if (data.expenses.by_category && data.expenses.by_category.length > 0) {
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("Expenses by Category", 20, yPosition)
      yPosition += 8

      const expenseData = data.expenses.by_category.map((exp: any) => [
        exp.category,
        `KES ${Number(exp.amount).toLocaleString()}`,
      ])
      ;(doc as any).autoTable({
        head: [["Category", "Amount"]],
        body: expenseData,
        startY: yPosition,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 3 },
      })
    }
  } else if (reportType === "cash_flow") {
    // Cash Flow Statement
    const cashFlowData = [
      ["Operating Cash Inflow", `KES ${Number(data.operating_activities.cash_inflow).toLocaleString()}`],
      ["Operating Cash Outflow", `KES ${Number(data.operating_activities.cash_outflow).toLocaleString()}`],
      ["Net Operating Cash Flow", `KES ${Number(data.operating_activities.net_cash_flow).toLocaleString()}`],
    ]
    ;(doc as any).autoTable({
      head: [["Activity", "Amount"]],
      body: cashFlowData,
      startY: yPosition,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 3 },
    })
  }

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    addFooter(doc, i, pageCount)
  }

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"))

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  })
}

function addLetterhead(doc: jsPDF) {
  // Header background
  doc.setFillColor(41, 128, 185)
  doc.rect(0, 0, 210, 35, "F")

  // Company logo placeholder (circle)
  doc.setFillColor(255, 255, 255)
  doc.circle(25, 17.5, 8, "F")
  doc.setFillColor(41, 128, 185)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text("ISP", 25, 19, { align: "center" })

  // Company name and details
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text("ISP MANAGEMENT SYSTEM", 45, 15)

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text("Financial Reporting Division", 45, 21)
  doc.text("Email: finance@isp-system.com | Phone: +254 700 000 000", 45, 26)
  doc.text("Address: Nairobi, Kenya", 45, 31)

  // Reset text color
  doc.setTextColor(0, 0, 0)

  // Horizontal line separator
  doc.setDrawColor(41, 128, 185)
  doc.setLineWidth(0.5)
  doc.line(20, 40, 190, 40)
}

function addFooter(doc: jsPDF, currentPage: number, totalPages: number) {
  const pageHeight = doc.internal.pageSize.height

  // Footer line
  doc.setDrawColor(41, 128, 185)
  doc.setLineWidth(0.5)
  doc.line(20, pageHeight - 20, 190, pageHeight - 20)

  // Footer text
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 100, 100)

  // Left side - confidentiality notice
  doc.text("CONFIDENTIAL - For Internal Use Only", 20, pageHeight - 15)

  // Center - company name
  doc.text("ISP Management System", 105, pageHeight - 15, { align: "center" })

  // Right side - page number
  doc.text(`Page ${currentPage} of ${totalPages}`, 190, pageHeight - 15, { align: "right" })

  // Reset text color
  doc.setTextColor(0, 0, 0)
}

function generateFinancialReportExcel(data: any, reportType: string, startDate: Date, endDate: Date) {
  const workbook = XLSX.utils.book_new()
  const fileName = `financial-report-${reportType}-${Date.now()}.xlsx`

  // Report Info Sheet
  const reportInfo = [
    ["Financial Report"],
    ["Report Type", reportType.replace("_", " ").toUpperCase()],
    [
      "Period",
      startDate && endDate
        ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
        : `As of ${endDate.toLocaleDateString()}`,
    ],
    ["Generated", new Date().toISOString()],
  ]
  const infoSheet = XLSX.utils.aoa_to_sheet(reportInfo)
  XLSX.utils.book_append_sheet(workbook, infoSheet, "Report Info")

  if (reportType === "comprehensive") {
    // Summary Sheet
    const summaryData = [
      ["Metric", "Value"],
      ["Total Revenue", data.total_revenue],
      ["Total Expenses", data.total_expenses],
      ["Net Profit", data.net_profit],
      ["Gross Margin %", data.gross_margin],
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")

    // Payment Methods Sheet
    if (data.payment_methods) {
      const paymentMethodSheet = XLSX.utils.json_to_sheet(data.payment_methods)
      XLSX.utils.book_append_sheet(workbook, paymentMethodSheet, "Payment Methods")
    }

    // Revenue Streams Sheet
    if (data.revenue_streams) {
      const revenueStreamSheet = XLSX.utils.json_to_sheet(data.revenue_streams)
      XLSX.utils.book_append_sheet(workbook, revenueStreamSheet, "Revenue Streams")
    }

    // Customer Segments Sheet
    if (data.customer_segments) {
      const customerSegmentSheet = XLSX.utils.json_to_sheet(data.customer_segments)
      XLSX.utils.book_append_sheet(workbook, customerSegmentSheet, "Customer Segments")
    }
  } else if (reportType === "profit_loss") {
    // P&L Sheet
    const plSheet = XLSX.utils.json_to_sheet([data])
    XLSX.utils.book_append_sheet(workbook, plSheet, "Profit & Loss")

    // Expenses by Category
    if (data.expenses?.by_category) {
      const expenseSheet = XLSX.utils.json_to_sheet(data.expenses.by_category)
      XLSX.utils.book_append_sheet(workbook, expenseSheet, "Expenses by Category")
    }
  } else if (reportType === "cash_flow") {
    // Cash Flow Sheet
    const cashFlowSheet = XLSX.utils.json_to_sheet([data])
    XLSX.utils.book_append_sheet(workbook, cashFlowSheet, "Cash Flow")
  } else if (reportType === "balance_sheet") {
    // Balance Sheet Sheet
    const balanceSheetSheet = XLSX.utils.json_to_sheet([data])
    XLSX.utils.book_append_sheet(workbook, balanceSheetSheet, "Balance Sheet")
  } else if (reportType === "trial_balance") {
    // Trial Balance Sheet
    const trialBalanceSheet = XLSX.utils.json_to_sheet([data])
    XLSX.utils.book_append_sheet(workbook, trialBalanceSheet, "Trial Balance")
  } else if (reportType === "customer_aging") {
    // Customer Aging Sheet
    const customerAgingSheet = XLSX.utils.json_to_sheet([data])
    XLSX.utils.book_append_sheet(workbook, customerAgingSheet, "Customer Aging")
  }

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  })
}

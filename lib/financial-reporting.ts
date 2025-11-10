import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface FinancialReport {
  period: string
  total_revenue: number
  total_expenses: number
  net_profit: number
  gross_margin: number
  payment_methods: PaymentMethodBreakdown[]
  revenue_streams: RevenueStream[]
  customer_segments: CustomerSegment[]
  growth_metrics: GrowthMetrics
}

export interface PaymentMethodBreakdown {
  method: string
  gateway: string
  volume: number
  amount: number
  fees: number
  net_amount: number
  success_rate: number
}

export interface RevenueStream {
  source: string
  amount: number
  percentage: number
  growth: number
}

export interface CustomerSegment {
  segment: string
  customers: number
  revenue: number
  avg_revenue_per_customer: number
}

export interface GrowthMetrics {
  revenue_growth: number
  customer_growth: number
  churn_rate: number
  monthly_recurring_revenue: number
}

export interface BalanceSheet {
  period: string
  assets: {
    current_assets: {
      cash_and_equivalents: number
      accounts_receivable: number
      inventory: number
      prepaid_expenses: number
      total_current_assets: number
    }
    non_current_assets: {
      equipment: number
      accumulated_depreciation: number
      net_equipment: number
      intangible_assets: number
      total_non_current_assets: number
    }
    total_assets: number
  }
  liabilities: {
    current_liabilities: {
      accounts_payable: number
      accrued_expenses: number
      deferred_revenue: number
      current_portion_debt: number
      total_current_liabilities: number
    }
    non_current_liabilities: {
      long_term_debt: number
      total_non_current_liabilities: number
    }
    total_liabilities: number
  }
  equity: {
    owners_equity: number
    retained_earnings: number
    total_equity: number
  }
}

export interface TrialBalance {
  period: string
  accounts: Array<{
    account_name: string
    account_type: string
    debit_balance: number
    credit_balance: number
  }>
  total_debits: number
  total_credits: number
  is_balanced: boolean
}

export interface CustomerAgingReport {
  period: string
  customers: Array<{
    customer_id: number
    customer_name: string
    total_outstanding: number
    current: number
    days_1_30: number
    days_31_60: number
    days_61_90: number
    days_over_90: number
    last_payment_date: string
    credit_limit: number
    risk_level: string
  }>
  aging_summary: {
    total_outstanding: number
    current_percentage: number
    days_1_30_percentage: number
    days_31_60_percentage: number
    days_61_90_percentage: number
    days_over_90_percentage: number
  }
}

export class FinancialReportingEngine {
  async generateComprehensiveReport(startDate: Date, endDate: Date): Promise<FinancialReport> {
    const [revenueData, expenseData, paymentMethodData, revenueStreamData, customerData, growthData] =
      await Promise.all([
        this.getRevenueData(startDate, endDate),
        this.getExpenseData(startDate, endDate),
        this.getPaymentMethodBreakdown(startDate, endDate),
        this.getRevenueStreams(startDate, endDate),
        this.getCustomerSegments(startDate, endDate),
        this.getGrowthMetrics(startDate, endDate),
      ])

    const totalRevenue = Number(revenueData.total_revenue || 0)
    const totalExpenses = Number(expenseData.total_expenses || 0)

    return {
      period: `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: totalRevenue - totalExpenses,
      gross_margin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
      payment_methods: paymentMethodData,
      revenue_streams: revenueStreamData,
      customer_segments: customerData,
      growth_metrics: growthData,
    }
  }

  private async getRevenueData(startDate: Date, endDate: Date) {
    const [result] = await sql`
      SELECT 
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(*) as transaction_count,
        AVG(amount) as avg_transaction_value
      FROM payments 
      WHERE status = 'completed' 
        AND payment_date >= ${startDate.toISOString()}
        AND payment_date <= ${endDate.toISOString()}
    `
    return result
  }

  private async getExpenseData(startDate: Date, endDate: Date) {
    const [result] = await sql`
      SELECT 
        COALESCE(SUM(amount), 0) as total_expenses,
        COUNT(*) as expense_count
      FROM expenses 
      WHERE expense_date >= ${startDate.toISOString().split("T")[0]}
        AND expense_date <= ${endDate.toISOString().split("T")[0]}
    `
    return result || { total_expenses: 0, expense_count: 0 }
  }

  private async getPaymentMethodBreakdown(startDate: Date, endDate: Date): Promise<PaymentMethodBreakdown[]> {
    const results = await sql`
      SELECT 
        payment_method as method,
        COALESCE(gateway_used, 'manual') as gateway,
        COUNT(*) as volume,
        COALESCE(SUM(amount), 0) as amount,
        0 as fees,
        COALESCE(SUM(amount), 0) as net_amount,
        ROUND(
          (COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 
          2
        ) as success_rate
      FROM payments 
      WHERE payment_date >= ${startDate.toISOString()}
        AND payment_date <= ${endDate.toISOString()}
      GROUP BY payment_method, gateway_used
      ORDER BY amount DESC
    `

    return results.map((row) => ({
      method: row.method,
      gateway: row.gateway,
      volume: Number(row.volume),
      amount: Number(row.amount),
      fees: Number(row.fees),
      net_amount: Number(row.net_amount),
      success_rate: Number(row.success_rate),
    }))
  }

  private async getRevenueStreams(startDate: Date, endDate: Date): Promise<RevenueStream[]> {
    const results = await sql`
      SELECT 
        sp.name as source,
        COALESCE(SUM(p.amount), 0) as amount
      FROM customer_services cs
      JOIN service_plans sp ON cs.service_plan_id = sp.id
      JOIN customers c ON cs.customer_id = c.id
      LEFT JOIN payments p ON c.id = p.customer_id 
        AND p.status = 'completed'
        AND p.payment_date >= ${startDate.toISOString()}
        AND p.payment_date <= ${endDate.toISOString()}
      GROUP BY sp.name
      HAVING SUM(p.amount) > 0
      ORDER BY amount DESC
    `

    const totalRevenue = results.reduce((sum, row) => sum + Number(row.amount), 0)

    return results.map((row) => {
      const amount = Number(row.amount)
      return {
        source: row.source,
        amount,
        percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
        growth: Math.random() * 20 - 5, // Placeholder - would calculate actual growth
      }
    })
  }

  private async getCustomerSegments(startDate: Date, endDate: Date): Promise<CustomerSegment[]> {
    const results = await sql`
      SELECT 
        c.customer_type as segment,
        COUNT(DISTINCT c.id) as customers,
        COALESCE(SUM(p.amount), 0) as revenue
      FROM customers c
      LEFT JOIN payments p ON c.id = p.customer_id 
        AND p.status = 'completed'
        AND p.payment_date >= ${startDate.toISOString()}
        AND p.payment_date <= ${endDate.toISOString()}
      GROUP BY c.customer_type
      ORDER BY revenue DESC
    `

    return results.map((row) => {
      const customers = Number(row.customers)
      const revenue = Number(row.revenue)
      return {
        segment: row.segment || "Individual",
        customers,
        revenue,
        avg_revenue_per_customer: customers > 0 ? revenue / customers : 0,
      }
    })
  }

  private async getGrowthMetrics(startDate: Date, endDate: Date): Promise<GrowthMetrics> {
    // Calculate previous period for comparison
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const prevStartDate = new Date(startDate.getTime() - daysDiff * 24 * 60 * 60 * 1000)
    const prevEndDate = new Date(startDate.getTime() - 1)

    const [currentRevenue] = await sql`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM payments 
      WHERE status = 'completed' 
        AND payment_date >= ${startDate.toISOString()}
        AND payment_date <= ${endDate.toISOString()}
    `

    const [previousRevenue] = await sql`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM payments 
      WHERE status = 'completed' 
        AND payment_date >= ${prevStartDate.toISOString()}
        AND payment_date <= ${prevEndDate.toISOString()}
    `

    const [currentCustomers] = await sql`
      SELECT COUNT(*) as count
      FROM customers 
      WHERE created_at >= ${startDate.toISOString()}
        AND created_at <= ${endDate.toISOString()}
    `

    const [previousCustomers] = await sql`
      SELECT COUNT(*) as count
      FROM customers 
      WHERE created_at >= ${prevStartDate.toISOString()}
        AND created_at <= ${prevEndDate.toISOString()}
    `

    const currentRev = Number(currentRevenue.revenue)
    const prevRev = Number(previousRevenue.revenue)
    const currentCust = Number(currentCustomers.count)
    const prevCust = Number(previousCustomers.count)

    return {
      revenue_growth: prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : 0,
      customer_growth: prevCust > 0 ? ((currentCust - prevCust) / prevCust) * 100 : 0,
      churn_rate: 2.5, // Placeholder - would calculate actual churn
      monthly_recurring_revenue: currentRev,
    }
  }

  async generateProfitLossStatement(startDate: Date, endDate: Date) {
    const revenue = await this.getRevenueData(startDate, endDate)
    const expenses = await this.getExpenseData(startDate, endDate)

    const expensesByCategory = await sql`
      SELECT 
        ec.name as category,
        COALESCE(SUM(e.amount), 0) as amount
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.expense_date >= ${startDate.toISOString().split("T")[0]}
        AND e.expense_date <= ${endDate.toISOString().split("T")[0]}
      GROUP BY ec.name
      ORDER BY amount DESC
    `

    return {
      period: `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
      revenue: {
        total: Number(revenue.total_revenue),
        transactions: Number(revenue.transaction_count),
        average: Number(revenue.avg_transaction_value),
      },
      expenses: {
        total: Number(expenses.total_expenses),
        by_category: expensesByCategory.map((cat) => ({
          category: cat.category || "Uncategorized",
          amount: Number(cat.amount),
        })),
      },
      net_income: Number(revenue.total_revenue) - Number(expenses.total_expenses),
    }
  }

  async generateCashFlowStatement(startDate: Date, endDate: Date) {
    const [operatingCashFlow] = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as cash_inflow,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as cash_outflow
      FROM (
        SELECT amount FROM payments WHERE status = 'completed' 
          AND payment_date >= ${startDate.toISOString()}
          AND payment_date <= ${endDate.toISOString()}
        UNION ALL
        SELECT -amount FROM expenses 
          WHERE expense_date >= ${startDate.toISOString().split("T")[0]}
          AND expense_date <= ${endDate.toISOString().split("T")[0]}
      ) cash_flows
    `

    return {
      period: `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
      operating_activities: {
        cash_inflow: Number(operatingCashFlow.cash_inflow),
        cash_outflow: Number(operatingCashFlow.cash_outflow),
        net_cash_flow: Number(operatingCashFlow.cash_inflow) - Number(operatingCashFlow.cash_outflow),
      },
      investing_activities: {
        equipment_purchases: 0, // Would be calculated from actual data
        net_cash_flow: 0,
      },
      financing_activities: {
        loans_received: 0, // Would be calculated from actual data
        loan_payments: 0,
        net_cash_flow: 0,
      },
    }
  }

  async generateBalanceSheet(asOfDate: Date): Promise<BalanceSheet> {
    const [cashData] = await sql`
      SELECT COALESCE(SUM(amount), 0) as cash_balance
      FROM payments 
      WHERE status = 'completed' AND payment_date <= ${asOfDate.toISOString()}
    `

    const [receivablesData] = await sql`
      SELECT COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0) as accounts_receivable
      FROM invoices 
      WHERE status IN ('pending', 'overdue', 'partial') 
        AND invoice_date <= ${asOfDate.toISOString()}
    `

    const [payablesData] = await sql`
      SELECT COALESCE(SUM(amount), 0) as accounts_payable
      FROM expenses 
      WHERE status = 'pending' AND expense_date <= ${asOfDate.toISOString().split("T")[0]}
    `

    const [equipmentData] = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN category = 'equipment' THEN amount ELSE 0 END), 0) as equipment_cost,
        COALESCE(SUM(CASE WHEN category = 'depreciation' THEN amount ELSE 0 END), 0) as accumulated_depreciation
      FROM expenses 
      WHERE expense_date <= ${asOfDate.toISOString().split("T")[0]}
    `

    const cashBalance = Number(cashData.cash_balance)
    const accountsReceivable = Number(receivablesData.accounts_receivable)
    const accountsPayable = Number(payablesData.accounts_payable)
    const equipmentCost = Number(equipmentData.equipment_cost)
    const accumulatedDepreciation = Number(equipmentData.accumulated_depreciation)

    const currentAssets = cashBalance + accountsReceivable + 25000 // inventory placeholder
    const netEquipment = equipmentCost - accumulatedDepreciation
    const totalAssets = currentAssets + netEquipment + 50000 // intangible assets placeholder
    const currentLiabilities = accountsPayable + 15000 // accrued expenses placeholder
    const totalLiabilities = currentLiabilities + 200000 // long-term debt placeholder
    const totalEquity = totalAssets - totalLiabilities

    return {
      period: asOfDate.toISOString().split("T")[0],
      assets: {
        current_assets: {
          cash_and_equivalents: cashBalance,
          accounts_receivable: accountsReceivable,
          inventory: 25000,
          prepaid_expenses: 10000,
          total_current_assets: currentAssets + 10000,
        },
        non_current_assets: {
          equipment: equipmentCost,
          accumulated_depreciation: accumulatedDepreciation,
          net_equipment: netEquipment,
          intangible_assets: 50000,
          total_non_current_assets: netEquipment + 50000,
        },
        total_assets: totalAssets + 10000,
      },
      liabilities: {
        current_liabilities: {
          accounts_payable: accountsPayable,
          accrued_expenses: 15000,
          deferred_revenue: 8000,
          current_portion_debt: 25000,
          total_current_liabilities: currentLiabilities + 33000,
        },
        non_current_liabilities: {
          long_term_debt: 200000,
          total_non_current_liabilities: 200000,
        },
        total_liabilities: totalLiabilities + 33000,
      },
      equity: {
        owners_equity: 500000,
        retained_earnings: totalEquity - 500000,
        total_equity: totalEquity,
      },
    }
  }

  async generateTrialBalance(asOfDate: Date): Promise<TrialBalance> {
    const accounts = await sql`
      SELECT 
        'Cash and Bank' as account_name,
        'Asset' as account_type,
        COALESCE(SUM(CASE WHEN p.amount > 0 THEN p.amount ELSE 0 END), 0) as debit_balance,
        0 as credit_balance
      FROM payments p
      WHERE p.payment_date <= ${asOfDate.toISOString()}
      
      UNION ALL
      
      SELECT 
        'Accounts Receivable' as account_name,
        'Asset' as account_type,
        COALESCE(SUM(i.amount - COALESCE(i.paid_amount, 0)), 0) as debit_balance,
        0 as credit_balance
      FROM invoices i
      WHERE i.invoice_date <= ${asOfDate.toISOString()}
        AND i.status IN ('pending', 'overdue', 'partial')
      
      UNION ALL
      
      SELECT 
        'Accounts Payable' as account_name,
        'Liability' as account_type,
        0 as debit_balance,
        COALESCE(SUM(e.amount), 0) as credit_balance
      FROM expenses e
      WHERE e.expense_date <= ${asOfDate.toISOString().split("T")[0]}
        AND e.status = 'pending'
      
      UNION ALL
      
      SELECT 
        'Revenue' as account_name,
        'Revenue' as account_type,
        0 as debit_balance,
        COALESCE(SUM(p.amount), 0) as credit_balance
      FROM payments p
      WHERE p.status = 'completed'
        AND p.payment_date <= ${asOfDate.toISOString()}
      
      UNION ALL
      
      SELECT 
        'Operating Expenses' as account_name,
        'Expense' as account_type,
        COALESCE(SUM(e.amount), 0) as debit_balance,
        0 as credit_balance
      FROM expenses e
      WHERE e.expense_date <= ${asOfDate.toISOString().split("T")[0]}
        AND e.status = 'approved'
    `

    const totalDebits = accounts.reduce((sum, account) => sum + Number(account.debit_balance), 0)
    const totalCredits = accounts.reduce((sum, account) => sum + Number(account.credit_balance), 0)

    return {
      period: asOfDate.toISOString().split("T")[0],
      accounts: accounts.map((account) => ({
        account_name: account.account_name,
        account_type: account.account_type,
        debit_balance: Number(account.debit_balance),
        credit_balance: Number(account.credit_balance),
      })),
      total_debits: totalDebits,
      total_credits: totalCredits,
      is_balanced: Math.abs(totalDebits - totalCredits) < 0.01,
    }
  }

  async generateCustomerAgingReport(asOfDate: Date): Promise<CustomerAgingReport> {
    const customers = await sql`
      SELECT 
        c.id as customer_id,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        COALESCE(SUM(i.amount - COALESCE(i.paid_amount, 0)), 0) as total_outstanding,
        COALESCE(SUM(CASE 
          WHEN i.due_date >= ${asOfDate.toISOString().split("T")[0]} 
          THEN i.amount - COALESCE(i.paid_amount, 0) 
          ELSE 0 
        END), 0) as current,
        COALESCE(SUM(CASE 
          WHEN CAST((${asOfDate.toISOString().split("T")[0]}::date - i.due_date) AS INTEGER) BETWEEN 1 AND 30 
          THEN i.amount - COALESCE(i.paid_amount, 0) 
          ELSE 0 
        END), 0) as days_1_30,
        COALESCE(SUM(CASE 
          WHEN CAST((${asOfDate.toISOString().split("T")[0]}::date - i.due_date) AS INTEGER) BETWEEN 31 AND 60 
          THEN i.amount - COALESCE(i.paid_amount, 0) 
          ELSE 0 
        END), 0) as days_31_60,
        COALESCE(SUM(CASE 
          WHEN CAST((${asOfDate.toISOString().split("T")[0]}::date - i.due_date) AS INTEGER) BETWEEN 61 AND 90 
          THEN i.amount - COALESCE(i.paid_amount, 0) 
          ELSE 0 
        END), 0) as days_61_90,
        COALESCE(SUM(CASE 
          WHEN CAST((${asOfDate.toISOString().split("T")[0]}::date - i.due_date) AS INTEGER) > 90 
          THEN i.amount - COALESCE(i.paid_amount, 0) 
          ELSE 0 
        END), 0) as days_over_90,
        MAX(p.payment_date) as last_payment_date,
        COALESCE(bc.credit_limit, 0) as credit_limit
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id 
        AND i.status IN ('pending', 'overdue', 'partial')
        AND i.invoice_date <= ${asOfDate.toISOString()}
      LEFT JOIN payments p ON c.id = p.customer_id AND p.status = 'completed'
      LEFT JOIN customer_billing_configurations bc ON c.id = bc.customer_id
      GROUP BY c.id, c.first_name, c.last_name, bc.credit_limit
      HAVING SUM(i.amount - COALESCE(i.paid_amount, 0)) > 0
      ORDER BY total_outstanding DESC
    `

    const totalOutstanding = customers.reduce((sum, customer) => sum + Number(customer.total_outstanding), 0)

    const agingSummary = {
      total_outstanding: totalOutstanding,
      current_percentage:
        totalOutstanding > 0 ? (customers.reduce((sum, c) => sum + Number(c.current), 0) / totalOutstanding) * 100 : 0,
      days_1_30_percentage:
        totalOutstanding > 0
          ? (customers.reduce((sum, c) => sum + Number(c.days_1_30), 0) / totalOutstanding) * 100
          : 0,
      days_31_60_percentage:
        totalOutstanding > 0
          ? (customers.reduce((sum, c) => sum + Number(c.days_31_60), 0) / totalOutstanding) * 100
          : 0,
      days_61_90_percentage:
        totalOutstanding > 0
          ? (customers.reduce((sum, c) => sum + Number(c.days_61_90), 0) / totalOutstanding) * 100
          : 0,
      days_over_90_percentage:
        totalOutstanding > 0
          ? (customers.reduce((sum, c) => sum + Number(c.days_over_90), 0) / totalOutstanding) * 100
          : 0,
    }

    return {
      period: asOfDate.toISOString().split("T")[0],
      customers: customers.map((customer) => {
        const totalOutstanding = Number(customer.total_outstanding)
        const daysOver90 = Number(customer.days_over_90)
        const creditLimit = Number(customer.credit_limit)

        let riskLevel = "Low"
        if (daysOver90 > 0) riskLevel = "High"
        else if (Number(customer.days_61_90) > 0) riskLevel = "Medium"
        else if (creditLimit > 0 && totalOutstanding > creditLimit * 0.8) riskLevel = "Medium"

        return {
          customer_id: Number(customer.customer_id),
          customer_name: customer.customer_name,
          total_outstanding: totalOutstanding,
          current: Number(customer.current),
          days_1_30: Number(customer.days_1_30),
          days_31_60: Number(customer.days_31_60),
          days_61_90: Number(customer.days_61_90),
          days_over_90: daysOver90,
          last_payment_date: customer.last_payment_date || "Never",
          credit_limit: creditLimit,
          risk_level: riskLevel,
        }
      }),
      aging_summary: agingSummary,
    }
  }
}

export const financialReporting = new FinancialReportingEngine()

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const budgets = await sql`
      SELECT 
        id,
        category,
        budgeted_amount,
        actual_amount,
        budget_year,
        budget_period,
        notes,
        created_at,
        updated_at
      FROM budgets 
      WHERE budget_year = EXTRACT(YEAR FROM CURRENT_DATE)
      ORDER BY category ASC
    `

    // Calculate variance for each budget item
    const budgetData = budgets.map((budget) => ({
      ...budget,
      variance:
        budget.budgeted_amount > 0
          ? ((budget.actual_amount - budget.budgeted_amount) / budget.budgeted_amount) * 100
          : 0,
    }))

    return NextResponse.json({ budgets: budgetData })
  } catch (error) {
    console.error("Error fetching budgets:", error)
    return NextResponse.json({ error: "Failed to fetch budgets" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { budgets, budget_year, budget_period } = await request.json()

    if (!budgets || !Array.isArray(budgets)) {
      return NextResponse.json({ error: "Budgets array is required" }, { status: 400 })
    }

    // Delete existing budgets for the year/period
    await sql`
      DELETE FROM budgets 
      WHERE budget_year = ${budget_year || new Date().getFullYear()}
      AND budget_period = ${budget_period || "annual"}
    `

    // Insert new budget data
    const insertedBudgets = []
    for (const budget of budgets) {
      const [insertedBudget] = await sql`
        INSERT INTO budgets (
          category,
          budgeted_amount,
          actual_amount,
          budget_year,
          budget_period,
          notes
        )
        VALUES (
          ${budget.category},
          ${budget.budgeted_amount || 0},
          ${budget.actual_amount || 0},
          ${budget_year || new Date().getFullYear()},
          ${budget_period || "annual"},
          ${budget.notes || ""}
        )
        RETURNING *
      `
      insertedBudgets.push(insertedBudget)
    }

    return NextResponse.json({ budgets: insertedBudgets })
  } catch (error) {
    console.error("Error saving budgets:", error)
    return NextResponse.json({ error: "Failed to save budgets" }, { status: 500 })
  }
}

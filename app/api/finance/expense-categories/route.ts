import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const categories = await sql`
      SELECT 
        id,
        name,
        description,
        budget_amount,
        color,
        is_active,
        created_at,
        updated_at
      FROM expense_categories 
      WHERE is_active = true
      ORDER BY name ASC
    `

    return NextResponse.json({ categories })
  } catch (error) {
    console.error("Error fetching expense categories:", error)
    return NextResponse.json({ error: "Failed to fetch expense categories" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, budget_amount, color } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    const existing = await sql`
      SELECT id FROM expense_categories WHERE name = ${name}
    `

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Category "${name}" already exists. Please use a different name.` },
        { status: 409 },
      )
    }

    const [category] = await sql`
      INSERT INTO expense_categories (name, description, budget_amount, color, is_active)
      VALUES (${name}, ${description || ""}, ${budget_amount || 0}, ${color || "#6366f1"}, true)
      RETURNING *
    `

    return NextResponse.json({ category })
  } catch (error) {
    console.error("Error creating expense category:", error)
    return NextResponse.json({ error: "Failed to create expense category" }, { status: 500 })
  }
}

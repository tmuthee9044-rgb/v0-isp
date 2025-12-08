import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET all categories
export async function GET(request: NextRequest) {
  try {
    const sql = await getSql()

    const categories = await sql`
      SELECT 
        id, name, icon, color, is_active, created_at, updated_at
      FROM inventory_categories
      WHERE is_active = true
      ORDER BY name ASC
    `

    return NextResponse.json({
      success: true,
      categories: categories || [],
    })
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}

// POST create new category
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const sql = await getSql()

    // Check if category name already exists
    const existing = await sql`
      SELECT id FROM inventory_categories 
      WHERE LOWER(name) = LOWER(${data.name})
    `

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Category name already exists" }, { status: 400 })
    }

    const category = await sql`
      INSERT INTO inventory_categories (
        name, icon, color, is_active
      ) VALUES (
        ${data.name}, 
        ${data.icon || "Package"}, 
        ${data.color || "bg-gray-500"}, 
        true
      )
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      message: "Category created successfully",
      category: category[0],
    })
  } catch (error) {
    console.error("Error creating category:", error)
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
  }
}

// PUT update category
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const sql = await getSql()

    if (!data.id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 })
    }

    const category = await sql`
      UPDATE inventory_categories
      SET 
        name = ${data.name},
        icon = ${data.icon},
        color = ${data.color},
        is_active = ${data.is_active ?? true},
        updated_at = NOW()
      WHERE id = ${data.id}
      RETURNING *
    `

    if (!category || category.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Category updated successfully",
      category: category[0],
    })
  } catch (error) {
    console.error("Error updating category:", error)
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

// DELETE category (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 })
    }

    const sql = await getSql()

    // Soft delete by setting is_active to false
    const category = await sql`
      UPDATE inventory_categories
      SET is_active = false, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (!category || category.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}

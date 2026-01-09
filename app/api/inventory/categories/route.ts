import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export const dynamic = "force-dynamic"

// Helper function to ensure table exists
async function ensureTableExists(sql: any) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS inventory_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        icon VARCHAR(50) DEFAULT 'Package',
        color VARCHAR(50) DEFAULT 'bg-gray-500',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    // Check if table has any records
    const count = await sql`SELECT COUNT(*) as count FROM inventory_categories`

    // If empty, insert default categories
    if (count[0].count === 0) {
      await sql`
        INSERT INTO inventory_categories (name, icon, color) VALUES
        ('Network Equipment', 'Router', 'bg-blue-500'),
        ('Fiber Optic Equipment', 'Zap', 'bg-green-500'),
        ('Wireless Equipment', 'Wifi', 'bg-purple-500'),
        ('Server Equipment', 'Server', 'bg-orange-500'),
        ('Testing Equipment', 'BarChart3', 'bg-red-500'),
        ('Power Equipment', 'Zap', 'bg-yellow-500'),
        ('Installation Tools', 'Package', 'bg-gray-500'),
        ('Cables & Accessories', 'Cable', 'bg-indigo-500')
        ON CONFLICT (name) DO NOTHING
      `
    }
    return true
  } catch (error) {
    console.error("[v0] Error ensuring table exists:", error)
    return false
  }
}

// GET all categories
export async function GET(request: NextRequest) {
  try {
    const sql = await getSql()

    const tableReady = await ensureTableExists(sql)
    console.log("[v0] Table ready:", tableReady)

    const categories = await sql`
      SELECT 
        id, name, icon, color, is_active, created_at, updated_at
      FROM inventory_categories
      WHERE is_active = true
      ORDER BY name ASC
    `

    console.log("[v0] Categories from DB:", categories?.length || 0)

    return NextResponse.json({
      success: true,
      categories: categories || [],
    })
  } catch (error) {
    console.error("[v0] Error fetching categories:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}

// POST create new category
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const sql = await getSql()

    // Ensure table exists
    const tableReady = await ensureTableExists(sql)
    if (!tableReady) {
      return NextResponse.json(
        {
          error: "Database table not ready. Please run schema synchronization first.",
        },
        { status: 500 },
      )
    }

    // Validate input
    if (!data.name || data.name.trim() === "") {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    // Check if category name already exists
    const existing = await sql`
      SELECT id FROM inventory_categories 
      WHERE LOWER(name) = LOWER(${data.name.trim()})
    `

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Category name already exists" }, { status: 400 })
    }

    const category = await sql`
      INSERT INTO inventory_categories (
        name, icon, color, is_active
      ) VALUES (
        ${data.name.trim()}, 
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
    console.error("[v0] Error creating category:", error)
    return NextResponse.json(
      {
        error: "Failed to create category",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
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

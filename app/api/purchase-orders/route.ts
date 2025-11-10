import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

// Get all purchase orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "all"
    const supplierId = searchParams.get("supplier_id")
    const dateFrom = searchParams.get("date_from")
    const dateTo = searchParams.get("date_to")

    console.log("[v0] Purchase orders API called with params:", { status, supplierId, dateFrom, dateTo })

    let purchaseOrders

    if (supplierId && status === "all") {
      // Most common case for supplier detail page
      purchaseOrders = await sql`
        SELECT 
          po.*,
          s.company_name as supplier_name,
          s.contact_name as supplier_contact,
          u.username as created_by_name,
          COUNT(poi.id) as total_items
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        LEFT JOIN users u ON po.created_by = u.id
        LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
        WHERE po.supplier_id = ${supplierId}
        GROUP BY po.id, s.company_name, s.contact_name, u.username
        ORDER BY po.created_at DESC
      `
    } else if (status !== "all" && !supplierId) {
      purchaseOrders = await sql`
        SELECT 
          po.*,
          s.company_name as supplier_name,
          s.contact_name as supplier_contact,
          u.username as created_by_name,
          COUNT(poi.id) as total_items
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        LEFT JOIN users u ON po.created_by = u.id
        LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
        WHERE po.status = ${status}
        GROUP BY po.id, s.company_name, s.contact_name, u.username
        ORDER BY po.created_at DESC
      `
    } else {
      // Default: all purchase orders
      purchaseOrders = await sql`
        SELECT 
          po.*,
          s.company_name as supplier_name,
          s.contact_name as supplier_contact,
          u.username as created_by_name,
          COUNT(poi.id) as total_items
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        LEFT JOIN users u ON po.created_by = u.id
        LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
        GROUP BY po.id, s.company_name, s.contact_name, u.username
        ORDER BY po.created_at DESC
      `
    }

    console.log("[v0] Found purchase orders:", purchaseOrders.length)

    // Ensure result is an array
    const purchaseOrdersArray = Array.isArray(purchaseOrders) ? purchaseOrders : []

    // Get items for each purchase order
    const purchaseOrdersWithItems = await Promise.all(
      purchaseOrdersArray.map(async (po: any) => {
        const items = await sql`
          SELECT 
            poi.*,
            ii.name as item_name,
            ii.sku,
            ii.category
          FROM purchase_order_items poi
          LEFT JOIN inventory_items ii ON poi.inventory_item_id = ii.id
          WHERE poi.purchase_order_id = ${po.id}
          ORDER BY poi.id
        `

        return {
          id: po.id,
          order_number: po.order_number,
          supplier_id: po.supplier_id,
          supplier_name: po.supplier_name,
          supplier_contact: po.supplier_contact,
          status: po.status,
          total_amount: Number(po.total_amount || 0),
          notes: po.notes,
          created_by: po.created_by,
          created_by_name: po.created_by_name,
          created_at: po.created_at,
          updated_at: po.updated_at,
          total_items: Number(po.total_items || 0),
          items: Array.isArray(items)
            ? items.map((item: any) => ({
                id: item.id,
                inventory_item_id: item.inventory_item_id,
                item_name: item.item_name,
                sku: item.sku,
                category: item.category,
                quantity: Number(item.quantity),
                unit_cost: Number(item.unit_cost),
                total_cost: Number(item.total_cost),
              }))
            : [],
        }
      }),
    )

    console.log("[v0] Returning purchase orders with items:", purchaseOrdersWithItems.length)

    return NextResponse.json({
      success: true,
      purchase_orders: purchaseOrdersWithItems,
    })
  } catch (error) {
    console.error("Error fetching purchase orders:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch purchase orders",
        purchase_orders: [],
      },
      { status: 500 },
    )
  }
}

// Create new purchase order
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const { supplier_id, items, notes, created_by, status = "PENDING" } = data

    if (!supplier_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Supplier ID is required",
        },
        { status: 400 },
      )
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one item is required",
        },
        { status: 400 },
      )
    }

    // Create purchase order - PO number will be auto-generated by trigger
    const purchaseOrder = await sql`
      INSERT INTO purchase_orders (
        supplier_id, status, notes, created_by
      ) VALUES (
        ${supplier_id}, ${status}, ${notes || null}, ${created_by || 1}
      )
      RETURNING *
    `

    const poId = purchaseOrder[0].id

    // Add purchase order items and calculate total cost
    let totalAmount = 0
    for (const item of items) {
      if (!item.inventory_item_id || !item.quantity || item.unit_cost === undefined) {
        throw new Error("Each item must have inventory_item_id, quantity, and unit_cost")
      }

      const totalCost = Number(item.quantity) * Number(item.unit_cost)
      totalAmount += totalCost

      await sql`
        INSERT INTO purchase_order_items (
          purchase_order_id, inventory_item_id, quantity, unit_cost, total_cost
        ) VALUES (
          ${poId}, ${item.inventory_item_id}, ${item.quantity}, ${item.unit_cost}, ${totalCost}
        )
      `
    }

    // Update total amount
    await sql`
      UPDATE purchase_orders 
      SET total_amount = ${totalAmount}
      WHERE id = ${poId}
    `

    // Get the complete purchase order with generated PO number
    const completePO = await sql`
      SELECT po.*, s.company_name as supplier_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = ${poId}
    `

    return NextResponse.json({
      success: true,
      message: "Purchase order created successfully",
      purchase_order: completePO[0],
    })
  } catch (error) {
    console.error("Error creating purchase order:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create purchase order",
      },
      { status: 500 },
    )
  }
}

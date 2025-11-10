import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

// Get single purchase order
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    const purchaseOrder = await sql`
      SELECT 
        po.*,
        s.name as supplier_name,
        s.contact_name as supplier_contact,
        s.email as supplier_email,
        s.phone as supplier_phone,
        u.username as created_by_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.created_by = u.id
      WHERE po.id = ${id}
    `

    if (purchaseOrder.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Purchase order not found",
        },
        { status: 404 },
      )
    }

    const items = await sql`
      SELECT 
        poi.*,
        ii.name as item_name,
        ii.sku,
        ii.category,
        ii.description
      FROM purchase_order_items poi
      LEFT JOIN inventory_items ii ON poi.inventory_item_id = ii.id
      WHERE poi.purchase_order_id = ${id}
      ORDER BY poi.id
    `

    const po = purchaseOrder[0]
    const result = {
      id: po.id,
      order_number: po.order_number,
      supplier_id: po.supplier_id,
      supplier_name: po.supplier_name,
      supplier_contact: po.supplier_contact,
      supplier_email: po.supplier_email,
      supplier_phone: po.supplier_phone,
      status: po.status,
      total_amount: Number(po.total_amount || 0),
      notes: po.notes,
      created_by: po.created_by,
      created_by_name: po.created_by_name,
      created_at: po.created_at,
      updated_at: po.updated_at,
      items: items.map((item: any) => ({
        id: item.id,
        inventory_item_id: item.inventory_item_id,
        item_name: item.item_name,
        sku: item.sku,
        category: item.category,
        description: item.description,
        quantity: Number(item.quantity),
        unit_cost: Number(item.unit_cost),
        total_cost: Number(item.total_cost),
      })),
    }

    return NextResponse.json({
      success: true,
      purchase_order: result,
    })
  } catch (error) {
    console.error("Error fetching purchase order:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch purchase order",
      },
      { status: 500 },
    )
  }
}

// Update purchase order status
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const data = await request.json()
    const { status, notes } = data

    if (!status) {
      return NextResponse.json(
        {
          success: false,
          error: "Status is required",
        },
        { status: 400 },
      )
    }

    // Validate status
    const validStatuses = ["PENDING", "APPROVED", "RECEIVED", "CANCELLED"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid status. Must be one of: " + validStatuses.join(", "),
        },
        { status: 400 },
      )
    }

    // Update purchase order status
    const updatedPO = await sql`
      UPDATE purchase_orders 
      SET status = ${status}, notes = ${notes || null}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    if (updatedPO.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Purchase order not found",
        },
        { status: 404 },
      )
    }

    // If status is RECEIVED, update inventory stock quantities
    if (status === "RECEIVED") {
      console.log("[v0] Purchase order marked as RECEIVED, processing inventory and invoice...")

      const items = await sql`
        SELECT poi.*, ii.name as item_name
        FROM purchase_order_items poi
        LEFT JOIN inventory_items ii ON poi.inventory_item_id = ii.id
        WHERE poi.purchase_order_id = ${id}
      `

      console.log("[v0] Found items to receive:", items.length)

      for (const item of items) {
        // Update inventory stock
        await sql`
          UPDATE inventory_items 
          SET stock_quantity = stock_quantity + ${item.quantity},
              updated_at = NOW()
          WHERE id = ${item.inventory_item_id}
        `

        // Create inventory movement record (if table exists)
        try {
          await sql`
            INSERT INTO inventory_movements (
              item_id, movement_type, quantity, reference_number, 
              notes, created_by, created_at
            ) VALUES (
              ${item.inventory_item_id}, 'IN', ${item.quantity}, ${updatedPO[0].order_number},
              'Purchase order received: ' || ${updatedPO[0].order_number},
              ${updatedPO[0].created_by}, NOW()
            )
          `
        } catch (movementError) {
          console.log("Inventory movements table not found or different schema, skipping movement record")
        }
      }

      try {
        console.log("[v0] Creating supplier invoice for PO:", updatedPO[0].order_number)

        // Check if invoice already exists for this PO
        const existingInvoice = await sql`
          SELECT id FROM supplier_invoices 
          WHERE purchase_order_id = ${id}
          LIMIT 1
        `

        if (existingInvoice.length === 0) {
          // Generate unique invoice number
          const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

          // Calculate totals
          const subtotal = Number(updatedPO[0].total_amount || 0)
          const taxRate = 0.16 // 16% VAT
          const taxAmount = subtotal * taxRate
          const totalAmount = subtotal + taxAmount

          // Set due date (30 days from now)
          const dueDate = new Date()
          dueDate.setDate(dueDate.getDate() + 30)

          console.log("[v0] Invoice details:", {
            invoiceNumber,
            supplierId: updatedPO[0].supplier_id,
            poId: id,
            subtotal,
            taxAmount,
            totalAmount,
          })

          // Create the invoice
          const newInvoice = await sql`
            INSERT INTO supplier_invoices (
              invoice_number,
              supplier_id,
              purchase_order_id,
              invoice_date,
              due_date,
              subtotal,
              tax_amount,
              total_amount,
              paid_amount,
              status,
              payment_terms,
              notes,
              created_by,
              created_at,
              updated_at
            ) VALUES (
              ${invoiceNumber},
              ${updatedPO[0].supplier_id},
              ${id},
              NOW(),
              ${dueDate.toISOString()},
              ${subtotal},
              ${taxAmount},
              ${totalAmount},
              0,
              'UNPAID',
              30,
              'Auto-generated from PO ' || ${updatedPO[0].order_number},
              ${updatedPO[0].created_by},
              NOW(),
              NOW()
            )
            RETURNING id
          `

          console.log("[v0] Created invoice with ID:", newInvoice[0].id)

          // Create invoice line items
          for (const item of items) {
            await sql`
              INSERT INTO supplier_invoice_items (
                invoice_id,
                inventory_item_id,
                description,
                quantity,
                unit_cost,
                total_amount,
                created_at
              ) VALUES (
                ${newInvoice[0].id},
                ${item.inventory_item_id},
                ${item.item_name || "Item"},
                ${item.quantity},
                ${item.unit_cost},
                ${item.total_cost},
                NOW()
              )
            `
          }

          console.log("[v0] Created invoice line items:", items.length)

          // Log the activity
          try {
            await sql`
              INSERT INTO admin_logs (
                admin_id,
                action,
                resource_type,
                resource_id,
                new_values,
                ip_address,
                created_at
              ) VALUES (
                ${updatedPO[0].created_by},
                'CREATE',
                'supplier_invoice',
                ${newInvoice[0].id},
                jsonb_build_object(
                  'invoice_number', ${invoiceNumber},
                  'purchase_order', ${updatedPO[0].order_number},
                  'total_amount', ${totalAmount}
                ),
                '127.0.0.1',
                NOW()
              )
            `
          } catch (logError) {
            console.log("[v0] Failed to log activity:", logError)
          }

          console.log("[v0] Successfully created supplier invoice:", invoiceNumber)
        } else {
          console.log("[v0] Invoice already exists for this PO, skipping creation")
        }
      } catch (invoiceError) {
        console.error("[v0] Error creating supplier invoice:", invoiceError)
        // Don't fail the entire request if invoice creation fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Purchase order ${status.toLowerCase()} successfully`,
      purchase_order: updatedPO[0],
    })
  } catch (error) {
    console.error("Error updating purchase order:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update purchase order",
      },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

// Get all goods receiving records
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "all"
    const poId = searchParams.get("po_id")

    let query = `
      SELECT 
        gr.*,
        po.po_number,
        s.company_name as supplier_name,
        COUNT(gri.id) as total_items,
        COALESCE(SUM(gri.expected_quantity), 0) as total_expected,
        COALESCE(SUM(gri.received_quantity), 0) as total_received
      FROM goods_receiving gr
      LEFT JOIN purchase_orders po ON gr.purchase_order_id = po.id
      LEFT JOIN suppliers s ON gr.supplier_id = s.id
      LEFT JOIN goods_receiving_items gri ON gr.id = gri.goods_receiving_id
      WHERE 1=1
    `

    const params = []
    let paramIndex = 1

    if (status !== "all") {
      query += ` AND gr.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (poId) {
      query += ` AND gr.purchase_order_id = $${paramIndex}`
      params.push(poId)
      paramIndex++
    }

    query += `
      GROUP BY gr.id, po.po_number, s.company_name
      ORDER BY gr.received_date DESC
    `

    const result = await sql.query(query, params)

    const receivingRecords = result.rows.map((gr: any) => ({
      id: gr.id,
      receiving_number: gr.receiving_number,
      purchase_order_id: gr.purchase_order_id,
      po_number: gr.po_number,
      supplier_id: gr.supplier_id,
      supplier_name: gr.supplier_name,
      received_date: gr.received_date,
      received_by: gr.received_by,
      delivery_note_number: gr.delivery_note_number,
      condition_notes: gr.condition_notes,
      status: gr.status,
      total_items_expected: Number(gr.total_items_expected),
      total_items_received: Number(gr.total_items_received),
      total_expected: Number(gr.total_expected),
      total_received: Number(gr.total_received),
      created_at: gr.created_at,
      updated_at: gr.updated_at,
    }))

    return NextResponse.json({
      success: true,
      receiving_records: receivingRecords,
    })
  } catch (error) {
    console.error("Error fetching goods receiving records:", error)
    return NextResponse.json({ error: "Failed to fetch goods receiving records" }, { status: 500 })
  }
}

// Create goods receiving record
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    console.log("[v0] Creating goods receiving record with data:", data)

    const result = await sql.begin(async (sql) => {
      // Generate receiving number
      const receivingNumber = `GR${Date.now().toString().slice(-8)}`

      console.log("[v0] Generated receiving number:", receivingNumber)

      // Create goods receiving record
      const goodsReceiving = await sql`
        INSERT INTO goods_receiving (
          receiving_number, purchase_order_id, supplier_id, received_date,
          received_by, delivery_note_number, condition_notes, status,
          total_items_expected, total_items_received
        ) VALUES (
          ${receivingNumber}, ${data.purchase_order_id}, ${data.supplier_id},
          ${data.received_date}, ${data.received_by || 1}, ${data.delivery_note_number || null},
          ${data.condition_notes || null}, ${data.status || "pending"},
          ${data.total_items_expected || 0}, ${data.total_items_received || 0}
        )
        RETURNING *
      `

      const grId = goodsReceiving[0].id
      console.log("[v0] Created goods receiving record with ID:", grId)

      let invoiceTotal = 0
      const invoiceItems = []

      // Add received items and update inventory
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          // Create receiving item record
          await sql`
            INSERT INTO goods_receiving_items (
              goods_receiving_id, purchase_order_item_id, inventory_item_id,
              expected_quantity, received_quantity, unit_cost, total_cost,
              condition_status, batch_number, expiry_date, notes
            ) VALUES (
              ${grId}, ${item.purchase_order_item_id || null}, ${item.inventory_item_id},
              ${item.expected_quantity}, ${item.received_quantity}, ${item.unit_cost},
              ${item.total_cost}, ${item.condition_status || "good"},
              ${item.batch_number || null}, ${item.expiry_date || null}, ${item.notes || null}
            )
          `

          if (item.received_quantity > 0) {
            invoiceTotal += Number(item.total_cost || 0)
            invoiceItems.push({
              inventory_item_id: item.inventory_item_id,
              item_name: item.item_name || "Item",
              quantity: item.received_quantity,
              unit_price: item.unit_cost,
              total_price: item.total_cost,
            })
          }

          // Update inventory stock if condition is good
          if (item.condition_status === "good" && item.received_quantity > 0) {
            await sql`
              UPDATE inventory_items 
              SET stock_quantity = stock_quantity + ${item.received_quantity}
              WHERE id = ${item.inventory_item_id}
            `

            // Record inventory movement
            await sql`
              INSERT INTO inventory_movements (
                inventory_item_id, movement_type, quantity, unit_price, total_value,
                reference_type, reference_id, reason, performed_by
              ) VALUES (
                ${item.inventory_item_id}, 'in', ${item.received_quantity},
                ${item.unit_cost}, ${item.total_cost}, 'goods_receiving', ${grId},
                'Stock received from supplier', ${data.received_by || 1}
              )
            `
          }

          // Update purchase order item received quantity
          if (item.purchase_order_item_id) {
            await sql`
              UPDATE purchase_order_items 
              SET received_quantity = received_quantity + ${item.received_quantity}
              WHERE id = ${item.purchase_order_item_id}
            `
          }
        }
      }

      if (invoiceItems.length > 0 && invoiceTotal > 0) {
        console.log("[v0] Creating supplier invoice for goods receiving:", grId)
        console.log("[v0] Invoice total:", invoiceTotal)
        console.log("[v0] Invoice items count:", invoiceItems.length)

        // Generate invoice number
        const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`

        // Get purchase order details for invoice
        const poDetails = await sql`
          SELECT po_number FROM purchase_orders WHERE id = ${data.purchase_order_id}
        `
        const poNumber = poDetails[0]?.po_number || "N/A"

        // Calculate tax (16% VAT)
        const taxRate = 0.16
        const subtotal = invoiceTotal
        const taxAmount = subtotal * taxRate
        const totalAmount = subtotal + taxAmount

        // Calculate due date (30 days from received date)
        const dueDate = new Date(data.received_date)
        dueDate.setDate(dueDate.getDate() + 30)

        // Create supplier invoice
        const invoice = await sql`
          INSERT INTO supplier_invoices (
            invoice_number, supplier_id, purchase_order_id, goods_receiving_id,
            invoice_date, due_date, subtotal, tax_rate, tax_amount, total_amount,
            amount_paid, status, notes
          ) VALUES (
            ${invoiceNumber}, ${data.supplier_id}, ${data.purchase_order_id}, ${grId},
            ${data.received_date}, ${dueDate.toISOString()}, ${subtotal}, ${taxRate},
            ${taxAmount}, ${totalAmount}, 0, 'UNPAID',
            ${"Invoice automatically generated for goods receiving " + receivingNumber + " (PO: " + poNumber + ")"}
          )
          RETURNING *
        `

        const invoiceId = invoice[0].id
        console.log("[v0] Created supplier invoice with ID:", invoiceId)

        // Create invoice items
        for (const item of invoiceItems) {
          await sql`
            INSERT INTO supplier_invoice_items (
              invoice_id, inventory_item_id, item_name, quantity, unit_price, total_price
            ) VALUES (
              ${invoiceId}, ${item.inventory_item_id}, ${item.item_name},
              ${item.quantity}, ${item.unit_price}, ${item.total_price}
            )
          `
        }

        console.log("[v0] Created invoice items for invoice:", invoiceId)

        // Log the invoice creation
        await sql`
          INSERT INTO admin_logs (
            user_id, action, details, ip_address, user_agent
          ) VALUES (
            ${data.received_by || 1}, 'create_supplier_invoice',
            ${"Automatically created supplier invoice " + invoiceNumber + " for goods receiving " + receivingNumber},
            '', ''
          )
        `

        console.log("[v0] Logged invoice creation activity")
      }

      return goodsReceiving[0]
    })

    console.log("[v0] Goods receiving and invoice creation completed successfully")

    return NextResponse.json({
      success: true,
      message: "Goods receiving record and supplier invoice created successfully",
      goods_receiving: result,
    })
  } catch (error) {
    console.error("[v0] Error creating goods receiving record:", error)
    return NextResponse.json({ error: "Failed to create goods receiving record" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { items, user_id, serial_numbers } = await request.json()
    const purchaseOrderId = Number.parseInt(params.id)

    console.log("[v0] ===== RECEIVING PURCHASE ORDER =====")
    console.log("[v0] Purchase Order ID:", purchaseOrderId)
    console.log("[v0] Items to receive:", items)
    console.log("[v0] Serial numbers provided:", serial_numbers)

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: "Items array is required" }, { status: 400 })
    }

    const [purchaseOrder] = await sql`
      SELECT po.*, s.company_name as supplier_name, s.payment_terms, s.id as supplier_uuid
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = ${purchaseOrderId}
    `

    console.log("[v0] Purchase Order found:", {
      id: purchaseOrder?.id,
      order_number: purchaseOrder?.order_number,
      supplier_id: purchaseOrder?.supplier_id,
      supplier_name: purchaseOrder?.supplier_name,
      status: purchaseOrder?.status,
    })

    if (!purchaseOrder) {
      return NextResponse.json({ success: false, error: "Purchase order not found" }, { status: 404 })
    }

    if (purchaseOrder.status !== "APPROVED" && purchaseOrder.status !== "approved") {
      return NextResponse.json(
        { success: false, error: "Purchase order must be approved before receiving items" },
        { status: 400 },
      )
    }

    let totalReceivedValue = 0
    const itemsRequiringSerialNumbers: any[] = []

    for (const item of items) {
      const { purchase_order_item_id, quantity_received } = item

      if (!purchase_order_item_id || !quantity_received || quantity_received <= 0) {
        continue
      }

      // Update purchase order item
      const [updatedPOItem] = await sql`
        UPDATE purchase_order_items 
        SET 
          quantity_received = ${quantity_received},
          updated_at = NOW()
        WHERE id = ${purchase_order_item_id}
        RETURNING *
      `

      if (updatedPOItem) {
        const [inventoryItem] = await sql`
          SELECT requires_serial_number, name, sku
          FROM inventory_items
          WHERE id = ${updatedPOItem.inventory_item_id}
        `

        if (inventoryItem?.requires_serial_number) {
          itemsRequiringSerialNumbers.push({
            inventory_item_id: updatedPOItem.inventory_item_id,
            item_name: inventoryItem.name,
            sku: inventoryItem.sku,
            quantity_received,
          })
        }

        if (serial_numbers && serial_numbers[updatedPOItem.inventory_item_id]) {
          const itemSerialNumbers = serial_numbers[updatedPOItem.inventory_item_id]

          for (const serialNumber of itemSerialNumbers) {
            if (serialNumber && serialNumber.trim()) {
              try {
                await sql`
                  INSERT INTO inventory_serial_numbers (
                    inventory_item_id,
                    serial_number,
                    purchase_order_id,
                    supplier_id,
                    received_date,
                    status,
                    created_at
                  ) VALUES (
                    ${updatedPOItem.inventory_item_id},
                    ${serialNumber.trim()},
                    ${purchaseOrderId},
                    ${purchaseOrder.supplier_id},
                    CURRENT_DATE,
                    'in_stock',
                    NOW()
                  )
                `
                console.log("[v0] Recorded serial number:", serialNumber)
              } catch (error) {
                console.error("[v0] Error recording serial number:", serialNumber, error)
                // Continue with other serial numbers even if one fails
              }
            }
          }
        }

        // Update inventory stock
        await sql`
          UPDATE inventory_items 
          SET 
            stock_quantity = COALESCE(stock_quantity, 0) + ${quantity_received},
            updated_at = NOW()
          WHERE id = ${updatedPOItem.inventory_item_id}
        `

        // Record inventory movement
        await sql`
          INSERT INTO inventory_movements (
            item_id,
            movement_type, 
            quantity, 
            reference_type, 
            reference_number,
            notes,
            created_by,
            created_at
          ) VALUES (
            ${updatedPOItem.inventory_item_id}, 
            'RECEIVED', 
            ${quantity_received}, 
            'purchase_order', 
            ${purchaseOrder.order_number},
            'Stock received from purchase order', 
            ${user_id || 1},
            NOW()
          )
        `

        totalReceivedValue += quantity_received * updatedPOItem.unit_cost
      }
    }

    await sql`
      UPDATE purchase_orders 
      SET 
        status = 'RECEIVED',
        updated_at = NOW()
      WHERE id = ${purchaseOrderId}
    `

    const invoiceNumber = `SINV-${new Date().getFullYear()}-${String(purchaseOrderId).padStart(6, "0")}`
    const paymentTerms = purchaseOrder.payment_terms || 30
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + paymentTerms)

    const taxRate = 0.16 // 16% VAT
    const subtotal = totalReceivedValue
    const taxAmount = subtotal * taxRate
    const totalAmount = subtotal + taxAmount

    console.log("[v0] ===== CREATING SUPPLIER INVOICE =====")
    console.log("[v0] Invoice Number:", invoiceNumber)
    console.log("[v0] Supplier ID:", purchaseOrder.supplier_id)
    console.log("[v0] Supplier Name:", purchaseOrder.supplier_name)
    console.log("[v0] Purchase Order ID:", purchaseOrderId)
    console.log("[v0] Subtotal:", subtotal)
    console.log("[v0] Tax Amount:", taxAmount)
    console.log("[v0] Total Amount:", totalAmount)
    console.log("[v0] Due Date:", dueDate.toISOString().split("T")[0])

    const [supplierInvoice] = await sql`
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
        created_at
      ) VALUES (
        ${invoiceNumber},
        ${purchaseOrder.supplier_id},
        ${purchaseOrderId},
        CURRENT_DATE,
        ${dueDate.toISOString().split("T")[0]},
        ${subtotal},
        ${taxAmount},
        ${totalAmount},
        0,
        'UNPAID',
        ${paymentTerms},
        'Auto-generated from PO ' || ${purchaseOrder.order_number},
        ${user_id || 1},
        NOW()
      )
      RETURNING id, invoice_number, supplier_id
    `

    console.log("[v0] ===== SUPPLIER INVOICE CREATED =====")
    console.log("[v0] Invoice ID:", supplierInvoice.id)
    console.log("[v0] Invoice Number:", supplierInvoice.invoice_number)
    console.log("[v0] Linked to Supplier ID:", supplierInvoice.supplier_id)

    console.log("[v0] Creating invoice items...")
    let itemsCreated = 0

    for (const item of items) {
      const { purchase_order_item_id, quantity_received } = item

      if (!purchase_order_item_id || !quantity_received || quantity_received <= 0) {
        continue
      }

      const [poItem] = await sql`
        SELECT poi.*, ii.name as item_name, ii.description
        FROM purchase_order_items poi
        LEFT JOIN inventory_items ii ON poi.inventory_item_id = ii.id
        WHERE poi.id = ${purchase_order_item_id}
      `

      if (poItem) {
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
            ${supplierInvoice.id},
            ${poItem.inventory_item_id},
            ${poItem.item_name || poItem.description || "Item"},
            ${quantity_received},
            ${poItem.unit_cost},
            ${quantity_received * poItem.unit_cost},
            NOW()
          )
        `
        itemsCreated++
        console.log("[v0] Created invoice item:", {
          item_name: poItem.item_name,
          quantity: quantity_received,
          unit_cost: poItem.unit_cost,
        })
      }
    }

    console.log("[v0] ===== INVOICE GENERATION COMPLETE =====")
    console.log("[v0] Total invoice items created:", itemsCreated)
    console.log("[v0] Purchase order received and invoice generated successfully")

    return NextResponse.json({
      success: true,
      message: "Purchase order received and invoice generated successfully",
      data: {
        purchase_order_id: purchaseOrderId,
        invoice_id: supplierInvoice.id,
        invoice_number: invoiceNumber,
        supplier_id: purchaseOrder.supplier_id,
        supplier_name: purchaseOrder.supplier_name,
        total_received_value: totalReceivedValue,
        total_invoice_amount: totalAmount,
        items_processed: items.length,
        invoice_items_created: itemsCreated,
        items_requiring_serial_numbers: itemsRequiringSerialNumbers,
      },
    })
  } catch (error) {
    console.error("[v0] ===== ERROR RECEIVING PURCHASE ORDER =====")
    console.error("[v0] Error details:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to receive purchase order",
      },
      { status: 500 },
    )
  }
}

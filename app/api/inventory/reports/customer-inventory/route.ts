import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = "force-dynamic"

// Customer Inventory Report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customer_id")
    const status = searchParams.get("status") || "all"
    const equipmentType = searchParams.get("equipment_type")
    const format = searchParams.get("format") || "json"

    let query = `
      SELECT 
        c.id as customer_id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.customer_type,
        c.status as customer_status,
        ce.id as equipment_id,
        ce.equipment_name,
        ce.equipment_type,
        ce.serial_number,
        ce.mac_address,
        ce.quantity,
        ce.unit_price,
        ce.total_price,
        ce.issued_date,
        ce.return_date,
        ce.status as equipment_status,
        ce.condition_notes,
        ce.warranty_expiry,
        ce.installation_date,
        ce.maintenance_due_date,
        ce.replacement_due_date,
        ce.condition_rating,
        ii.name as inventory_item_name,
        ii.category,
        ii.sku,
        sp.name as service_plan_name,
        cs.status as service_status
      FROM customers c
      LEFT JOIN customer_equipment ce ON c.id = ce.customer_id
      LEFT JOIN inventory_items ii ON ce.inventory_item_id = ii.id
      LEFT JOIN customer_services cs ON c.id = cs.customer_id AND cs.status = 'active'
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE c.status != 'deleted'
    `

    const params = []
    let paramIndex = 1

    if (customerId) {
      query += ` AND c.id = $${paramIndex}`
      params.push(customerId)
      paramIndex++
    }

    if (status !== "all") {
      query += ` AND ce.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (equipmentType) {
      query += ` AND ce.equipment_type = $${paramIndex}`
      params.push(equipmentType)
      paramIndex++
    }

    query += ` ORDER BY c.last_name, c.first_name, ce.issued_date DESC`

    const result = await sql.query(query, params)

    // Group by customer
    const customerMap = new Map()

    result.rows.forEach((row: any) => {
      const customerId = row.customer_id

      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customer_id: customerId,
          customer_name: `${row.first_name} ${row.last_name}`,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          phone: row.phone,
          customer_type: row.customer_type,
          customer_status: row.customer_status,
          service_plan_name: row.service_plan_name,
          service_status: row.service_status,
          equipment: [],
          summary: {
            total_equipment: 0,
            issued_equipment: 0,
            returned_equipment: 0,
            damaged_equipment: 0,
            total_value: 0,
            maintenance_due_count: 0,
            replacement_due_count: 0,
          },
        })
      }

      const customer = customerMap.get(customerId)

      if (row.equipment_id) {
        const equipment = {
          equipment_id: row.equipment_id,
          equipment_name: row.equipment_name,
          equipment_type: row.equipment_type,
          serial_number: row.serial_number,
          mac_address: row.mac_address,
          quantity: Number(row.quantity),
          unit_price: Number(row.unit_price),
          total_price: Number(row.total_price),
          issued_date: row.issued_date,
          return_date: row.return_date,
          equipment_status: row.equipment_status,
          condition_notes: row.condition_notes,
          warranty_expiry: row.warranty_expiry,
          installation_date: row.installation_date,
          maintenance_due_date: row.maintenance_due_date,
          replacement_due_date: row.replacement_due_date,
          condition_rating: row.condition_rating,
          inventory_item_name: row.inventory_item_name,
          category: row.category,
          sku: row.sku,
          days_in_use: row.issued_date
            ? Math.floor((new Date().getTime() - new Date(row.issued_date).getTime()) / (1000 * 60 * 60 * 24))
            : 0,
          maintenance_overdue: row.maintenance_due_date ? new Date(row.maintenance_due_date) < new Date() : false,
          replacement_overdue: row.replacement_due_date ? new Date(row.replacement_due_date) < new Date() : false,
        }

        customer.equipment.push(equipment)

        // Update summary
        customer.summary.total_equipment += 1
        customer.summary.total_value += equipment.total_price

        if (equipment.equipment_status === "issued") customer.summary.issued_equipment += 1
        if (equipment.equipment_status === "returned") customer.summary.returned_equipment += 1
        if (equipment.equipment_status === "damaged") customer.summary.damaged_equipment += 1
        if (equipment.maintenance_overdue) customer.summary.maintenance_due_count += 1
        if (equipment.replacement_overdue) customer.summary.replacement_due_count += 1
      }
    })

    const customers = Array.from(customerMap.values())

    // Get equipment type summary
    const equipmentTypeSummary = await sql`
      SELECT 
        ce.equipment_type,
        COUNT(*) as total_count,
        COUNT(CASE WHEN ce.status = 'issued' THEN 1 END) as issued_count,
        COUNT(CASE WHEN ce.status = 'returned' THEN 1 END) as returned_count,
        COUNT(CASE WHEN ce.status = 'damaged' THEN 1 END) as damaged_count,
        SUM(ce.total_price) as total_value,
        COUNT(CASE WHEN ce.maintenance_due_date < CURRENT_DATE THEN 1 END) as maintenance_overdue_count
      FROM customer_equipment ce
      JOIN customers c ON ce.customer_id = c.id
      WHERE c.status != 'deleted'
      ${customerId ? `AND c.id = ${customerId}` : ""}
      ${status !== "all" ? `AND ce.status = '${status}'` : ""}
      ${equipmentType ? `AND ce.equipment_type = '${equipmentType}'` : ""}
      GROUP BY ce.equipment_type
      ORDER BY total_count DESC
    `

    const reportData = {
      report_title: "Customer Inventory Report",
      generated_at: new Date().toISOString(),
      filters: {
        customer_id: customerId,
        status,
        equipment_type: equipmentType,
      },
      summary: {
        total_customers: customers.length,
        customers_with_equipment: customers.filter((c) => c.equipment.length > 0).length,
        total_equipment_items: customers.reduce((sum, c) => sum + c.summary.total_equipment, 0),
        total_equipment_value: customers.reduce((sum, c) => sum + c.summary.total_value, 0),
        issued_equipment: customers.reduce((sum, c) => sum + c.summary.issued_equipment, 0),
        maintenance_due_items: customers.reduce((sum, c) => sum + c.summary.maintenance_due_count, 0),
        replacement_due_items: customers.reduce((sum, c) => sum + c.summary.replacement_due_count, 0),
      },
      equipment_type_breakdown: equipmentTypeSummary.map((type: any) => ({
        equipment_type: type.equipment_type,
        total_count: Number(type.total_count),
        issued_count: Number(type.issued_count),
        returned_count: Number(type.returned_count),
        damaged_count: Number(type.damaged_count),
        total_value: Number(type.total_value),
        maintenance_overdue_count: Number(type.maintenance_overdue_count),
      })),
      customers,
    }

    if (format === "csv") {
      const csvHeaders = [
        "Customer Name",
        "Email",
        "Phone",
        "Customer Type",
        "Equipment Name",
        "Equipment Type",
        "Serial Number",
        "Status",
        "Issued Date",
        "Total Value",
        "Condition Rating",
        "Maintenance Due",
        "Service Plan",
      ]

      const csvRows = []
      customers.forEach((customer) => {
        if (customer.equipment.length === 0) {
          csvRows.push([
            customer.customer_name,
            customer.email,
            customer.phone,
            customer.customer_type,
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            customer.service_plan_name || "",
          ])
        } else {
          customer.equipment.forEach((equipment) => {
            csvRows.push([
              customer.customer_name,
              customer.email,
              customer.phone,
              customer.customer_type,
              equipment.equipment_name,
              equipment.equipment_type,
              equipment.serial_number || "",
              equipment.equipment_status,
              equipment.issued_date || "",
              equipment.total_price,
              equipment.condition_rating || "",
              equipment.maintenance_due_date || "",
              customer.service_plan_name || "",
            ])
          })
        }
      })

      const csvContent = [csvHeaders, ...csvRows].map((row) => row.join(",")).join("\n")

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=customer-inventory-report.csv",
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: reportData,
    })
  } catch (error) {
    console.error("Error generating customer inventory report:", error)
    return NextResponse.json({ error: "Failed to generate customer inventory report" }, { status: 500 })
  }
}

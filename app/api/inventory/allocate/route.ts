import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

// Automatic Equipment Allocation API
export async function POST(request: Request) {
  try {
    const { customer_id, service_plan_id, equipment_requirements, allocation_type = "automatic" } = await request.json()

    if (!customer_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer ID is required",
        },
        { status: 400 },
      )
    }

    const result = await sql.begin(async (sql) => {
      // Get customer and service plan details
      const customerService = await sql`
        SELECT 
          c.id as customer_id,
          c.first_name,
          c.last_name,
          c.email,
          cs.id as service_id,
          sp.name as plan_name,
          sp.category as plan_category,
          sp.download_speed,
          sp.upload_speed
        FROM customers c
        LEFT JOIN customer_services cs ON c.id = cs.customer_id AND cs.status = 'active'
        LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
        WHERE c.id = ${customer_id}
        LIMIT 1
      `

      if (customerService.length === 0) {
        throw new Error("Customer not found")
      }

      const customer = customerService[0]

      // Determine equipment requirements based on service plan
      let requiredEquipment = equipment_requirements || []

      if (requiredEquipment.length === 0) {
        // Auto-determine equipment based on plan category and speed
        if (customer.plan_category === "business" || customer.download_speed >= 100) {
          requiredEquipment = [
            { category: "Network Equipment", type: "router", quantity: 1, priority: "high" },
            { category: "Network Equipment", type: "switch", quantity: 1, priority: "medium" },
            { category: "Cables", type: "ethernet", quantity: 2, priority: "high" },
          ]
        } else if (customer.plan_category === "residential") {
          requiredEquipment = [
            { category: "Network Equipment", type: "router", quantity: 1, priority: "high" },
            { category: "Cables", type: "ethernet", quantity: 1, priority: "medium" },
          ]
        } else {
          requiredEquipment = [{ category: "Network Equipment", type: "router", quantity: 1, priority: "high" }]
        }
      }

      const allocatedEquipment = []
      const allocationErrors = []

      // Allocate each required equipment item
      for (const requirement of requiredEquipment) {
        try {
          // Find available equipment matching requirements
          const availableItems = await sql`
            SELECT 
              id, name, category, sku, stock_quantity, unit_cost, location, specifications
            FROM inventory_items
            WHERE category = ${requirement.category}
            AND stock_quantity >= ${requirement.quantity}
            AND status = 'active'
            AND (
              LOWER(name) LIKE ${`%${requirement.type}%`} OR
              LOWER(description) LIKE ${`%${requirement.type}%`}
            )
            ORDER BY stock_quantity DESC, unit_cost ASC
            LIMIT 1
          `

          if (availableItems.length === 0) {
            allocationErrors.push(`No available ${requirement.type} in ${requirement.category}`)
            continue
          }

          const item = availableItems[0]

          // Allocate equipment to customer
          const equipmentAllocation = await sql`
            INSERT INTO customer_equipment (
              customer_id, inventory_item_id, equipment_name, equipment_type,
              quantity, unit_price, total_price, status, condition_notes
            )
            VALUES (
              ${customer_id}, ${item.id}, ${item.name}, ${requirement.type},
              ${requirement.quantity}, ${item.unit_cost}, ${item.unit_cost * requirement.quantity},
              'allocated', 'New equipment allocated automatically'
            )
            RETURNING *
          `

          // Update inventory stock
          await sql`
            UPDATE inventory_items 
            SET stock_quantity = stock_quantity - ${requirement.quantity}
            WHERE id = ${item.id}
          `

          // Record inventory movement
          await sql`
            INSERT INTO inventory_movements (
              inventory_item_id, movement_type, quantity, reference_type, reference_id,
              unit_price, total_value, notes, performed_by
            )
            VALUES (
              ${item.id}, 'out', ${requirement.quantity}, 'customer_allocation', ${customer_id},
              ${item.unit_cost}, ${item.unit_cost * requirement.quantity},
              'Automatic allocation for customer service activation', 1
            )
          `

          allocatedEquipment.push({
            equipment_id: equipmentAllocation[0].id,
            item_id: item.id,
            name: item.name,
            type: requirement.type,
            quantity: requirement.quantity,
            unit_cost: item.unit_cost,
            total_cost: item.unit_cost * requirement.quantity,
            sku: item.sku,
            location: item.location,
          })
        } catch (error) {
          allocationErrors.push(`Failed to allocate ${requirement.type}: ${error.message}`)
        }
      }

      // Log the allocation activity
      await sql`
        INSERT INTO system_logs (
          level, source, category, message, details, customer_id
        )
        VALUES (
          ${allocationErrors.length > 0 ? "WARNING" : "INFO"}, 
          'Inventory Management', 'equipment_allocation',
          ${allocationErrors.length > 0 ? "Equipment allocation completed with errors" : "Equipment allocation successful"},
          ${JSON.stringify({
            allocated_items: allocatedEquipment.length,
            total_value: allocatedEquipment.reduce((sum, item) => sum + item.total_cost, 0),
            errors: allocationErrors,
            allocation_type,
          })},
          ${customer_id}
        )
      `

      return {
        customer: {
          id: customer.customer_id,
          name: `${customer.first_name} ${customer.last_name}`,
          email: customer.email,
          service_id: customer.service_id,
          plan: customer.plan_name,
        },
        allocated_equipment: allocatedEquipment,
        allocation_errors: allocationErrors,
        total_allocated: allocatedEquipment.length,
        total_value: allocatedEquipment.reduce((sum, item) => sum + item.total_cost, 0),
      }
    })

    return NextResponse.json({
      success: true,
      message: "Equipment allocation completed",
      data: result,
    })
  } catch (error) {
    console.error("Equipment allocation error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to allocate equipment",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

// Get allocation recommendations
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customer_id")
    const planId = searchParams.get("plan_id")

    if (!customerId && !planId) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer ID or Plan ID required",
        },
        { status: 400 },
      )
    }

    let planDetails = null

    if (planId) {
      const planResult = await sql`
        SELECT name, category, download_speed, upload_speed, features
        FROM service_plans 
        WHERE id = ${planId}
      `
      planDetails = planResult[0]
    } else if (customerId) {
      const customerPlan = await sql`
        SELECT sp.name, sp.category, sp.download_speed, sp.upload_speed, sp.features
        FROM customers c
        JOIN customer_services cs ON c.id = cs.customer_id
        JOIN service_plans sp ON cs.service_plan_id = sp.id
        WHERE c.id = ${customerId} AND cs.status = 'active'
      `
      planDetails = customerPlan[0]
    }

    if (!planDetails) {
      return NextResponse.json(
        {
          success: false,
          error: "Service plan not found",
        },
        { status: 404 },
      )
    }

    // Generate equipment recommendations based on plan
    const recommendations = []

    // Router recommendations
    if (planDetails.category === "business" || planDetails.download_speed >= 100) {
      recommendations.push({
        category: "Network Equipment",
        type: "enterprise_router",
        name: "Enterprise Router",
        quantity: 1,
        priority: "high",
        reason: "High-speed business plan requires enterprise-grade router",
      })
    } else {
      recommendations.push({
        category: "Network Equipment",
        type: "router",
        name: "Standard Router",
        quantity: 1,
        priority: "high",
        reason: "Basic router for residential service",
      })
    }

    // Additional equipment based on speed
    if (planDetails.download_speed >= 500) {
      recommendations.push({
        category: "Network Equipment",
        type: "switch",
        name: "Gigabit Switch",
        quantity: 1,
        priority: "medium",
        reason: "High-speed connection benefits from dedicated switch",
      })
    }

    // Cables
    recommendations.push({
      category: "Cables",
      type: "ethernet",
      name: "Ethernet Cable",
      quantity: planDetails.category === "business" ? 3 : 1,
      priority: "high",
      reason: "Essential for wired connections",
    })

    // Check availability for each recommendation
    for (const rec of recommendations) {
      const available = await sql`
        SELECT COUNT(*) as available_count, MIN(unit_cost) as min_cost
        FROM inventory_items
        WHERE category = ${rec.category}
        AND stock_quantity >= ${rec.quantity}
        AND status = 'active'
        AND (LOWER(name) LIKE ${`%${rec.type}%`} OR LOWER(description) LIKE ${`%${rec.type}%`})
      `

      rec.available = Number(available[0].available_count) > 0
      rec.estimated_cost = Number(available[0].min_cost) * rec.quantity || 0
    }

    return NextResponse.json({
      success: true,
      plan: planDetails,
      recommendations,
      total_estimated_cost: recommendations.reduce((sum, rec) => sum + rec.estimated_cost, 0),
    })
  } catch (error) {
    console.error("Equipment recommendation error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate equipment recommendations",
      },
      { status: 500 },
    )
  }
}

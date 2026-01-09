import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const validationResults = {
      orphanedServices: [],
      customersWithoutServices: [],
      invalidServicePlans: [],
      relationshipHealth: "unknown",
    }

    // Check for orphaned customer_services records
    const orphanedServices = await sql`
      SELECT 
        cs.id,
        cs.customer_id,
        cs.service_plan_id,
        'missing_customer' as issue_type
      FROM customer_services cs
      LEFT JOIN customers c ON cs.customer_id = c.id
      WHERE c.id IS NULL
      
      UNION ALL
      
      SELECT 
        cs.id,
        cs.customer_id,
        cs.service_plan_id,
        'missing_service_plan' as issue_type
      FROM customer_services cs
      LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
      WHERE sp.id IS NULL
    `

    // Check for active customers without any services
    const customersWithoutServices = await sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.email,
        c.status
      FROM customers c
      LEFT JOIN customer_services cs ON c.id = cs.customer_id
      WHERE cs.id IS NULL 
        AND c.status = 'active'
    `

    // Check for service plans with no active customers
    const unusedServicePlans = await sql`
      SELECT 
        sp.id,
        sp.name,
        sp.price,
        sp.status
      FROM service_plans sp
      LEFT JOIN customer_services cs ON sp.id = cs.service_plan_id AND cs.status = 'active'
      WHERE cs.id IS NULL 
        AND sp.status = 'active'
    `

    // Check for data type mismatches
    const dataTypeMismatches = await sql`
      SELECT 
        column_name,
        data_type,
        table_name
      FROM information_schema.columns 
      WHERE table_name IN ('customers', 'customer_services', 'service_plans')
        AND column_name IN ('id', 'customer_id', 'service_plan_id')
      ORDER BY table_name, column_name
    `

    validationResults.orphanedServices = orphanedServices
    validationResults.customersWithoutServices = customersWithoutServices
    validationResults.invalidServicePlans = unusedServicePlans

    // Calculate relationship health score
    const totalIssues = orphanedServices.length + customersWithoutServices.length
    const healthScore = totalIssues === 0 ? 100 : Math.max(0, 100 - totalIssues * 10)

    validationResults.relationshipHealth = healthScore >= 90 ? "healthy" : healthScore >= 70 ? "warning" : "critical"

    return NextResponse.json({
      success: true,
      data: validationResults,
      summary: {
        orphanedServices: orphanedServices.length,
        customersWithoutServices: customersWithoutServices.length,
        unusedServicePlans: unusedServicePlans.length,
        healthScore,
        dataTypes: dataTypeMismatches,
      },
    })
  } catch (error) {
    console.error("[v0] Relationship validation error:", error)
    return NextResponse.json({ success: false, error: "Failed to validate customer relationships" }, { status: 500 })
  }
}

export async function POST() {
  try {
    const fixes = []

    // Remove orphaned customer_services records
    const orphanedCustomerServices = await sql`
      DELETE FROM customer_services 
      WHERE customer_id NOT IN (SELECT id FROM customers)
      RETURNING id
    `

    if (orphanedCustomerServices.length > 0) {
      fixes.push(`Removed ${orphanedCustomerServices.length} orphaned customer service records`)
    }

    // Remove customer_services with invalid service_plan_id
    const invalidServicePlanRefs = await sql`
      DELETE FROM customer_services 
      WHERE service_plan_id NOT IN (SELECT id FROM service_plans)
      RETURNING id
    `

    if (invalidServicePlanRefs.length > 0) {
      fixes.push(`Removed ${invalidServicePlanRefs.length} services with invalid service plan references`)
    }

    // Add foreign key constraints if missing
    try {
      await sql`
        ALTER TABLE customer_services 
        ADD CONSTRAINT fk_customer_services_customer_id 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      `
      fixes.push("Added foreign key constraint for customer_id")
    } catch (error) {
      // Constraint might already exist
    }

    try {
      await sql`
        ALTER TABLE customer_services 
        ADD CONSTRAINT fk_customer_services_service_plan_id 
        FOREIGN KEY (service_plan_id) REFERENCES service_plans(id)
      `
      fixes.push("Added foreign key constraint for service_plan_id")
    } catch (error) {
      // Constraint might already exist
    }

    return NextResponse.json({
      success: true,
      fixes,
      message: `Applied ${fixes.length} relationship fixes`,
    })
  } catch (error) {
    console.error("[v0] Relationship fix error:", error)
    return NextResponse.json({ success: false, error: "Failed to fix customer relationships" }, { status: 500 })
  }
}

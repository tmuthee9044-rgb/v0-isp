import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  const testResults = []
  let allTestsPassed = true

  try {
    // Test 1: Database Connection
    try {
      await sql`SELECT 1 as test`
      testResults.push("✓ Database connection successful")
    } catch (error) {
      testResults.push(`✗ Database connection failed: ${error}`)
      allTestsPassed = false
    }

    // Test 2: Customer Operations
    try {
      // Create test customer
      const customerResult = await sql`
        INSERT INTO customers (name, email, phone, address, status) 
        VALUES ('Test Customer', 'test@example.com', '+254700000000', 'Test Address', 'active')
        RETURNING id
      `
      const customerId = customerResult[0].id

      // Read customer
      const customer = await sql`SELECT * FROM customers WHERE id = ${customerId}`
      if (customer.length > 0) {
        testResults.push("✓ Customer create and read operations successful")
      }

      // Update customer
      await sql`UPDATE customers SET name = 'Updated Test Customer' WHERE id = ${customerId}`

      // Delete test customer
      await sql`DELETE FROM customers WHERE id = ${customerId}`
      testResults.push("✓ Customer update and delete operations successful")
    } catch (error) {
      testResults.push(`✗ Customer operations failed: ${error}`)
      allTestsPassed = false
    }

    // Test 3: Service Plans Operations
    try {
      // Create test service plan
      const planResult = await sql`
        INSERT INTO service_plans (name, description, speed, price, status) 
        VALUES ('Test Plan', 'Test Description', '10 Mbps', 1000.00, 'active')
        RETURNING id
      `
      const planId = planResult[0].id

      // Read service plan
      const plan = await sql`SELECT * FROM service_plans WHERE id = ${planId}`
      if (plan.length > 0) {
        testResults.push("✓ Service plan operations successful")
      }

      // Delete test service plan
      await sql`DELETE FROM service_plans WHERE id = ${planId}`
    } catch (error) {
      testResults.push(`✗ Service plan operations failed: ${error}`)
      allTestsPassed = false
    }

    // Test 4: Payment Operations
    try {
      // Create test customer for payment
      const customerResult = await sql`
        INSERT INTO customers (first_name, last_name, email, phone, address, status) 
        VALUES ('Payment Test', 'Customer', 'payment@example.com', '+254700000001', 'Test Address', 'active')
        RETURNING id
      `
      const customerId = customerResult[0].id

      // Create test payment
      const paymentResult = await sql`
        INSERT INTO payments (customer_id, amount, payment_method, status, payment_date, notes) 
        VALUES (${customerId}, 1000.00, 'mpesa', 'completed', NOW(), 'Test payment')
        RETURNING id
      `

      if (paymentResult.length > 0) {
        testResults.push("✓ Payment operations successful")
      }

      // Cleanup
      await sql`DELETE FROM payments WHERE customer_id = ${customerId}`
      await sql`DELETE FROM customers WHERE id = ${customerId}`
    } catch (error) {
      testResults.push(`✗ Payment operations failed: ${error}`)
      allTestsPassed = false
    }

    // Test 5: Employee/HR Operations
    try {
      // Create test employee
      const employeeResult = await sql`
        INSERT INTO employees (employee_id, name, email, phone, position, department, salary, hire_date, status) 
        VALUES ('EMP001', 'Test Employee', 'employee@example.com', '+254700000002', 'Developer', 'IT', 50000.00, NOW(), 'active')
        RETURNING id
      `
      const employeeId = employeeResult[0].id

      // Read employee
      const employee = await sql`SELECT * FROM employees WHERE id = ${employeeId}`
      if (employee.length > 0) {
        testResults.push("✓ Employee operations successful")
      }

      // Delete test employee
      await sql`DELETE FROM employees WHERE id = ${employeeId}`
    } catch (error) {
      testResults.push(`✗ Employee operations failed: ${error}`)
      allTestsPassed = false
    }

    // Test 6: Network Device Operations
    try {
      // Create test network device
      const deviceResult = await sql`
        INSERT INTO network_devices (name, type, ip_address, mac_address, location, status) 
        VALUES ('Test Router', 'router', '192.168.1.1', '00:11:22:33:44:55', 'Test Location', 'active')
        RETURNING id
      `
      const deviceId = deviceResult[0].id

      // Read device
      const device = await sql`SELECT * FROM network_devices WHERE id = ${deviceId}`
      if (device.length > 0) {
        testResults.push("✓ Network device operations successful")
      }

      // Delete test device
      await sql`DELETE FROM network_devices WHERE id = ${deviceId}`
    } catch (error) {
      testResults.push(`✗ Network device operations failed: ${error}`)
      allTestsPassed = false
    }

    // Test 7: System Configuration
    try {
      // Test system config operations
      await sql`
        INSERT INTO system_config (key, value, updated_at) 
        VALUES ('test_setting', 'test_value', NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `

      const config = await sql`SELECT * FROM system_config WHERE key = 'test_setting'`
      if (config.length > 0) {
        testResults.push("✓ System configuration operations successful")
      }

      // Cleanup
      await sql`DELETE FROM system_config WHERE key = 'test_setting'`
    } catch (error) {
      testResults.push(`✗ System configuration operations failed: ${error}`)
      allTestsPassed = false
    }

    // Test 8: Table Existence Check
    try {
      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `

      const requiredTables = [
        "customers",
        "service_plans",
        "payments",
        "employees",
        "network_devices",
        "system_config",
        "users",
        "customer_services",
      ]

      const existingTables = tables.map((t) => t.table_name)
      const missingTables = requiredTables.filter((table) => !existingTables.includes(table))

      if (missingTables.length === 0) {
        testResults.push(`✓ All required tables exist (${existingTables.length} tables found)`)
      } else {
        testResults.push(`✗ Missing tables: ${missingTables.join(", ")}`)
        allTestsPassed = false
      }
    } catch (error) {
      testResults.push(`✗ Table existence check failed: ${error}`)
      allTestsPassed = false
    }

    return NextResponse.json({
      success: allTestsPassed,
      message: allTestsPassed ? "All database operations working correctly" : "Some database operations failed",
      results: testResults,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Database test failed: " + (error as Error).message,
        results: testResults,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Database operations test endpoint. Use POST to run tests.",
    availableTests: [
      "Database Connection",
      "Customer CRUD Operations",
      "Service Plan Operations",
      "Payment Processing",
      "Employee/HR Operations",
      "Network Device Management",
      "System Configuration",
      "Table Existence Check",
    ],
  })
}

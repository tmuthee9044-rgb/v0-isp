import { sql } from "@/lib/database"

export class DatabaseUtils {
  // Customer operations
  static async getCustomers(filters?: {
    status?: string
    customerType?: string
    limit?: number
    offset?: number
  }) {
    const { status, customerType, limit = 50, offset = 0 } = filters || {}

    if (status && customerType) {
      return await sql`
        SELECT c.*, 
               COUNT(cs.id) as service_count,
               COALESCE(SUM(p.amount), 0) as total_payments,
               MAX(p.payment_date) as last_payment_date
        FROM customers c
        LEFT JOIN customer_services cs ON c.id = cs.customer_id
        LEFT JOIN payments p ON c.id = p.customer_id
        WHERE c.status = ${status} AND c.customer_type = ${customerType}
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (status) {
      return await sql`
        SELECT c.*, 
               COUNT(cs.id) as service_count,
               COALESCE(SUM(p.amount), 0) as total_payments,
               MAX(p.payment_date) as last_payment_date
        FROM customers c
        LEFT JOIN customer_services cs ON c.id = cs.customer_id
        LEFT JOIN payments p ON c.id = p.customer_id
        WHERE c.status = ${status}
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (customerType) {
      return await sql`
        SELECT c.*, 
               COUNT(cs.id) as service_count,
               COALESCE(SUM(p.amount), 0) as total_payments,
               MAX(p.payment_date) as last_payment_date
        FROM customers c
        LEFT JOIN customer_services cs ON c.id = cs.customer_id
        LEFT JOIN payments p ON c.id = p.customer_id
        WHERE c.customer_type = ${customerType}
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      return await sql`
        SELECT c.*, 
               COUNT(cs.id) as service_count,
               COALESCE(SUM(p.amount), 0) as total_payments,
               MAX(p.payment_date) as last_payment_date
        FROM customers c
        LEFT JOIN customer_services cs ON c.id = cs.customer_id
        LEFT JOIN payments p ON c.id = p.customer_id
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }
  }

  static async getCustomerById(id: number) {
    const result = await sql`
      SELECT c.*,
             json_agg(DISTINCT cs.*) FILTER (WHERE cs.id IS NOT NULL) as services,
             json_agg(DISTINCT p.*) FILTER (WHERE p.id IS NOT NULL) as payments,
             json_agg(DISTINCT ip.*) FILTER (WHERE ip.id IS NOT NULL) as ip_addresses
      FROM customers c
      LEFT JOIN customer_services cs ON c.id = cs.customer_id
      LEFT JOIN payments p ON c.id = p.customer_id
      LEFT JOIN ip_addresses ip ON c.id = ip.customer_id
      WHERE c.id = ${id}
      GROUP BY c.id
    `
    return result[0] || null
  }

  // Employee operations
  static async getEmployees(filters?: { department?: string; status?: string }) {
    const { department, status } = filters || {}

    if (department && status) {
      return await sql`
        SELECT e.*,
               COALESCE(AVG(p.net_pay), 0) as avg_monthly_pay,
               COUNT(lr.id) as leave_requests_count
        FROM employees e
        LEFT JOIN payroll p ON e.id = p.employee_id
        LEFT JOIN leave_requests lr ON e.id = lr.employee_id
        WHERE e.department = ${department} AND e.status = ${status}
        GROUP BY e.id
        ORDER BY e.hire_date DESC
      `
    } else if (department) {
      return await sql`
        SELECT e.*,
               COALESCE(AVG(p.net_pay), 0) as avg_monthly_pay,
               COUNT(lr.id) as leave_requests_count
        FROM employees e
        LEFT JOIN payroll p ON e.id = p.employee_id
        LEFT JOIN leave_requests lr ON e.id = lr.employee_id
        WHERE e.department = ${department}
        GROUP BY e.id
        ORDER BY e.hire_date DESC
      `
    } else if (status) {
      return await sql`
        SELECT e.*,
               COALESCE(AVG(p.net_pay), 0) as avg_monthly_pay,
               COUNT(lr.id) as leave_requests_count
        FROM employees e
        LEFT JOIN payroll p ON e.id = p.employee_id
        LEFT JOIN leave_requests lr ON e.id = lr.employee_id
        WHERE e.status = ${status}
        GROUP BY e.id
        ORDER BY e.hire_date DESC
      `
    } else {
      return await sql`
        SELECT e.*,
               COALESCE(AVG(p.net_pay), 0) as avg_monthly_pay,
               COUNT(lr.id) as leave_requests_count
        FROM employees e
        LEFT JOIN payroll p ON e.id = p.employee_id
        LEFT JOIN leave_requests lr ON e.id = lr.employee_id
        GROUP BY e.id
        ORDER BY e.hire_date DESC
      `
    }
  }

  // Service operations
  static async getServicePlans() {
    return await sql`
      SELECT sp.*,
             COUNT(cs.id) as active_customers,
             COALESCE(SUM(cs.monthly_fee), 0) as monthly_revenue
      FROM service_plans sp
      LEFT JOIN customer_services cs ON sp.id = cs.service_plan_id AND cs.status = 'active'
      GROUP BY sp.id
      ORDER BY sp.created_at DESC
    `
  }

  // Payment operations
  static async getPayments(filters?: {
    customerId?: number
    status?: string
    dateFrom?: string
    dateTo?: string
  }) {
    const { customerId, status, dateFrom, dateTo } = filters || {}

    if (customerId) {
      return await sql`
        SELECT p.*, 
               CONCAT(c.first_name, ' ', c.last_name) as customer_name, 
               c.email as customer_email
        FROM payments p
        JOIN customers c ON p.customer_id = c.id
        WHERE p.customer_id = ${customerId}
        ORDER BY p.payment_date DESC
      `
    } else if (status) {
      return await sql`
        SELECT p.*, 
               CONCAT(c.first_name, ' ', c.last_name) as customer_name, 
               c.email as customer_email
        FROM payments p
        JOIN customers c ON p.customer_id = c.id
        WHERE p.status = ${status}
        ORDER BY p.payment_date DESC
      `
    } else {
      return await sql`
        SELECT p.*, 
               CONCAT(c.first_name, ' ', c.last_name) as customer_name, 
               c.email as customer_email
        FROM payments p
        JOIN customers c ON p.customer_id = c.id
        ORDER BY p.payment_date DESC
      `
    }
  }

  // Support ticket operations
  static async getSupportTickets(filters?: { customerId?: number; status?: string }) {
    const { customerId, status } = filters || {}

    if (customerId) {
      return await sql`
        SELECT st.*, 
               CONCAT(c.first_name, ' ', c.last_name) as customer_name, 
               u.name as assigned_to_name,
               COUNT(tr.id) as response_count
        FROM support_tickets st
        JOIN customers c ON st.customer_id = c.id
        LEFT JOIN users u ON st.assigned_to = u.id
        LEFT JOIN ticket_responses tr ON st.id = tr.ticket_id
        WHERE st.customer_id = ${customerId}
        GROUP BY st.id, c.first_name, c.last_name, u.name
        ORDER BY st.created_at DESC
      `
    } else if (status) {
      return await sql`
        SELECT st.*, 
               CONCAT(c.first_name, ' ', c.last_name) as customer_name, 
               u.name as assigned_to_name,
               COUNT(tr.id) as response_count
        FROM support_tickets st
        JOIN customers c ON st.customer_id = c.id
        LEFT JOIN users u ON st.assigned_to = u.id
        LEFT JOIN ticket_responses tr ON st.id = tr.ticket_id
        WHERE st.status = ${status}
        GROUP BY st.id, c.first_name, c.last_name, u.name
        ORDER BY st.created_at DESC
      `
    } else {
      return await sql`
        SELECT st.*, 
               CONCAT(c.first_name, ' ', c.last_name) as customer_name, 
               u.name as assigned_to_name,
               COUNT(tr.id) as response_count
        FROM support_tickets st
        JOIN customers c ON st.customer_id = c.id
        LEFT JOIN users u ON st.assigned_to = u.id
        LEFT JOIN ticket_responses tr ON st.id = tr.ticket_id
        GROUP BY st.id, c.first_name, c.last_name, u.name
        ORDER BY st.created_at DESC
      `
    }
  }

  // Network monitoring
  static async getNetworkDevices() {
    return await sql`
      SELECT nd.*,
             COUNT(nm.id) as monitoring_records,
             MAX(nm.timestamp) as last_monitored
      FROM network_devices nd
      LEFT JOIN network_monitoring nm ON nd.id = nm.device_id
      GROUP BY nd.id
      ORDER BY nd.created_at DESC
    `
  }

  // Financial operations
  static async getFinancialSummary() {
    const result = await sql`
      SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND payment_date >= CURRENT_DATE - INTERVAL '30 days') as monthly_revenue,
        (SELECT COALESCE(SUM(net_pay), 0) FROM payroll WHERE pay_period_start >= CURRENT_DATE - INTERVAL '30 days') as monthly_payroll,
        (SELECT COUNT(*) FROM customers WHERE status = 'active') as active_customers,
        (SELECT COUNT(*) FROM employees WHERE status = 'active') as active_employees,
        (SELECT COUNT(*) FROM support_tickets WHERE status = 'open') as open_tickets
    `
    return result[0]
  }

  // Inventory operations
  static async getInventoryItems() {
    return await sql`
      SELECT ii.*,
             COALESCE(SUM(CASE WHEN im.movement_type = 'in' THEN im.quantity ELSE -im.quantity END), 0) as calculated_stock
      FROM inventory_items ii
      LEFT JOIN inventory_movements im ON ii.id = im.item_id
      GROUP BY ii.id
      ORDER BY ii.item_name
    `
  }

  // System health check
  static async getSystemHealth() {
    const tables = await sql`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    const connections = await sql`
      SELECT count(*) as active_connections
      FROM pg_stat_activity
      WHERE state = 'active'
    `

    return {
      tables: tables.length,
      totalColumns: tables.reduce((sum: number, table: any) => sum + table.column_count, 0),
      activeConnections: connections[0].active_connections,
      timestamp: new Date().toISOString(),
    }
  }
}

// Export individual functions for backward compatibility
export const getCustomers = DatabaseUtils.getCustomers
export const getCustomerById = DatabaseUtils.getCustomerById
export const getEmployees = DatabaseUtils.getEmployees
export const getServicePlans = DatabaseUtils.getServicePlans
export const getPayments = DatabaseUtils.getPayments
export const getSupportTickets = DatabaseUtils.getSupportTickets
export const getNetworkDevices = DatabaseUtils.getNetworkDevices
export const getFinancialSummary = DatabaseUtils.getFinancialSummary
export const getInventoryItems = DatabaseUtils.getInventoryItems
export const getSystemHealth = DatabaseUtils.getSystemHealth

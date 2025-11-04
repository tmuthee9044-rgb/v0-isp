import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface Customer {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  status: string
  customer_type: string
  address: string
  city: string
  state: string
  postal_code: string
  country: string
  created_at: string
  updated_at: string
  balance: number
  monthly_fee: number
  last_payment_date: string | null
  service_count: number
  active_services: number
}

export interface CustomerStats {
  total: number
  active: number
  suspended: number
  pending: number
  totalRevenue: number
}

export interface CustomerFilters {
  search?: string
  status?: string
  customerType?: string
  city?: string
  limit?: number
  offset?: number
}

export class CustomerDatabase {
  static async getCustomers(filters: CustomerFilters = {}): Promise<Customer[]> {
    try {
      const { search = "", status = "", customerType = "", city = "", limit = 50, offset = 0 } = filters

      let query = `
        SELECT 
          c.*,
          COALESCE(cs.service_count, 0) as service_count,
          COALESCE(cs.active_services, 0) as active_services
        FROM customers c
        LEFT JOIN (
          SELECT 
            customer_id,
            COUNT(*) as service_count,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_services
          FROM customer_services
          GROUP BY customer_id
        ) cs ON c.id = cs.customer_id
        WHERE 1=1
      `

      const params: any[] = []
      let paramIndex = 1

      if (search) {
        query += ` AND (
          LOWER(c.first_name) LIKE LOWER($${paramIndex}) OR 
          LOWER(c.last_name) LIKE LOWER($${paramIndex}) OR 
          LOWER(c.email) LIKE LOWER($${paramIndex}) OR
          c.phone LIKE $${paramIndex}
        )`
        params.push(`%${search}%`)
        paramIndex++
      }

      if (status) {
        query += ` AND c.status = $${paramIndex}`
        params.push(status)
        paramIndex++
      }

      if (customerType) {
        query += ` AND c.customer_type = $${paramIndex}`
        params.push(customerType)
        paramIndex++
      }

      if (city) {
        query += ` AND LOWER(c.city) = LOWER($${paramIndex})`
        params.push(city)
        paramIndex++
      }

      query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
      params.push(limit, offset)

      const result = await sql(query, params)
      return result as Customer[]
    } catch (error) {
      console.error("[v0] Error fetching customers:", error)
      return []
    }
  }

  static async getCustomerStats(): Promise<CustomerStats> {
    try {
      const result = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COALESCE(SUM(CASE WHEN status = 'active' THEN monthly_fee END), 0) as total_revenue
        FROM customers
      `

      const stats = result[0] as any
      return {
        total: Number.parseInt(stats.total),
        active: Number.parseInt(stats.active),
        suspended: Number.parseInt(stats.suspended),
        pending: Number.parseInt(stats.pending),
        totalRevenue: Number.parseFloat(stats.total_revenue || 0),
      }
    } catch (error) {
      console.error("[v0] Error fetching customer stats:", error)
      return {
        total: 0,
        active: 0,
        suspended: 0,
        pending: 0,
        totalRevenue: 0,
      }
    }
  }

  static async getCustomerById(id: number): Promise<Customer | null> {
    try {
      const result = await sql`
        SELECT 
          c.*,
          COALESCE(cs.service_count, 0) as service_count,
          COALESCE(cs.active_services, 0) as active_services
        FROM customers c
        LEFT JOIN (
          SELECT 
            customer_id,
            COUNT(*) as service_count,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_services
          FROM customer_services
          GROUP BY customer_id
        ) cs ON c.id = cs.customer_id
        WHERE c.id = ${id}
      `

      return (result[0] as Customer) || null
    } catch (error) {
      console.error("[v0] Error fetching customer by ID:", error)
      return null
    }
  }

  static async createCustomer(customerData: Partial<Customer>): Promise<Customer | null> {
    try {
      const result = await sql`
        INSERT INTO customers (
          first_name, last_name, email, phone, status, customer_type,
          address, city, state, postal_code, country, balance, monthly_fee
        ) VALUES (
          ${customerData.first_name}, ${customerData.last_name}, ${customerData.email},
          ${customerData.phone}, ${customerData.status || "pending"}, ${customerData.customer_type || "residential"},
          ${customerData.address}, ${customerData.city}, ${customerData.state},
          ${customerData.postal_code}, ${customerData.country}, ${customerData.balance || 0},
          ${customerData.monthly_fee || 0}
        )
        RETURNING *
      `

      return result[0] as Customer
    } catch (error) {
      console.error("[v0] Error creating customer:", error)
      return null
    }
  }

  static async updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer | null> {
    try {
      const result = await sql`
        UPDATE customers SET
          first_name = COALESCE(${customerData.first_name}, first_name),
          last_name = COALESCE(${customerData.last_name}, last_name),
          email = COALESCE(${customerData.email}, email),
          phone = COALESCE(${customerData.phone}, phone),
          status = COALESCE(${customerData.status}, status),
          customer_type = COALESCE(${customerData.customer_type}, customer_type),
          address = COALESCE(${customerData.address}, address),
          city = COALESCE(${customerData.city}, city),
          state = COALESCE(${customerData.state}, state),
          postal_code = COALESCE(${customerData.postal_code}, postal_code),
          country = COALESCE(${customerData.country}, country),
          balance = COALESCE(${customerData.balance}, balance),
          monthly_fee = COALESCE(${customerData.monthly_fee}, monthly_fee),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `

      return (result[0] as Customer) || null
    } catch (error) {
      console.error("[v0] Error updating customer:", error)
      return null
    }
  }

  static async deleteCustomer(id: number): Promise<boolean> {
    try {
      await sql`DELETE FROM customers WHERE id = ${id}`
      return true
    } catch (error) {
      console.error("[v0] Error deleting customer:", error)
      return false
    }
  }

  static async getFilterOptions() {
    try {
      const [statuses, customerTypes, cities] = await Promise.all([
        sql`SELECT DISTINCT status FROM customers WHERE status IS NOT NULL ORDER BY status`,
        sql`SELECT DISTINCT customer_type FROM customers WHERE customer_type IS NOT NULL ORDER BY customer_type`,
        sql`SELECT DISTINCT city FROM customers WHERE city IS NOT NULL ORDER BY city`,
      ])

      return {
        statuses: statuses.map((row: any) => row.status),
        customerTypes: customerTypes.map((row: any) => row.customer_type),
        cities: cities.map((row: any) => row.city),
      }
    } catch (error) {
      console.error("[v0] Error fetching filter options:", error)
      return {
        statuses: [],
        customerTypes: [],
        cities: [],
      }
    }
  }
}

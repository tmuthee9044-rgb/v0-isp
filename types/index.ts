export interface Customer {
  id: number
  name: string
  email: string
  phone: string
  address: string
  status: "active" | "inactive" | "suspended"
  service_plan: string
  monthly_fee: number
  created_at: string
  updated_at: string
  connection_type: string
  router_ip: string
  mac_address: string
  installation_date: string
  last_payment: string
  balance: number
  notes: string
  portal_login_id: string
  portal_username: string
  portal_password: string
  router_allocated?: string
  ip_allocated?: string
  customer_type: "individual" | "business" | "government"
  payment_method: string
  auto_payment: boolean
}

export interface ServicePlan {
  id: number
  name: string
  speed_down: number
  speed_up: number
  data_limit: number | null
  price: number
  description: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface CustomerService {
  id: number
  customer_id: number
  service_plan_id: number
  service_plan_name: string
  monthly_fee: number
  status: "active" | "suspended" | "cancelled"
  start_date: string
  end_date: string | null
  days_remaining: number
  auto_renew: boolean
  created_at: string
  updated_at: string
  last_payment_date?: string
  next_billing_date: string
  service_balance: number
}

export interface Invoice {
  id: number
  customer_id: number
  amount: number
  status: "pending" | "paid" | "overdue" | "cancelled"
  due_date: string
  created_at: string
  paid_at: string | null
  services: CustomerService[]
}

export interface Payment {
  id: number
  customer_id: number
  invoice_id?: number
  amount: number
  method: "mpesa" | "bank" | "cash" | "card"
  reference?: string
  status: "pending" | "completed" | "failed"
  created_at: string
  updated_at: string
  service_allocations: PaymentAllocation[]
}

export interface PaymentAllocation {
  id: number
  payment_id: number
  service_id: number
  allocated_amount: number
  days_extended: number
  created_at: string
}

export interface Router {
  id: number
  name: string
  ip_address: string
  location: string
  status: "online" | "offline" | "maintenance"
  model: string
  last_seen: string
}

export interface SupportTicket {
  id: number
  customer_id: number
  title: string
  description: string
  status: "open" | "in_progress" | "resolved" | "closed"
  priority: "low" | "medium" | "high" | "urgent"
  created_at: string
  updated_at: string
}

export interface IPSubnet {
  id: number
  name: string
  network: string
  cidr: number
  type: "ipv4" | "ipv6"
  gateway: string
  dns_primary: string
  dns_secondary?: string
  dhcp_enabled: boolean
  dhcp_start?: string
  dhcp_end?: string
  vlan_id?: number
  description: string
  total_ips: number
  used_ips: number
  available_ips: number
  status: "active" | "inactive"
  created_at: string
  updated_at: string
}

export interface IPAllocation {
  id: number
  subnet_id: number
  ip_address: string
  mac_address?: string
  hostname?: string
  customer_id?: number
  device_type: "router" | "customer" | "server" | "other"
  status: "allocated" | "reserved" | "available"
  lease_expires?: string
  created_at: string
  updated_at: string
}

export interface FinanceSettings {
  id: number
  customer_id: number
  payment_method: string
  mpesa_number?: string
  bank_account?: string
  auto_payment: boolean
  payment_reminder_days: number
  late_fee_percentage: number
  suspension_grace_days: number
  created_at: string
  updated_at: string
}

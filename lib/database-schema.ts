export interface DatabaseSchema {
  // Core existing tables (already in database)
  customers: {
    id: number
    name: string
    email: string
    phone: string
    address: string
    customer_type: string
    status: string
    plan: string
    monthly_fee: number
    balance: number
    connection_quality: string
    portal_login_id: string
    portal_username: string
    portal_password: string
    installation_date: Date
    contract_end_date: Date
    last_payment_date: Date
    created_at: Date
    updated_at: Date
  }

  service_plans: {
    id: number
    name: string
    description: string
    speed: string
    price: number
    status: string
    created_at: Date
  }

  customer_services: {
    id: number
    customer_id: number
    service_plan_id: number
    status: string
    monthly_fee: number
    installation_date: Date
    created_at: Date
  }

  payments: {
    id: number
    customer_id: number
    amount: number
    payment_method: string
    payment_date: Date
    status: string
    description: string
    created_at: Date
  }

  network_devices: {
    id: string
    name: string
    type: string
    ip_address: string
    mac_address: string
    location: string
    status: string
    last_seen: Date
    created_at: Date
    updated_at: Date
  }

  ip_addresses: {
    id: number
    ip_address: string
    customer_id: number
    subnet_id: number
    status: string
    assigned_date: Date
    created_at: Date
  }

  subnets: {
    id: number
    name: string
    network: string
    gateway: string
    dns_servers: string[]
    description: string
    created_at: Date
  }

  users: {
    id: number
    name: string
    email: string
    password_hash: string
    role: string
    created_at: Date
    updated_at: Date
  }

  system_config: {
    id: number
    key: string
    value: string
    updated_at: Date
  }

  // Additional tables needed for complete functionality
  employees: {
    id: number
    employee_id: string
    first_name: string
    last_name: string
    email: string
    phone: string
    position: string
    department: string
    hire_date: Date
    salary: number
    status: string
    manager_id: number
    created_at: Date
    updated_at: Date
  }

  payroll: {
    id: number
    employee_id: number
    pay_period_start: Date
    pay_period_end: Date
    basic_salary: number
    overtime_hours: number
    overtime_rate: number
    allowances: number
    deductions: number
    tax_deductions: number
    net_pay: number
    status: string
    processed_date: Date
    created_at: Date
  }

  leave_requests: {
    id: number
    employee_id: number
    leave_type: string
    start_date: Date
    end_date: Date
    days_requested: number
    reason: string
    status: string
    approved_by: number
    approved_date: Date
    created_at: Date
    updated_at: Date
  }

  invoices: {
    id: number
    customer_id: number
    invoice_number: string
    issue_date: Date
    due_date: Date
    subtotal: number
    tax_amount: number
    total_amount: number
    status: string
    payment_status: string
    notes: string
    created_at: Date
    updated_at: Date
  }

  invoice_items: {
    id: number
    invoice_id: number
    service_plan_id: number
    description: string
    quantity: number
    unit_price: number
    total_price: number
    created_at: Date
  }

  billing_cycles: {
    id: number
    customer_id: number
    cycle_start: Date
    cycle_end: Date
    amount_due: number
    amount_paid: number
    status: string
    created_at: Date
    updated_at: Date
  }

  customer_communications: {
    id: number
    customer_id: number
    type: string // 'email', 'sms', 'call', 'chat'
    direction: string // 'inbound', 'outbound'
    subject: string
    message: string
    status: string
    sent_by: number
    sent_at: Date
    read_at: Date
    created_at: Date
  }

  support_tickets: {
    id: number
    customer_id: number
    ticket_number: string
    subject: string
    description: string
    priority: string
    status: string
    category: string
    assigned_to: number
    created_by: number
    resolved_at: Date
    created_at: Date
    updated_at: Date
  }

  ticket_responses: {
    id: number
    ticket_id: number
    user_id: number
    message: string
    is_internal: boolean
    created_at: Date
  }

  network_monitoring: {
    id: number
    device_id: string
    metric_type: string // 'bandwidth', 'latency', 'uptime', 'packet_loss'
    value: number
    unit: string
    timestamp: Date
    created_at: Date
  }

  customer_usage: {
    id: number
    customer_id: number
    date: Date
    download_mb: number
    upload_mb: number
    total_mb: number
    peak_speed_mbps: number
    session_duration_minutes: number
    created_at: Date
  }

  service_outages: {
    id: number
    title: string
    description: string
    affected_areas: string[]
    start_time: Date
    end_time: Date
    status: string
    severity: string
    created_by: number
    created_at: Date
    updated_at: Date
  }

  financial_accounts: {
    id: number
    account_name: string
    account_type: string // 'asset', 'liability', 'equity', 'revenue', 'expense'
    account_code: string
    balance: number
    parent_account_id: number
    is_active: boolean
    created_at: Date
    updated_at: Date
  }

  transactions: {
    id: number
    transaction_date: Date
    description: string
    reference_number: string
    debit_account_id: number
    credit_account_id: number
    amount: number
    created_by: number
    created_at: Date
  }

  inventory_items: {
    id: number
    item_name: string
    item_code: string
    category: string
    description: string
    unit_cost: number
    selling_price: number
    quantity_in_stock: number
    minimum_stock_level: number
    supplier: string
    location: string
    status: string
    created_at: Date
    updated_at: Date
  }

  inventory_movements: {
    id: number
    item_id: number
    movement_type: string // 'in', 'out', 'adjustment'
    quantity: number
    unit_cost: number
    total_cost: number
    reference_number: string
    notes: string
    created_by: number
    created_at: Date
  }

  system_logs: {
    id: number
    log_level: string // 'info', 'warning', 'error', 'debug'
    module: string
    action: string
    user_id: number
    ip_address: string
    user_agent: string
    details: string
    created_at: Date
  }

  notifications: {
    id: number
    user_id: number
    title: string
    message: string
    type: string
    is_read: boolean
    action_url: string
    created_at: Date
    read_at: Date
  }

  reports: {
    id: number
    report_name: string
    report_type: string
    parameters: string // JSON
    generated_by: number
    file_path: string
    status: string
    created_at: Date
  }

  audit_trail: {
    id: number
    table_name: string
    record_id: number
    action: string // 'create', 'update', 'delete'
    old_values: string // JSON
    new_values: string // JSON
    user_id: number
    ip_address: string
    created_at: Date
  }
}

// Database relationships and constraints
export const databaseRelationships = {
  customers: {
    hasMany: [
      "customer_services",
      "payments",
      "ip_addresses",
      "invoices",
      "customer_communications",
      "support_tickets",
      "customer_usage",
    ],
    belongsTo: [],
  },
  service_plans: {
    hasMany: ["customer_services", "invoice_items"],
    belongsTo: [],
  },
  customer_services: {
    belongsTo: ["customers", "service_plans"],
    hasMany: [],
  },
  employees: {
    hasMany: ["payroll", "leave_requests"],
    belongsTo: ["employees"], // self-reference for manager
  },
  invoices: {
    belongsTo: ["customers"],
    hasMany: ["invoice_items"],
  },
  support_tickets: {
    belongsTo: ["customers", "users"],
    hasMany: ["ticket_responses"],
  },
  network_devices: {
    hasMany: ["network_monitoring"],
    belongsTo: [],
  },
}

// Required indexes for performance
export const requiredIndexes = [
  "customers(email)",
  "customers(phone)",
  "customers(status)",
  "customers(customer_type)",
  "payments(customer_id)",
  "payments(payment_date)",
  "payments(status)",
  "customer_services(customer_id)",
  "customer_services(service_plan_id)",
  "ip_addresses(customer_id)",
  "ip_addresses(status)",
  "network_devices(status)",
  "network_devices(type)",
  "employees(employee_id)",
  "employees(department)",
  "employees(status)",
  "invoices(customer_id)",
  "invoices(status)",
  "support_tickets(customer_id)",
  "support_tickets(status)",
  "customer_usage(customer_id)",
  "customer_usage(date)",
  "system_logs(created_at)",
  "system_logs(module)",
  "audit_trail(table_name)",
  "audit_trail(record_id)",
]

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface Router {
  id: number
  name: string
  type: "mikrotik" | "ubiquiti" | "juniper"
  ip_address: string
  username: string
  password: string
  port: number
  location?: string
  status: "active" | "inactive" | "maintenance"
  last_sync?: Date
  sync_status: "success" | "failed" | "pending" | "syncing"
  created_at: Date
  updated_at: Date
}

export interface IPSubnet {
  id: number
  name: string
  subnet: string
  router_id: number
  gateway?: string
  dns_primary?: string
  dns_secondary?: string
  vlan_id?: number
  description?: string
  created_at: Date
  updated_at: Date
}

export interface IPAddress {
  id: number
  subnet_id: number
  ip_address: string
  status: "available" | "assigned" | "reserved" | "blocked"
  customer_id?: number
  service_id?: number
  assigned_at?: Date
  created_at: Date
}

export interface SyncJob {
  id: number
  router_id: number
  job_type: "full_sync" | "ip_assignment" | "service_provision" | "service_termination"
  status: "pending" | "running" | "completed" | "failed" | "retrying"
  payload?: any
  error_message?: string
  retry_count: number
  max_retries: number
  started_at?: Date
  completed_at?: Date
  created_at: Date
}

// IP Address utilities
export function parseSubnet(subnet: string): { network: string; mask: number; totalIPs: number } {
  const [network, maskStr] = subnet.split("/")
  const mask = Number.parseInt(maskStr)
  const totalIPs = Math.pow(2, 32 - mask)

  return { network, mask, totalIPs }
}

export function generateIPPool(subnet: string): string[] {
  const { network, mask } = parseSubnet(subnet)
  const networkParts = network.split(".").map(Number)
  const hostBits = 32 - mask
  const totalHosts = Math.pow(2, hostBits) - 2 // Exclude network and broadcast

  const ips: string[] = []

  for (let i = 1; i <= totalHosts; i++) {
    const ip = [...networkParts]
    let carry = i

    for (let j = 3; j >= 0; j--) {
      ip[j] += carry % 256
      carry = Math.floor(carry / 256)
      if (ip[j] >= 256) {
        ip[j] -= 256
        carry += 1
      }
    }

    ips.push(ip.join("."))
  }

  return ips
}

// Router connection utilities
export async function testRouterConnection(router: Partial<Router>): Promise<boolean> {
  try {
    // Simulate router connection test based on type
    switch (router.type) {
      case "mikrotik":
        return await testMikroTikConnection(router)
      case "ubiquiti":
        return await testUbiquitiConnection(router)
      case "juniper":
        return await testJuniperConnection(router)
      default:
        return false
    }
  } catch (error) {
    console.error("Router connection test failed:", error)
    return false
  }
}

async function testMikroTikConnection(router: Partial<Router>): Promise<boolean> {
  // Simulate MikroTik API connection
  // In real implementation, use RouterOS API
  return new Promise((resolve) => {
    setTimeout(() => resolve(Math.random() > 0.2), 1000)
  })
}

async function testUbiquitiConnection(router: Partial<Router>): Promise<boolean> {
  // Simulate Ubiquiti UniFi API connection
  // In real implementation, use UniFi Controller API
  return new Promise((resolve) => {
    setTimeout(() => resolve(Math.random() > 0.2), 1000)
  })
}

async function testJuniperConnection(router: Partial<Router>): Promise<boolean> {
  // Simulate Juniper NETCONF connection
  // In real implementation, use NETCONF protocol
  return new Promise((resolve) => {
    setTimeout(() => resolve(Math.random() > 0.2), 1000)
  })
}

// Sync job utilities
export async function createSyncJob(routerId: number, jobType: SyncJob["job_type"], payload?: any): Promise<number> {
  const result = await sql`
    INSERT INTO sync_jobs (router_id, job_type, payload)
    VALUES (${routerId}, ${jobType}, ${JSON.stringify(payload || {})})
    RETURNING id
  `

  return result[0].id
}

export async function updateSyncJobStatus(
  jobId: number,
  status: SyncJob["status"],
  errorMessage?: string,
): Promise<void> {
  const updateData: any = { status }

  if (status === "running") {
    updateData.started_at = new Date()
  } else if (status === "completed" || status === "failed") {
    updateData.completed_at = new Date()
  }

  if (errorMessage) {
    updateData.error_message = errorMessage
  }

  await sql`
    UPDATE sync_jobs 
    SET ${sql(updateData)}
    WHERE id = ${jobId}
  `
}

// Network event logging
export async function logNetworkEvent(
  eventType: string,
  routerId?: number,
  customerId?: number,
  serviceId?: number,
  ipAddress?: string,
  details?: any,
): Promise<void> {
  await sql`
    INSERT INTO network_events (event_type, router_id, customer_id, service_id, ip_address, details)
    VALUES (${eventType}, ${routerId}, ${customerId}, ${serviceId}, ${ipAddress}, ${JSON.stringify(details || {})})
  `
}

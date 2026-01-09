import { getSql } from "./db"

export interface Router {
  id: number
  name: string
  vendor: "mikrotik" | "ubiquiti" | "juniper"
  connection_type: "api" | "ssh" | "netconf"
  ip_address: string
  location_id: number
  supports_radius: boolean
  supports_direct_push: boolean
  max_sessions: number
  current_sessions: number
  is_active: boolean
}

export interface RouterCapabilities {
  supportedAuthMethods: string[]
  supportedEnforcementModes: string[]
  recommendedMode: string
}

// Get routers filtered by location
export async function getRoutersByLocation(locationId: number): Promise<Router[]> {
  const sql = await getSql()

  const routers = await sql<Router[]>`
    SELECT 
      id,
      name,
      vendor,
      connection_method as connection_type,
      ip_address,
      location_id,
      supports_radius,
      supports_direct_push,
      max_sessions,
      current_sessions,
      status = 'active' as is_active
    FROM network_devices
    WHERE location_id = ${locationId}
      AND status = 'active'
    ORDER BY name ASC
  `

  return routers
}

// Get router capabilities based on vendor
export function getRouterCapabilities(vendor: string): RouterCapabilities {
  const capabilities: Record<string, RouterCapabilities> = {
    mikrotik: {
      supportedAuthMethods: ["pppoe", "hotspot", "mac", "static-ip"],
      supportedEnforcementModes: ["radius", "direct", "hybrid"],
      recommendedMode: "radius",
    },
    ubiquiti: {
      supportedAuthMethods: ["pppoe", "hotspot"],
      supportedEnforcementModes: ["radius", "direct"],
      recommendedMode: "radius",
    },
    juniper: {
      supportedAuthMethods: ["pppoe", "static-ip"],
      supportedEnforcementModes: ["radius", "direct"],
      recommendedMode: "radius",
    },
  }

  return capabilities[vendor.toLowerCase()] || capabilities.mikrotik
}

// Calculate router load percentage
export function calculateRouterLoad(router: Router): number {
  if (!router.max_sessions || router.max_sessions === 0) return 0
  return Math.round((router.current_sessions / router.max_sessions) * 100)
}

// Queue service provisioning job
export async function queueServiceProvisioning(
  serviceId: number,
  routerId: number,
  action: string,
  enforcementMode: string,
): Promise<void> {
  const sql = await getSql()

  await sql`
    INSERT INTO service_provisioning_log (
      service_id,
      router_id,
      action,
      enforcement_mode,
      status
    ) VALUES (
      ${serviceId},
      ${routerId},
      ${action},
      ${enforcementMode},
      'pending'
    )
  `

  // Add to provisioning_queue for worker processing
  await sql`
    INSERT INTO provisioning_queue (
      router_id,
      operation,
      payload,
      status
    ) VALUES (
      ${routerId},
      ${action.toLowerCase()},
      ${JSON.stringify({ service_id: serviceId, enforcement_mode: enforcementMode })},
      'pending'
    )
  `
}

// Get service provisioning status
export async function getServiceProvisioningStatus(serviceId: number) {
  const sql = await getSql()

  const logs = await sql`
    SELECT 
      spl.*,
      nd.name as router_name,
      nd.vendor
    FROM service_provisioning_log spl
    LEFT JOIN network_devices nd ON spl.router_id = nd.id
    WHERE spl.service_id = ${serviceId}
    ORDER BY spl.created_at DESC
    LIMIT 10
  `

  return logs
}

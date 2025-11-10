import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface NetworkNode {
  id: number
  name: string
  type: string
  status: string
  ip_address: string
  location: string
  x?: number
  y?: number
  connections: NetworkConnection[]
  metrics: DeviceMetrics
}

export interface NetworkConnection {
  id: number
  source_id: number
  target_id: number
  connection_type: string
  bandwidth_mbps: number
  status: string
  utilization?: number
}

export interface DeviceMetrics {
  cpu_usage: number
  memory_usage: number
  uptime_seconds: number
  temperature?: number
  last_seen: string
}

export interface TopologyLayout {
  nodes: NetworkNode[]
  connections: NetworkConnection[]
  layout_type: "hierarchical" | "force" | "circular"
}

export class NetworkTopologyManager {
  async getNetworkTopology(): Promise<TopologyLayout> {
    // Get all network devices
    const devices = await sql`
      SELECT 
        id,
        device_name as name,
        device_type as type,
        status,
        ip_address,
        location,
        cpu_usage,
        memory_usage,
        uptime_seconds,
        temperature,
        last_seen
      FROM network_devices
      WHERE status != 'inactive'
      ORDER BY device_type, device_name
    `

    // Get all connections
    const connections = await sql`
      SELECT 
        nt.id,
        nt.parent_device_id as source_id,
        nt.child_device_id as target_id,
        nt.connection_type,
        nt.bandwidth_mbps,
        nt.status
      FROM network_topology nt
      WHERE nt.status = 'active'
    `

    // Build nodes with metrics
    const nodes: NetworkNode[] = devices.map((device) => ({
      id: device.id,
      name: device.name,
      type: device.type,
      status: device.status,
      ip_address: device.ip_address,
      location: device.location,
      connections: [],
      metrics: {
        cpu_usage: Number(device.cpu_usage || 0),
        memory_usage: Number(device.memory_usage || 0),
        uptime_seconds: Number(device.uptime_seconds || 0),
        temperature: device.temperature ? Number(device.temperature) : undefined,
        last_seen: device.last_seen,
      },
    }))

    // Build connections with utilization data
    const networkConnections: NetworkConnection[] = await Promise.all(
      connections.map(async (conn) => {
        // Get connection utilization (would be from monitoring system)
        const utilization = Math.random() * 80 // Placeholder

        return {
          id: conn.id,
          source_id: conn.source_id,
          target_id: conn.target_id,
          connection_type: conn.connection_type,
          bandwidth_mbps: conn.bandwidth_mbps,
          status: conn.status,
          utilization,
        }
      }),
    )

    // Calculate layout positions
    const layoutNodes = this.calculateHierarchicalLayout(nodes, networkConnections)

    return {
      nodes: layoutNodes,
      connections: networkConnections,
      layout_type: "hierarchical",
    }
  }

  private calculateHierarchicalLayout(nodes: NetworkNode[], connections: NetworkConnection[]): NetworkNode[] {
    // Simple hierarchical layout algorithm
    const layers: { [key: string]: NetworkNode[] } = {
      firewall: [],
      router: [],
      switch: [],
      access_point: [],
      modem: [],
    }

    // Group nodes by type
    nodes.forEach((node) => {
      if (layers[node.type]) {
        layers[node.type].push(node)
      } else {
        layers.router.push(node) // Default to router layer
      }
    })

    // Calculate positions
    let y = 50
    const layerHeight = 150
    const nodeSpacing = 200

    Object.keys(layers).forEach((layerType) => {
      const layerNodes = layers[layerType]
      if (layerNodes.length === 0) return

      const totalWidth = (layerNodes.length - 1) * nodeSpacing
      const startX = Math.max(100, (1200 - totalWidth) / 2) // Center horizontally

      layerNodes.forEach((node, index) => {
        node.x = startX + index * nodeSpacing
        node.y = y
      })

      y += layerHeight
    })

    return nodes
  }

  async updateDeviceMetrics(deviceId: number, metrics: Partial<DeviceMetrics>): Promise<void> {
    await sql`
      UPDATE network_devices 
      SET 
        cpu_usage = COALESCE(${metrics.cpu_usage}, cpu_usage),
        memory_usage = COALESCE(${metrics.memory_usage}, memory_usage),
        uptime_seconds = COALESCE(${metrics.uptime_seconds}, uptime_seconds),
        temperature = COALESCE(${metrics.temperature}, temperature),
        last_seen = NOW(),
        updated_at = NOW()
      WHERE id = ${deviceId}
    `

    // Store historical metrics
    if (metrics.cpu_usage !== undefined) {
      await sql`
        INSERT INTO network_performance_metrics (device_id, metric_type, metric_value, unit)
        VALUES (${deviceId}, 'cpu', ${metrics.cpu_usage}, 'percent')
      `
    }

    if (metrics.memory_usage !== undefined) {
      await sql`
        INSERT INTO network_performance_metrics (device_id, metric_type, metric_value, unit)
        VALUES (${deviceId}, 'memory', ${metrics.memory_usage}, 'percent')
      `
    }
  }

  async addNetworkDevice(device: {
    name: string
    type: string
    brand?: string
    model?: string
    ip_address: string
    location: string
  }): Promise<number> {
    const [newDevice] = await sql`
      INSERT INTO network_devices (
        device_name,
        device_type,
        brand,
        model,
        ip_address,
        location,
        status
      ) VALUES (
        ${device.name},
        ${device.type},
        ${device.brand || null},
        ${device.model || null},
        ${device.ip_address},
        ${device.location},
        'active'
      ) RETURNING id
    `

    return newDevice.id
  }

  async addConnection(connection: {
    parent_device_id: number
    child_device_id: number
    connection_type: string
    bandwidth_mbps: number
  }): Promise<void> {
    await sql`
      INSERT INTO network_topology (
        parent_device_id,
        child_device_id,
        connection_type,
        bandwidth_mbps,
        status
      ) VALUES (
        ${connection.parent_device_id},
        ${connection.child_device_id},
        ${connection.connection_type},
        ${connection.bandwidth_mbps},
        'active'
      )
    `
  }

  async getDevicePerformanceHistory(deviceId: number, hours = 24): Promise<any[]> {
    return await sql`
      SELECT 
        metric_type,
        metric_value,
        unit,
        recorded_at
      FROM network_performance_metrics
      WHERE device_id = ${deviceId}
      AND recorded_at >= NOW() - INTERVAL '${hours} hours'
      ORDER BY recorded_at DESC
    `
  }

  async getNetworkHealthSummary(): Promise<any> {
    const [summary] = await sql`
      SELECT 
        COUNT(*) as total_devices,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_devices,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_devices,
        COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_devices,
        AVG(cpu_usage) as avg_cpu_usage,
        AVG(memory_usage) as avg_memory_usage,
        COUNT(CASE WHEN last_seen < NOW() - INTERVAL '5 minutes' THEN 1 END) as offline_devices
      FROM network_devices
    `

    return {
      total_devices: Number(summary.total_devices),
      active_devices: Number(summary.active_devices),
      failed_devices: Number(summary.failed_devices),
      maintenance_devices: Number(summary.maintenance_devices),
      avg_cpu_usage: Number(summary.avg_cpu_usage || 0),
      avg_memory_usage: Number(summary.avg_memory_usage || 0),
      offline_devices: Number(summary.offline_devices),
      health_score: this.calculateHealthScore(summary),
    }
  }

  private calculateHealthScore(summary: any): number {
    const totalDevices = Number(summary.total_devices)
    if (totalDevices === 0) return 100

    const activeRatio = Number(summary.active_devices) / totalDevices
    const failedRatio = Number(summary.failed_devices) / totalDevices
    const offlineRatio = Number(summary.offline_devices) / totalDevices
    const avgCpuUsage = Number(summary.avg_cpu_usage || 0)
    const avgMemoryUsage = Number(summary.avg_memory_usage || 0)

    // Calculate health score (0-100)
    let score = 100
    score -= failedRatio * 50 // Failed devices heavily impact score
    score -= offlineRatio * 30 // Offline devices impact score
    score -= Math.max(0, avgCpuUsage - 70) * 0.5 // High CPU usage
    score -= Math.max(0, avgMemoryUsage - 80) * 0.3 // High memory usage

    return Math.max(0, Math.min(100, score))
  }
}

export const networkTopologyManager = new NetworkTopologyManager()

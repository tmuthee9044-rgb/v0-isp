import { getSql } from "@/lib/db"

export interface TrafficFlow {
  srcIp: string
  dstIp: string
  srcPort?: number
  dstPort?: number
  protocol: string
  bytesSent: number
  bytesReceived: number
}

export interface ClassificationResult {
  categoryId: number
  categoryName: string
  applicationName: string
  qosClass: string
  priority: number
}

export class TrafficClassificationEngine {
  /**
   * Classify a traffic flow based on DPI signatures
   */
  static async classifyFlow(flow: TrafficFlow): Promise<ClassificationResult> {
    const sql = await getSql()

    // Try port-based classification first (fast)
    if (flow.dstPort) {
      const portMatch = await sql`
        SELECT 
          tc.id as category_id,
          tc.category_name,
          tc.priority,
          ds.application_name
        FROM dpi_signatures ds
        JOIN traffic_categories tc ON ds.category_id = tc.id
        WHERE ds.is_active = true 
          AND tc.is_active = true
          AND ds.port_ranges LIKE ${"%" + flow.dstPort + "%"}
        ORDER BY tc.priority ASC
        LIMIT 1
      `

      if (portMatch.length > 0) {
        return {
          categoryId: portMatch[0].category_id,
          categoryName: portMatch[0].category_name,
          applicationName: portMatch[0].application_name,
          qosClass: this.getQoSClass(portMatch[0].priority),
          priority: portMatch[0].priority,
        }
      }
    }

    // Default to "Other" category
    const defaultCategory = await sql`
      SELECT id, category_name, priority
      FROM traffic_categories
      WHERE category_name = 'Other'
    `

    return {
      categoryId: defaultCategory[0].id,
      categoryName: defaultCategory[0].category_name,
      applicationName: "Unknown",
      qosClass: "BE", // Best Effort
      priority: defaultCategory[0].priority,
    }
  }

  /**
   * Log traffic flow for analytics
   */
  static async logTrafficFlow(
    customerId: number,
    serviceId: number,
    flow: TrafficFlow,
    classification: ClassificationResult
  ): Promise<void> {
    const sql = await getSql()

    await sql`
      INSERT INTO traffic_flows (
        customer_id, service_id, src_ip, dst_ip, src_port, dst_port,
        protocol, category_id, application_name, bytes_sent, bytes_received,
        qos_class, flow_start
      ) VALUES (
        ${customerId}, ${serviceId}, ${flow.srcIp}, ${flow.dstIp},
        ${flow.srcPort || null}, ${flow.dstPort || null}, ${flow.protocol},
        ${classification.categoryId}, ${classification.applicationName},
        ${flow.bytesSent}, ${flow.bytesReceived}, ${classification.qosClass},
        CURRENT_TIMESTAMP
      )
    `
  }

  /**
   * Aggregate traffic statistics (run periodically)
   */
  static async aggregateStatistics(date: string, hour?: number): Promise<void> {
    const sql = await getSql()

    if (hour !== undefined) {
      // Hourly aggregation
      await sql`
        INSERT INTO traffic_statistics (
          customer_id, service_id, category_id, date, hour,
          total_mb, upload_mb, download_mb, session_count
        )
        SELECT 
          customer_id,
          service_id,
          category_id,
          DATE(flow_start) as date,
          EXTRACT(HOUR FROM flow_start)::INTEGER as hour,
          SUM((bytes_sent + bytes_received) / 1024.0 / 1024.0) as total_mb,
          SUM(bytes_sent / 1024.0 / 1024.0) as upload_mb,
          SUM(bytes_received / 1024.0 / 1024.0) as download_mb,
          COUNT(*) as session_count
        FROM traffic_flows
        WHERE DATE(flow_start) = ${date}
          AND EXTRACT(HOUR FROM flow_start) = ${hour}
        GROUP BY customer_id, service_id, category_id, DATE(flow_start), EXTRACT(HOUR FROM flow_start)
        ON CONFLICT (customer_id, service_id, category_id, date, hour)
        DO UPDATE SET
          total_mb = EXCLUDED.total_mb,
          upload_mb = EXCLUDED.upload_mb,
          download_mb = EXCLUDED.download_mb,
          session_count = EXCLUDED.session_count
      `
    } else {
      // Daily aggregation
      await sql`
        INSERT INTO traffic_statistics (
          customer_id, service_id, category_id, date, hour,
          total_mb, upload_mb, download_mb, session_count
        )
        SELECT 
          customer_id,
          service_id,
          category_id,
          DATE(flow_start) as date,
          NULL as hour,
          SUM((bytes_sent + bytes_received) / 1024.0 / 1024.0) as total_mb,
          SUM(bytes_sent / 1024.0 / 1024.0) as upload_mb,
          SUM(bytes_received / 1024.0 / 1024.0) as download_mb,
          COUNT(*) as session_count
        FROM traffic_flows
        WHERE DATE(flow_start) = ${date}
        GROUP BY customer_id, service_id, category_id, DATE(flow_start)
        ON CONFLICT (customer_id, service_id, category_id, date, hour)
        DO UPDATE SET
          total_mb = EXCLUDED.total_mb,
          upload_mb = EXCLUDED.upload_mb,
          download_mb = EXCLUDED.download_mb,
          session_count = EXCLUDED.session_count
      `
    }
  }

  /**
   * Get QoS class based on priority
   */
  static getQoSClass(priority: number): string {
    if (priority <= 2) return "EF" // Expedited Forwarding (VoIP, Gaming)
    if (priority <= 4) return "AF" // Assured Forwarding (Streaming)
    return "BE" // Best Effort (Browsing, Other)
  }

  /**
   * Get traffic breakdown by category for a customer
   */
  static async getTrafficBreakdown(
    customerId: number,
    serviceId: number,
    days: number = 7
  ): Promise<any[]> {
    const sql = await getSql()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const breakdown = await sql`
      SELECT 
        tc.category_name,
        SUM(ts.total_mb) as total_mb,
        SUM(ts.upload_mb) as upload_mb,
        SUM(ts.download_mb) as download_mb,
        SUM(ts.session_count) as session_count,
        (SUM(ts.total_mb) * 100.0 / SUM(SUM(ts.total_mb)) OVER ()) as percentage
      FROM traffic_statistics ts
      JOIN traffic_categories tc ON ts.category_id = tc.id
      WHERE ts.customer_id = ${customerId}
        ${serviceId ? sql`AND ts.service_id = ${serviceId}` : sql``}
        AND ts.date >= ${startDate.toISOString().split("T")[0]}
        AND ts.hour IS NULL
      GROUP BY tc.category_name
      ORDER BY total_mb DESC
    `

    return breakdown
  }
}

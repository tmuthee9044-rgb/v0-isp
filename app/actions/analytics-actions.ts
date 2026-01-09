"use server"

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface AnalyticsData {
  routerPerformance: RouterPerformanceData[]
  capacityPredictions: CapacityPrediction[]
  networkForecasts: NetworkForecast[]
  alerts: CapacityAlert[]
}

export interface RouterPerformanceData {
  id: number
  router_id: string
  timestamp: string
  bandwidth_usage: number
  peak_usage: number
  connections: number
  latency: number
  packet_loss: number
  uptime_percentage: number
}

export interface CapacityPrediction {
  id: number
  router_id: string
  prediction_date: string
  current_utilization: number
  predicted_utilization: number
  growth_rate: number
  capacity_reached_date: string | null
  recommended_action: string
  priority: string
  estimated_cost: number
}

export interface NetworkForecast {
  id: number
  forecast_date: string
  total_capacity: number
  current_usage: number
  predicted_usage: number
  capacity_gap: number
  recommended_investment: number
  forecast_accuracy: number | null
}

export interface CapacityAlert {
  id: number
  router_id: string
  alert_type: string
  threshold_value: number
  current_value: number
  severity: string
  message: string
  acknowledged: boolean
  acknowledged_by: string | null
  acknowledged_at: string | null
  created_at: string
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  try {
    const [routerPerformance, capacityPredictions, networkForecasts, alerts] = await Promise.all([
      sql`SELECT * FROM router_performance_history ORDER BY timestamp DESC LIMIT 100`,
      sql`SELECT * FROM capacity_predictions ORDER BY prediction_date DESC`,
      sql`SELECT * FROM network_forecasts ORDER BY forecast_date DESC LIMIT 12`,
      sql`SELECT * FROM capacity_alerts WHERE acknowledged = false ORDER BY created_at DESC`,
    ])

    return {
      routerPerformance: routerPerformance as RouterPerformanceData[],
      capacityPredictions: capacityPredictions as CapacityPrediction[],
      networkForecasts: networkForecasts as NetworkForecast[],
      alerts: alerts as CapacityAlert[],
    }
  } catch (error) {
    console.error("Error fetching analytics data:", error)
    throw new Error("Failed to fetch analytics data")
  }
}

export async function recordRouterPerformance(data: {
  router_id: string
  bandwidth_usage: number
  peak_usage: number
  connections: number
  latency: number
  packet_loss: number
  uptime_percentage: number
}) {
  try {
    await sql`
      INSERT INTO router_performance_history 
      (router_id, bandwidth_usage, peak_usage, connections, latency, packet_loss, uptime_percentage)
      VALUES (${data.router_id}, ${data.bandwidth_usage}, ${data.peak_usage}, 
              ${data.connections}, ${data.latency}, ${data.packet_loss}, ${data.uptime_percentage})
    `
    return { success: true }
  } catch (error) {
    console.error("Error recording router performance:", error)
    throw new Error("Failed to record router performance")
  }
}

export async function updateCapacityPrediction(data: {
  router_id: string
  current_utilization: number
  predicted_utilization: number
  growth_rate: number
  capacity_reached_date?: string
  recommended_action: string
  priority: string
  estimated_cost: number
}) {
  try {
    await sql`
      INSERT INTO capacity_predictions 
      (router_id, prediction_date, current_utilization, predicted_utilization, 
       growth_rate, capacity_reached_date, recommended_action, priority, estimated_cost)
      VALUES (${data.router_id}, CURRENT_DATE, ${data.current_utilization}, 
              ${data.predicted_utilization}, ${data.growth_rate}, ${data.capacity_reached_date || null},
              ${data.recommended_action}, ${data.priority}, ${data.estimated_cost})
      ON CONFLICT (router_id, prediction_date) 
      DO UPDATE SET 
        current_utilization = EXCLUDED.current_utilization,
        predicted_utilization = EXCLUDED.predicted_utilization,
        growth_rate = EXCLUDED.growth_rate,
        capacity_reached_date = EXCLUDED.capacity_reached_date,
        recommended_action = EXCLUDED.recommended_action,
        priority = EXCLUDED.priority,
        estimated_cost = EXCLUDED.estimated_cost,
        updated_at = CURRENT_TIMESTAMP
    `
    return { success: true }
  } catch (error) {
    console.error("Error updating capacity prediction:", error)
    throw new Error("Failed to update capacity prediction")
  }
}

export async function createCapacityAlert(data: {
  router_id: string
  alert_type: string
  threshold_value: number
  current_value: number
  severity: string
  message: string
}) {
  try {
    await sql`
      INSERT INTO capacity_alerts 
      (router_id, alert_type, threshold_value, current_value, severity, message)
      VALUES (${data.router_id}, ${data.alert_type}, ${data.threshold_value}, 
              ${data.current_value}, ${data.severity}, ${data.message})
    `
    return { success: true }
  } catch (error) {
    console.error("Error creating capacity alert:", error)
    throw new Error("Failed to create capacity alert")
  }
}

export async function acknowledgeAlert(alertId: number, acknowledgedBy: string) {
  try {
    await sql`
      UPDATE capacity_alerts 
      SET acknowledged = true, 
          acknowledged_by = ${acknowledgedBy}, 
          acknowledged_at = CURRENT_TIMESTAMP
      WHERE id = ${alertId}
    `
    return { success: true }
  } catch (error) {
    console.error("Error acknowledging alert:", error)
    throw new Error("Failed to acknowledge alert")
  }
}

export async function getBandwidthPatterns(routerId?: string) {
  try {
    const query = routerId
      ? sql`SELECT * FROM bandwidth_patterns WHERE router_id = ${routerId} ORDER BY hour_of_day, day_of_week`
      : sql`SELECT * FROM bandwidth_patterns ORDER BY router_id, hour_of_day, day_of_week`

    const patterns = await query
    return patterns
  } catch (error) {
    console.error("Error fetching bandwidth patterns:", error)
    throw new Error("Failed to fetch bandwidth patterns")
  }
}

export async function getInfrastructureInvestments() {
  try {
    const investments = await sql`
      SELECT * FROM infrastructure_investments 
      ORDER BY planned_date DESC
    `
    return investments
  } catch (error) {
    console.error("Error fetching infrastructure investments:", error)
    throw new Error("Failed to fetch infrastructure investments")
  }
}

export async function createInvestmentPlan(data: {
  router_id?: string
  investment_type: string
  description: string
  estimated_cost: number
  planned_date: string
  roi_percentage?: number
}) {
  try {
    await sql`
      INSERT INTO infrastructure_investments 
      (router_id, investment_type, description, estimated_cost, planned_date, roi_percentage)
      VALUES (${data.router_id || null}, ${data.investment_type}, ${data.description}, 
              ${data.estimated_cost}, ${data.planned_date}, ${data.roi_percentage || null})
    `
    return { success: true }
  } catch (error) {
    console.error("Error creating investment plan:", error)
    throw new Error("Failed to create investment plan")
  }
}

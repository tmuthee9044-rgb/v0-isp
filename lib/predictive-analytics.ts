export interface RouterPrediction {
  routerId: string
  routerName: string
  currentUtilization: number
  predictedUtilization: number
  growthRate: number
  capacityReached: Date | null
  recommendedAction: "monitor" | "plan" | "upgrade" | "critical"
  estimatedCost: number
  priority: "low" | "medium" | "high"
}

export interface NetworkForecast {
  totalCapacity: number
  currentUsage: number
  predictedUsage: number
  utilizationTrend: number[]
  capacityGap: number
  recommendedInvestment: number
}

export class PredictiveAnalytics {
  /**
   * Calculate exponential growth prediction
   */
  static calculateGrowthPrediction(currentUsage: number, growthRate: number, months: number): number {
    return currentUsage * Math.pow(1 + growthRate / 100, months)
  }

  /**
   * Predict when capacity will be reached
   */
  static predictCapacityReached(
    currentUsage: number,
    maxCapacity: number,
    growthRate: number,
    threshold = 90,
  ): Date | null {
    if (growthRate <= 0) return null

    const targetUsage = (maxCapacity * threshold) / 100
    if (currentUsage >= targetUsage) return new Date()

    const monthsToCapacity = Math.log(targetUsage / currentUsage) / Math.log(1 + growthRate / 100)

    const futureDate = new Date()
    futureDate.setMonth(futureDate.getMonth() + Math.ceil(monthsToCapacity))

    return futureDate
  }

  /**
   * Generate capacity planning recommendations
   */
  static generateRecommendations(routers: any[]): RouterPrediction[] {
    return routers
      .filter((router) => router.status !== "offline")
      .map((router) => {
        const currentUtilization = (router.currentBandwidth / router.maxBandwidth) * 100
        const sixMonthPrediction = this.calculateGrowthPrediction(currentUtilization, router.growthRate, 6)

        const capacityReached = this.predictCapacityReached(currentUtilization, 100, router.growthRate)

        let priority: "low" | "medium" | "high" = "low"
        let recommendedAction: "monitor" | "plan" | "upgrade" | "critical" = "monitor"
        let estimatedCost = 0

        if (sixMonthPrediction > 90) {
          priority = "high"
          recommendedAction = "critical"
          estimatedCost = router.maxBandwidth * 1.2
        } else if (sixMonthPrediction > 80) {
          priority = "medium"
          recommendedAction = "upgrade"
          estimatedCost = router.maxBandwidth * 0.8
        } else if (sixMonthPrediction > 70) {
          priority = "low"
          recommendedAction = "plan"
          estimatedCost = router.maxBandwidth * 0.5
        }

        return {
          routerId: router.id,
          routerName: router.name,
          currentUtilization,
          predictedUtilization: Math.round(sixMonthPrediction),
          growthRate: router.growthRate,
          capacityReached,
          recommendedAction,
          estimatedCost,
          priority,
        }
      })
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
  }

  /**
   * Calculate network-wide forecast
   */
  static calculateNetworkForecast(routers: any[], months = 12): NetworkForecast {
    const activeRouters = routers.filter((r) => r.status !== "offline")

    const totalCapacity = activeRouters.reduce((sum, r) => sum + r.maxBandwidth, 0)
    const currentUsage = activeRouters.reduce((sum, r) => sum + r.currentBandwidth, 0)
    const avgGrowthRate = activeRouters.reduce((sum, r) => sum + r.growthRate, 0) / activeRouters.length

    const utilizationTrend = Array.from({ length: months + 1 }, (_, i) => {
      const predictedUsage = this.calculateGrowthPrediction(currentUsage, avgGrowthRate, i)
      return Math.round((predictedUsage / totalCapacity) * 100)
    })

    const predictedUsage = this.calculateGrowthPrediction(currentUsage, avgGrowthRate, months)
    const capacityGap = Math.max(0, predictedUsage - totalCapacity)

    const recommendations = this.generateRecommendations(routers)
    const recommendedInvestment = recommendations.reduce((sum, r) => sum + r.estimatedCost, 0)

    return {
      totalCapacity,
      currentUsage,
      predictedUsage: Math.round(predictedUsage),
      utilizationTrend,
      capacityGap: Math.round(capacityGap),
      recommendedInvestment,
    }
  }

  /**
   * Generate seasonal adjustment factors
   */
  static getSeasonalAdjustment(month: number): number {
    // Typical ISP usage patterns - higher in winter months
    const seasonalFactors = [
      1.1, // Jan
      1.05, // Feb
      1.0, // Mar
      0.95, // Apr
      0.9, // May
      0.85, // Jun
      0.8, // Jul
      0.85, // Aug
      0.9, // Sep
      0.95, // Oct
      1.0, // Nov
      1.1, // Dec
    ]

    return seasonalFactors[month] || 1.0
  }

  /**
   * Calculate ROI for infrastructure investments
   */
  static calculateROI(investmentCost: number, monthlyRevenue: number, maintenanceCost: number, years = 3): number {
    const totalRevenue = monthlyRevenue * 12 * years
    const totalMaintenance = maintenanceCost * 12 * years
    const netGain = totalRevenue - totalMaintenance - investmentCost

    return (netGain / investmentCost) * 100
  }
}

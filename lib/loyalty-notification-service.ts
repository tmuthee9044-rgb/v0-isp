import { smsService } from "./sms-service"

interface LoyaltyNotificationConfig {
  enableSMS: boolean
  enableEmail: boolean
  enableInApp: boolean
}

interface NotificationData {
  customerId: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  type: "points_earned" | "bonus_credited" | "points_redeemed" | "campaign_started" | "points_expiring"
  data: any
}

class LoyaltyNotificationService {
  private config: LoyaltyNotificationConfig = {
    enableSMS: true,
    enableEmail: true,
    enableInApp: true,
  }

  async sendPointsEarnedNotification(data: {
    customerId: string
    customerName: string
    customerPhone?: string
    pointsEarned: number
    totalPoints: number
    source: string
  }): Promise<void> {
    const message = `Congratulations ${data.customerName}! You earned ${data.pointsEarned} loyalty points from ${data.source}. Your current balance: ${data.totalPoints} points.`

    await this.sendNotification({
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      type: "points_earned",
      data: {
        pointsEarned: data.pointsEarned,
        totalPoints: data.totalPoints,
        source: data.source,
        message,
      },
    })
  }

  async sendBonusCreditedNotification(data: {
    customerId: string
    customerName: string
    customerPhone?: string
    bonusAmount: number
    newWalletBalance: number
    source: string
  }): Promise<void> {
    const message = `Great news ${data.customerName}! You received KES ${data.bonusAmount} bonus credit from ${data.source}. Your wallet balance: KES ${data.newWalletBalance}.`

    await this.sendNotification({
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      type: "bonus_credited",
      data: {
        bonusAmount: data.bonusAmount,
        newWalletBalance: data.newWalletBalance,
        source: data.source,
        message,
      },
    })
  }

  async sendPointsRedeemedNotification(data: {
    customerId: string
    customerName: string
    customerPhone?: string
    pointsRedeemed: number
    remainingPoints: number
    redemptionType: string
    redemptionValue: number
  }): Promise<void> {
    let message = `${data.customerName}, you successfully redeemed ${data.pointsRedeemed} points`

    if (data.redemptionType === "wallet_credit") {
      message += ` for KES ${data.redemptionValue} wallet credit.`
    } else if (data.redemptionType === "service_discount") {
      message += ` for KES ${data.redemptionValue} service discount.`
    } else if (data.redemptionType === "bandwidth_extension") {
      message += ` for ${data.redemptionValue} extra bandwidth days.`
    }

    message += ` Remaining points: ${data.remainingPoints}.`

    await this.sendNotification({
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      type: "points_redeemed",
      data: {
        pointsRedeemed: data.pointsRedeemed,
        remainingPoints: data.remainingPoints,
        redemptionType: data.redemptionType,
        redemptionValue: data.redemptionValue,
        message,
      },
    })
  }

  async sendCampaignNotification(data: {
    customerId: string
    customerName: string
    customerPhone?: string
    campaignName: string
    minAmount: number
    bonusPercentage: number
    pointsAwarded: number
    validUntil: string
  }): Promise<void> {
    const message = `${data.customerName}, exciting news! ${data.campaignName}: Top up KES ${data.minAmount} or more and get ${data.bonusPercentage}% cashback + ${data.pointsAwarded} loyalty points! Valid until ${new Date(data.validUntil).toLocaleDateString()}.`

    await this.sendNotification({
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      type: "campaign_started",
      data: {
        campaignName: data.campaignName,
        minAmount: data.minAmount,
        bonusPercentage: data.bonusPercentage,
        pointsAwarded: data.pointsAwarded,
        validUntil: data.validUntil,
        message,
      },
    })
  }

  async sendPointsExpiryNotification(data: {
    customerId: string
    customerName: string
    customerPhone?: string
    expiringPoints: number
    expiryDate: string
  }): Promise<void> {
    const message = `${data.customerName}, reminder: ${data.expiringPoints} loyalty points are expiring on ${new Date(data.expiryDate).toLocaleDateString()}. Redeem them before they expire!`

    await this.sendNotification({
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      type: "points_expiring",
      data: {
        expiringPoints: data.expiringPoints,
        expiryDate: data.expiryDate,
        message,
      },
    })
  }

  private async sendNotification(notificationData: NotificationData): Promise<void> {
    try {
      // Send SMS notification
      if (this.config.enableSMS && notificationData.customerPhone) {
        await smsService.sendLoyaltyNotification(notificationData.customerPhone, notificationData.data.message)
      }

      // Send in-app notification
      if (this.config.enableInApp) {
        await this.createInAppNotification(notificationData)
      }

      // Log notification
      await this.logNotification(notificationData)
    } catch (error) {
      console.error("[v0] Failed to send loyalty notification:", error)
    }
  }

  private async createInAppNotification(notificationData: NotificationData): Promise<void> {
    try {
      await fetch("/api/notifications/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: notificationData.customerId,
          type: notificationData.type,
          title: this.getNotificationTitle(notificationData.type),
          message: notificationData.data.message,
          data: notificationData.data,
        }),
      })
    } catch (error) {
      console.error("[v0] Failed to create in-app notification:", error)
    }
  }

  private async logNotification(notificationData: NotificationData): Promise<void> {
    try {
      await fetch("/api/notifications/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: notificationData.customerId,
          type: notificationData.type,
          channel: "loyalty",
          message: notificationData.data.message,
          status: "sent",
          data: notificationData.data,
        }),
      })
    } catch (error) {
      console.error("[v0] Failed to log notification:", error)
    }
  }

  private getNotificationTitle(type: string): string {
    switch (type) {
      case "points_earned":
        return "Loyalty Points Earned!"
      case "bonus_credited":
        return "Bonus Credit Added!"
      case "points_redeemed":
        return "Points Redeemed Successfully!"
      case "campaign_started":
        return "New Bonus Campaign!"
      case "points_expiring":
        return "Points Expiring Soon!"
      default:
        return "Loyalty Notification"
    }
  }
}

export const loyaltyNotificationService = new LoyaltyNotificationService()

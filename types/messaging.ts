export interface MessageTemplate {
  id: number
  name: string
  type: "email" | "sms"
  category: string
  subject?: string
  content: string
  variables: string[]
  created_at: string
  updated_at: string
  usage_count: number
  active: boolean
}

export interface Message {
  id: number
  type: "email" | "sms"
  recipient: string
  subject?: string
  content: string
  template_id?: number
  status: "pending" | "sent" | "delivered" | "failed" | "opened" | "bounced"
  sent_at?: string
  delivered_at?: string
  opened_at?: string
  bounced_at?: string
  error_message?: string
  campaign_id?: number
  customer_id: number
  external_id?: string
  cost?: number
  created_at: string
  updated_at: string
}

export interface MessageCampaign {
  id: number
  name: string
  description: string
  type: "email" | "sms" | "mixed"
  status: "draft" | "active" | "paused" | "completed"
  template_id?: number
  target_criteria: any
  scheduled_at?: string
  created_at: string
  updated_at: string
  total_recipients: number
  sent_count: number
  delivered_count: number
  opened_count: number
  failed_count: number
}

export interface MessageDeliveryLog {
  id: number
  message_id: number
  event_type: string
  event_data?: any
  external_id?: string
  webhook_data?: any
  created_at: string
}

export interface MessageUnsubscribe {
  id: number
  customer_id: number
  email?: string
  phone?: string
  type: "email" | "sms" | "all"
  reason?: string
  unsubscribed_at: string
}

export interface MessageAttachment {
  id: number
  message_id: number
  filename: string
  content_type?: string
  file_size?: number
  file_path: string
  created_at: string
}

export interface MessageAnalytics {
  id: number
  date: string
  type: "email" | "sms"
  total_sent: number
  total_delivered: number
  total_opened: number
  total_clicked: number
  total_bounced: number
  total_failed: number
  total_cost: number
  created_at: string
}

export interface MessageStats {
  total_messages: number
  sent_today: number
  sent_yesterday: number
  delivery_rate: number
  open_rate: number
  unread_count: number
  failed_count: number
  monthly_sent: number
  monthly_delivered: number
}

export interface Customer {
  id: number
  name: string
  email: string
  phone: string
  status: "active" | "suspended" | "overdue"
  plan: string
}

export interface SendMessageRequest {
  type: "email" | "sms"
  recipients: number[]
  subject?: string
  content: string
  template_id?: number
  campaign_id?: number
}

export interface CreateTemplateRequest {
  name: string
  type: "email" | "sms"
  category: string
  subject?: string
  content: string
}

export interface UpdateTemplateRequest extends CreateTemplateRequest {
  id: number
}

export interface CreateCampaignRequest {
  name: string
  description: string
  type: "email" | "sms" | "mixed"
  template_id?: number
  target_criteria: any
  scheduled_at?: string
}

export interface MessageHistoryFilters {
  type?: "email" | "sms"
  status?: string
  customer_id?: number
  campaign_id?: number
  date_from?: string
  date_to?: string
}

export interface CompanyProfile {
  id: string
  name: string
  tradingName?: string
  registrationNumber?: string
  taxNumber?: string
  description?: string
  industry?: string
  companySize?: string
  foundedYear?: number
  logo?: string
  primaryColor?: string
  secondaryColor?: string
  slogan?: string

  // Contact Information
  physicalAddress: string
  postalAddress?: string
  city: string
  country: string
  postalCode?: string
  timezone: string
  mainPhone: string
  supportPhone?: string
  mainEmail: string
  supportEmail?: string
  website?: string
  fax?: string

  // Localization
  language: string
  currency: string
  dateFormat: string
  timeFormat: string
  decimalSeparator: string
  thousandSeparator: string
  currencyPosition: string
  fiscalYearStart: string
  weekStart: string

  createdAt: Date
  updatedAt: Date
}

export interface ServerConfiguration {
  id: string

  // RADIUS Configuration
  radiusServer?: string
  radiusPort?: number
  radiusAccountingPort?: number
  radiusTimeout?: number
  radiusSecret?: string
  enablePAP?: boolean
  enableCHAP?: boolean
  enableMSCHAP?: boolean
  enableAccounting?: boolean

  // OpenVPN Configuration
  vpnServerIP?: string
  vpnPort?: number
  vpnProtocol?: "udp" | "tcp"
  vpnCipher?: string
  vpnNetwork?: string
  enableTLSAuth?: boolean
  enableClientToClient?: boolean
  enableDuplicateCN?: boolean
  enableCompression?: boolean
  primaryDNS?: string
  secondaryDNS?: string

  // Network Settings
  managementVLAN?: number
  customerVLANRange?: string
  snmpCommunity?: string
  ntpServer?: string
  enableFirewall?: boolean
  enableDDoSProtection?: boolean
  enablePortScanDetection?: boolean
  enableIntrusionDetection?: boolean
  defaultUploadLimit?: number
  defaultDownloadLimit?: number
  burstRatio?: number

  // Monitoring
  enableSNMPMonitoring?: boolean
  enableBandwidthMonitoring?: boolean
  enableUptimeMonitoring?: boolean
  enableAlertNotifications?: boolean
  monitoringInterval?: number
  alertThreshold?: number

  createdAt: Date
  updatedAt: Date
}

export interface PaymentGatewayConfig {
  id: string

  // M-Pesa Configuration
  mpesaEnvironment?: "sandbox" | "production"
  mpesaBusinessShortCode?: string
  mpesaConsumerKey?: string
  mpesaConsumerSecret?: string
  stkShortCode?: string
  stkPasskey?: string
  callbackURL?: string
  resultURL?: string
  c2bShortCode?: string
  c2bValidationURL?: string
  c2bConfirmationURL?: string
  responseType?: string

  // Bank Integration
  bankName?: string
  bankAccount?: string
  bankAPIKey?: string
  bankAPISecret?: string
  enableAutoReconciliation?: boolean
  enableRealtimeNotifications?: boolean
  minAmount?: number
  maxAmount?: number

  // Payment Methods
  enableMpesa?: boolean
  enableBankTransfer?: boolean
  enableCreditCard?: boolean
  enableCashPayments?: boolean

  // Processing Settings
  processingFee?: number
  minProcessingFee?: number
  paymentTimeout?: number
  retryAttempts?: number
  enableAutoRetry?: boolean
  enablePaymentReceipts?: boolean

  // Webhooks
  webhookURL?: string
  webhookSecret?: string
  enablePaymentSuccessful?: boolean
  enablePaymentFailed?: boolean
  enablePaymentPending?: boolean
  enableRefundProcessed?: boolean
  webhookTimeout?: number
  webhookMaxRetries?: number
  webhookRetryDelay?: number
  enableWebhookLogging?: boolean

  createdAt: Date
  updatedAt: Date
}

export interface CommunicationSettings {
  id: string

  // Email Configuration
  smtpHost?: string
  smtpPort?: number
  smtpUsername?: string
  smtpPassword?: string
  fromName?: string
  fromEmail?: string
  replyToEmail?: string
  encryption?: "none" | "tls" | "ssl"
  enableHTMLEmails?: boolean
  enableEmailTracking?: boolean
  enableAutoRetryEmails?: boolean
  enableEmailQueue?: boolean
  emailMaxRetries?: number
  emailRetryDelay?: number
  emailBatchSize?: number

  // SMS Configuration
  smsProvider?: string
  smsUsername?: string
  smsAPIKey?: string
  smsSenderID?: string
  smsEndpoint?: string
  enableDeliveryReports?: boolean
  enableUnicodeSupport?: boolean
  enableAutoRetrySMS?: boolean
  enableSMSQueue?: boolean
  smsMaxRetries?: number
  smsRetryDelay?: number
  smsBatchSize?: number
  smsCostPerMessage?: number
  dailySMSLimit?: number
  enableSMSBudgetAlerts?: boolean

  createdAt: Date
  updatedAt: Date
}

export interface UserManagementSettings {
  id: string

  // Auto-sync Settings
  enableAutoCreateAccounts?: boolean
  enableAutoDisableTerminated?: boolean
  enableSyncDepartmentChanges?: boolean
  enableSyncContactInfo?: boolean

  // Password Policy
  minPasswordLength?: number
  passwordExpiry?: number
  requireUppercase?: boolean
  requireNumbers?: boolean
  requireSpecialChars?: boolean
  preventPasswordReuse?: boolean

  // Session Management
  sessionTimeout?: number
  maxLoginAttempts?: number
  lockoutDuration?: number
  maxConcurrentSessions?: number
  forcePasswordChangeFirstLogin?: boolean
  enableRememberLogin?: boolean

  // Two-Factor Authentication
  enable2FAForAdmins?: boolean
  enableOptional2FA?: boolean
  allow2FASMS?: boolean
  allow2FAEmail?: boolean
  allow2FAAuthenticator?: boolean

  // Account Provisioning
  usernameFormat?: string
  emailDomain?: string
  defaultPasswordPolicy?: string
  notificationMethod?: string

  createdAt: Date
  updatedAt: Date
}

export interface PortalSettings {
  id: string

  // Customer Portal - Administrative
  customerPortalURL?: string
  customerPortalTitle?: string
  customerWelcomeMessage?: string
  allowSelfRegistration?: boolean
  requireEmailVerification?: boolean
  requireAdminApproval?: boolean
  customerSessionTimeout?: number

  // Customer Portal - System
  enableHTTPSOnly?: boolean
  enableRateLimiting?: boolean
  enableCAPTCHA?: boolean
  enableCaching?: boolean
  enableCompression?: boolean
  enableCDN?: boolean
  maxFileUploadSize?: number

  // Admin Portal - Administrative
  adminPortalURL?: string
  adminPortalTitle?: string
  enableIPWhitelist?: boolean
  require2FAForAllAdmins?: boolean
  enableSingleSession?: boolean
  allowedIPs?: string
  adminSessionTimeout?: number

  // Admin Portal - System
  enableAuditLogging?: boolean
  logFailedLoginAttempts?: boolean
  logDataChanges?: boolean
  enableAutoDatabaseBackup?: boolean
  enableConfigurationBackup?: boolean
  backupRetention?: number

  // Themes & Branding
  customerTheme?: string
  customerPrimaryColor?: string
  customerSecondaryColor?: string
  customerFontFamily?: string
  adminTheme?: string
  adminPrimaryColor?: string
  adminAccentColor?: string
  adminSidebarStyle?: string
  customerCustomCSS?: string
  adminCustomCSS?: string

  // Features
  enableCustomerDashboard?: boolean
  enableBillPayment?: boolean
  enableUsageStatistics?: boolean
  enableServiceManagement?: boolean
  enableSupportTickets?: boolean
  enablePaymentHistory?: boolean
  enableProfileManagement?: boolean
  enableReferralProgram?: boolean
  enableLiveChatSupport?: boolean
  enableMobileAppDownload?: boolean

  enableCustomerManagement?: boolean
  enableBillingFinance?: boolean
  enableNetworkManagement?: boolean
  enableSupportSystem?: boolean
  enableUserManagement?: boolean
  enableReportsAnalytics?: boolean
  enableInventoryManagement?: boolean
  enableTaskManagement?: boolean
  enableHRManagement?: boolean
  enableVehicleManagement?: boolean

  // Notifications
  enableCustomerBillReminders?: boolean
  enableCustomerServiceAlerts?: boolean
  enableCustomerPromotionalOffers?: boolean
  enableCustomerMaintenanceNotifications?: boolean
  enableAdminSystemAlerts?: boolean
  enableAdminNewCustomerNotifications?: boolean
  enableAdminPaymentFailureNotifications?: boolean
  enableAdminTaskAssignmentNotifications?: boolean

  createdAt: Date
  updatedAt: Date
}

export interface AutomationWorkflow {
  id: string
  name: string
  description?: string
  trigger: string
  triggerConditions?: any
  actions: AutomationAction[]
  status: "active" | "paused" | "error"
  lastRun?: Date
  executions: number
  successRate: number
  createdAt: Date
  updatedAt: Date
}

export interface AutomationAction {
  id: string
  type: string
  configuration: any
  order: number
}

export interface AutomationTrigger {
  id: string
  name: string
  description: string
  category: string
  conditions?: any
  isCustom: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ScheduledTask {
  id: string
  name: string
  description?: string
  taskType: string
  schedule: string
  timezone: string
  status: "active" | "paused" | "error"
  nextRun?: Date
  lastRun?: Date
  configuration?: any
  createdAt: Date
  updatedAt: Date
}

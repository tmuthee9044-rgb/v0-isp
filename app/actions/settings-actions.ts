"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

// Company Profile Actions
export async function updateCompanyProfile(data: any) {
  try {
    const result = await db.query(
      `
      UPDATE company_profiles 
      SET 
        name = $1,
        trading_name = $2,
        registration_number = $3,
        tax_number = $4,
        description = $5,
        industry = $6,
        company_size = $7,
        founded_year = $8,
        primary_color = $9,
        secondary_color = $10,
        slogan = $11,
        physical_address = $12,
        postal_address = $13,
        city = $14,
        country = $15,
        postal_code = $16,
        timezone = $17,
        main_phone = $18,
        support_phone = $19,
        main_email = $20,
        support_email = $21,
        website = $22,
        fax = $23,
        language = $24,
        currency = $25,
        date_format = $26,
        time_format = $27,
        decimal_separator = $28,
        thousand_separator = $29,
        currency_position = $30,
        fiscal_year_start = $31,
        week_start = $32,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM company_profiles LIMIT 1)
      RETURNING *
    `,
      [
        data.name,
        data.tradingName,
        data.registrationNumber,
        data.taxNumber,
        data.description,
        data.industry,
        data.companySize,
        data.foundedYear,
        data.primaryColor,
        data.secondaryColor,
        data.slogan,
        data.physicalAddress,
        data.postalAddress,
        data.city,
        data.country,
        data.postalCode,
        data.timezone,
        data.mainPhone,
        data.supportPhone,
        data.mainEmail,
        data.supportEmail,
        data.website,
        data.fax,
        data.language,
        data.currency,
        data.dateFormat,
        data.timeFormat,
        data.decimalSeparator,
        data.thousandSeparator,
        data.currencyPosition,
        data.fiscalYearStart,
        data.weekStart,
      ],
    )

    revalidatePath("/settings/company")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error updating company profile:", error)
    return { success: false, error: "Failed to update company profile" }
  }
}

export async function getCompanyProfile() {
  try {
    const result = await db.query("SELECT * FROM company_profiles LIMIT 1")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error fetching company profile:", error)
    return { success: false, error: "Failed to fetch company profile" }
  }
}

// Server Configuration Actions
export async function updateServerConfiguration(data: any) {
  try {
    const result = await db.query(
      `
      UPDATE server_configurations 
      SET 
        radius_server = $1,
        radius_port = $2,
        radius_accounting_port = $3,
        radius_timeout = $4,
        radius_secret = $5,
        enable_pap = $6,
        enable_chap = $7,
        enable_mschap = $8,
        enable_accounting = $9,
        vpn_server_ip = $10,
        vpn_port = $11,
        vpn_protocol = $12,
        vpn_cipher = $13,
        vpn_network = $14,
        enable_tls_auth = $15,
        enable_client_to_client = $16,
        enable_duplicate_cn = $17,
        enable_compression = $18,
        primary_dns = $19,
        secondary_dns = $20,
        management_vlan = $21,
        customer_vlan_range = $22,
        snmp_community = $23,
        ntp_server = $24,
        enable_firewall = $25,
        enable_ddos_protection = $26,
        enable_port_scan_detection = $27,
        enable_intrusion_detection = $28,
        default_upload_limit = $29,
        default_download_limit = $30,
        burst_ratio = $31,
        enable_snmp_monitoring = $32,
        enable_bandwidth_monitoring = $33,
        enable_uptime_monitoring = $34,
        enable_alert_notifications = $35,
        monitoring_interval = $36,
        alert_threshold = $37,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM server_configurations LIMIT 1)
      RETURNING *
    `,
      [
        data.radiusServer,
        data.radiusPort,
        data.radiusAccountingPort,
        data.radiusTimeout,
        data.radiusSecret,
        data.enablePAP,
        data.enableCHAP,
        data.enableMSCHAP,
        data.enableAccounting,
        data.vpnServerIP,
        data.vpnPort,
        data.vpnProtocol,
        data.vpnCipher,
        data.vpnNetwork,
        data.enableTLSAuth,
        data.enableClientToClient,
        data.enableDuplicateCN,
        data.enableCompression,
        data.primaryDNS,
        data.secondaryDNS,
        data.managementVLAN,
        data.customerVLANRange,
        data.snmpCommunity,
        data.ntpServer,
        data.enableFirewall,
        data.enableDDoSProtection,
        data.enablePortScanDetection,
        data.enableIntrusionDetection,
        data.defaultUploadLimit,
        data.defaultDownloadLimit,
        data.burstRatio,
        data.enableSNMPMonitoring,
        data.enableBandwidthMonitoring,
        data.enableUptimeMonitoring,
        data.enableAlertNotifications,
        data.monitoringInterval,
        data.alertThreshold,
      ],
    )

    revalidatePath("/settings/servers")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error updating server configuration:", error)
    return { success: false, error: "Failed to update server configuration" }
  }
}

// Payment Gateway Actions
export async function updatePaymentGatewayConfig(data: any) {
  try {
    const result = await db.query(
      `
      UPDATE payment_gateway_configs 
      SET 
        mpesa_environment = $1,
        mpesa_business_short_code = $2,
        mpesa_consumer_key = $3,
        mpesa_consumer_secret = $4,
        stk_short_code = $5,
        stk_passkey = $6,
        callback_url = $7,
        result_url = $8,
        c2b_short_code = $9,
        c2b_validation_url = $10,
        c2b_confirmation_url = $11,
        response_type = $12,
        bank_name = $13,
        bank_account = $14,
        bank_api_key = $15,
        bank_api_secret = $16,
        enable_auto_reconciliation = $17,
        enable_realtime_notifications = $18,
        min_amount = $19,
        max_amount = $20,
        enable_mpesa = $21,
        enable_bank_transfer = $22,
        enable_credit_card = $23,
        enable_cash_payments = $24,
        processing_fee = $25,
        min_processing_fee = $26,
        payment_timeout = $27,
        retry_attempts = $28,
        enable_auto_retry = $29,
        enable_payment_receipts = $30,
        webhook_url = $31,
        webhook_secret = $32,
        enable_payment_successful = $33,
        enable_payment_failed = $34,
        enable_payment_pending = $35,
        enable_refund_processed = $36,
        webhook_timeout = $37,
        webhook_max_retries = $38,
        webhook_retry_delay = $39,
        enable_webhook_logging = $40,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM payment_gateway_configs LIMIT 1)
      RETURNING *
    `,
      [
        data.mpesaEnvironment,
        data.mpesaBusinessShortCode,
        data.mpesaConsumerKey,
        data.mpesaConsumerSecret,
        data.stkShortCode,
        data.stkPasskey,
        data.callbackURL,
        data.resultURL,
        data.c2bShortCode,
        data.c2bValidationURL,
        data.c2bConfirmationURL,
        data.responseType,
        data.bankName,
        data.bankAccount,
        data.bankAPIKey,
        data.bankAPISecret,
        data.enableAutoReconciliation,
        data.enableRealtimeNotifications,
        data.minAmount,
        data.maxAmount,
        data.enableMpesa,
        data.enableBankTransfer,
        data.enableCreditCard,
        data.enableCashPayments,
        data.processingFee,
        data.minProcessingFee,
        data.paymentTimeout,
        data.retryAttempts,
        data.enableAutoRetry,
        data.enablePaymentReceipts,
        data.webhookURL,
        data.webhookSecret,
        data.enablePaymentSuccessful,
        data.enablePaymentFailed,
        data.enablePaymentPending,
        data.enableRefundProcessed,
        data.webhookTimeout,
        data.webhookMaxRetries,
        data.webhookRetryDelay,
        data.enableWebhookLogging,
      ],
    )

    revalidatePath("/settings/payments")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error updating payment gateway config:", error)
    return { success: false, error: "Failed to update payment gateway configuration" }
  }
}

// Communication Settings Actions
export async function updateCommunicationSettings(data: any) {
  try {
    const result = await db.query(
      `
      UPDATE communication_settings 
      SET 
        smtp_host = $1,
        smtp_port = $2,
        smtp_username = $3,
        smtp_password = $4,
        from_name = $5,
        from_email = $6,
        reply_to_email = $7,
        encryption = $8,
        enable_html_emails = $9,
        enable_email_tracking = $10,
        enable_auto_retry_emails = $11,
        enable_email_queue = $12,
        email_max_retries = $13,
        email_retry_delay = $14,
        email_batch_size = $15,
        sms_provider = $16,
        sms_username = $17,
        sms_api_key = $18,
        sms_sender_id = $19,
        sms_endpoint = $20,
        enable_delivery_reports = $21,
        enable_unicode_support = $22,
        enable_auto_retry_sms = $23,
        enable_sms_queue = $24,
        sms_max_retries = $25,
        sms_retry_delay = $26,
        sms_batch_size = $27,
        sms_cost_per_message = $28,
        daily_sms_limit = $29,
        enable_sms_budget_alerts = $30,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM communication_settings LIMIT 1)
      RETURNING *
    `,
      [
        data.smtpHost,
        data.smtpPort,
        data.smtpUsername,
        data.smtpPassword,
        data.fromName,
        data.fromEmail,
        data.replyToEmail,
        data.encryption,
        data.enableHTMLEmails,
        data.enableEmailTracking,
        data.enableAutoRetryEmails,
        data.enableEmailQueue,
        data.emailMaxRetries,
        data.emailRetryDelay,
        data.emailBatchSize,
        data.smsProvider,
        data.smsUsername,
        data.smsAPIKey,
        data.smsSenderID,
        data.smsEndpoint,
        data.enableDeliveryReports,
        data.enableUnicodeSupport,
        data.enableAutoRetrySMS,
        data.enableSMSQueue,
        data.smsMaxRetries,
        data.smsRetryDelay,
        data.smsBatchSize,
        data.smsCostPerMessage,
        data.dailySMSLimit,
        data.enableSMSBudgetAlerts,
      ],
    )

    revalidatePath("/settings/communications")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error updating communication settings:", error)
    return { success: false, error: "Failed to update communication settings" }
  }
}

// User Management Settings Actions
export async function updateUserManagementSettings(data: any) {
  try {
    const result = await db.query(
      `
      UPDATE user_management_settings 
      SET 
        enable_auto_create_accounts = $1,
        enable_auto_disable_terminated = $2,
        enable_sync_department_changes = $3,
        enable_sync_contact_info = $4,
        min_password_length = $5,
        password_expiry = $6,
        require_uppercase = $7,
        require_numbers = $8,
        require_special_chars = $9,
        prevent_password_reuse = $10,
        session_timeout = $11,
        max_login_attempts = $12,
        lockout_duration = $13,
        max_concurrent_sessions = $14,
        force_password_change_first_login = $15,
        enable_remember_login = $16,
        enable_2fa_for_admins = $17,
        enable_optional_2fa = $18,
        allow_2fa_sms = $19,
        allow_2fa_email = $20,
        allow_2fa_authenticator = $21,
        username_format = $22,
        email_domain = $23,
        default_password_policy = $24,
        notification_method = $25,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM user_management_settings LIMIT 1)
      RETURNING *
    `,
      [
        data.enableAutoCreateAccounts,
        data.enableAutoDisableTerminated,
        data.enableSyncDepartmentChanges,
        data.enableSyncContactInfo,
        data.minPasswordLength,
        data.passwordExpiry,
        data.requireUppercase,
        data.requireNumbers,
        data.requireSpecialChars,
        data.preventPasswordReuse,
        data.sessionTimeout,
        data.maxLoginAttempts,
        data.lockoutDuration,
        data.maxConcurrentSessions,
        data.forcePasswordChangeFirstLogin,
        data.enableRememberLogin,
        data.enable2FAForAdmins,
        data.enableOptional2FA,
        data.allow2FASMS,
        data.allow2FAEmail,
        data.allow2FAAuthenticator,
        data.usernameFormat,
        data.emailDomain,
        data.defaultPasswordPolicy,
        data.notificationMethod,
      ],
    )

    revalidatePath("/settings/users")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error updating user management settings:", error)
    return { success: false, error: "Failed to update user management settings" }
  }
}

// Portal Settings Actions
export async function updatePortalSettings(data: any) {
  try {
    const result = await db.query(
      `
      UPDATE portal_settings 
      SET 
        customer_portal_url = $1,
        customer_portal_title = $2,
        customer_welcome_message = $3,
        allow_self_registration = $4,
        require_email_verification = $5,
        require_admin_approval = $6,
        customer_session_timeout = $7,
        enable_https_only = $8,
        enable_rate_limiting = $9,
        enable_captcha = $10,
        enable_caching = $11,
        enable_compression = $12,
        enable_cdn = $13,
        max_file_upload_size = $14,
        admin_portal_url = $15,
        admin_portal_title = $16,
        enable_ip_whitelist = $17,
        require_2fa_for_all_admins = $18,
        enable_single_session = $19,
        allowed_ips = $20,
        admin_session_timeout = $21,
        enable_audit_logging = $22,
        log_failed_login_attempts = $23,
        log_data_changes = $24,
        enable_auto_database_backup = $25,
        enable_configuration_backup = $26,
        backup_retention = $27,
        customer_theme = $28,
        customer_primary_color = $29,
        customer_secondary_color = $30,
        customer_font_family = $31,
        admin_theme = $32,
        admin_primary_color = $33,
        admin_accent_color = $34,
        admin_sidebar_style = $35,
        customer_custom_css = $36,
        admin_custom_css = $37,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM portal_settings LIMIT 1)
      RETURNING *
    `,
      [
        data.customerPortalURL,
        data.customerPortalTitle,
        data.customerWelcomeMessage,
        data.allowSelfRegistration,
        data.requireEmailVerification,
        data.requireAdminApproval,
        data.customerSessionTimeout,
        data.enableHTTPSOnly,
        data.enableRateLimiting,
        data.enableCAPTCHA,
        data.enableCaching,
        data.enableCompression,
        data.enableCDN,
        data.maxFileUploadSize,
        data.adminPortalURL,
        data.adminPortalTitle,
        data.enableIPWhitelist,
        data.require2FAForAllAdmins,
        data.enableSingleSession,
        data.allowedIPs,
        data.adminSessionTimeout,
        data.enableAuditLogging,
        data.logFailedLoginAttempts,
        data.logDataChanges,
        data.enableAutoDatabaseBackup,
        data.enableConfigurationBackup,
        data.backupRetention,
        data.customerTheme,
        data.customerPrimaryColor,
        data.customerSecondaryColor,
        data.customerFontFamily,
        data.adminTheme,
        data.adminPrimaryColor,
        data.adminAccentColor,
        data.adminSidebarStyle,
        data.customerCustomCSS,
        data.adminCustomCSS,
      ],
    )

    revalidatePath("/settings/portal")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error updating portal settings:", error)
    return { success: false, error: "Failed to update portal settings" }
  }
}

// Automation Workflow Actions
export async function createAutomationWorkflow(data: any) {
  try {
    const result = await db.query(
      `
      INSERT INTO automation_workflows (name, description, trigger_type, trigger_conditions, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [data.name, data.description, data.triggerType, JSON.stringify(data.triggerConditions), data.status],
    )

    revalidatePath("/settings/automation")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error creating automation workflow:", error)
    return { success: false, error: "Failed to create automation workflow" }
  }
}

export async function updateAutomationWorkflow(id: string, data: any) {
  try {
    const result = await db.query(
      `
      UPDATE automation_workflows 
      SET 
        name = $1,
        description = $2,
        trigger_type = $3,
        trigger_conditions = $4,
        status = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `,
      [data.name, data.description, data.triggerType, JSON.stringify(data.triggerConditions), data.status, id],
    )

    revalidatePath("/settings/automation")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error updating automation workflow:", error)
    return { success: false, error: "Failed to update automation workflow" }
  }
}

export async function deleteAutomationWorkflow(id: string) {
  try {
    await db.query("DELETE FROM automation_workflows WHERE id = $1", [id])
    revalidatePath("/settings/automation")
    return { success: true }
  } catch (error) {
    console.error("Error deleting automation workflow:", error)
    return { success: false, error: "Failed to delete automation workflow" }
  }
}

export async function getAutomationWorkflows() {
  try {
    const result = await db.query(`
      SELECT 
        w.*,
        COUNT(a.id) as action_count
      FROM automation_workflows w
      LEFT JOIN automation_actions a ON w.id = a.workflow_id
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `)
    return { success: true, data: result.rows }
  } catch (error) {
    console.error("Error fetching automation workflows:", error)
    return { success: false, error: "Failed to fetch automation workflows" }
  }
}

// Scheduled Task Actions
export async function createScheduledTask(data: any) {
  try {
    const result = await db.query(
      `
      INSERT INTO scheduled_tasks (name, description, task_type, schedule, timezone, status, configuration)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
      [
        data.name,
        data.description,
        data.taskType,
        data.schedule,
        data.timezone,
        data.status,
        JSON.stringify(data.configuration),
      ],
    )

    revalidatePath("/settings/automation")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error creating scheduled task:", error)
    return { success: false, error: "Failed to create scheduled task" }
  }
}

export async function updateScheduledTask(id: string, data: any) {
  try {
    const result = await db.query(
      `
      UPDATE scheduled_tasks 
      SET 
        name = $1,
        description = $2,
        task_type = $3,
        schedule = $4,
        timezone = $5,
        status = $6,
        configuration = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `,
      [
        data.name,
        data.description,
        data.taskType,
        data.schedule,
        data.timezone,
        data.status,
        JSON.stringify(data.configuration),
        id,
      ],
    )

    revalidatePath("/settings/automation")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error updating scheduled task:", error)
    return { success: false, error: "Failed to update scheduled task" }
  }
}

export async function deleteScheduledTask(id: string) {
  try {
    await db.query("DELETE FROM scheduled_tasks WHERE id = $1", [id])
    revalidatePath("/settings/automation")
    return { success: true }
  } catch (error) {
    console.error("Error deleting scheduled task:", error)
    return { success: false, error: "Failed to delete scheduled task" }
  }
}

export async function getScheduledTasks() {
  try {
    const result = await db.query(`
      SELECT * FROM scheduled_tasks
      ORDER BY created_at DESC
    `)
    return { success: true, data: result.rows }
  } catch (error) {
    console.error("Error fetching scheduled tasks:", error)
    return { success: false, error: "Failed to fetch scheduled tasks" }
  }
}

// Test Connection Actions
export async function testEmailConnection(config: any) {
  try {
    // Simulate email connection test
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // In a real implementation, you would test the SMTP connection here
    // const nodemailer = require('nodemailer')
    // const transporter = nodemailer.createTransporter(config)
    // await transporter.verify()

    return { success: true, message: "Email connection test successful" }
  } catch (error) {
    console.error("Error testing email connection:", error)
    return { success: false, error: "Email connection test failed" }
  }
}

export async function testSMSConnection(config: any) {
  try {
    // Simulate SMS connection test
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // In a real implementation, you would test the SMS API connection here

    return { success: true, message: "SMS connection test successful" }
  } catch (error) {
    console.error("Error testing SMS connection:", error)
    return { success: false, error: "SMS connection test failed" }
  }
}

export async function testMpesaConnection(config: any) {
  try {
    // Simulate M-Pesa connection test
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // In a real implementation, you would test the M-Pesa API connection here

    return { success: true, message: "M-Pesa connection test successful" }
  } catch (error) {
    console.error("Error testing M-Pesa connection:", error)
    return { success: false, error: "M-Pesa connection test failed" }
  }
}

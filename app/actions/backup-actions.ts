"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

// Backup Settings Actions
export async function updateBackupSettings(data: any) {
  try {
    const result = await db.query(
      `
      UPDATE backup_settings 
      SET 
        enable_database_backup = $1,
        database_retention_days = $2,
        database_compression = $3,
        backup_customers = $4,
        backup_billing = $5,
        backup_network = $6,
        backup_logs = $7,
        backup_settings = $8,
        enable_file_backup = $9,
        file_retention_days = $10,
        backup_paths = $11,
        exclude_patterns = $12,
        enable_encryption = $13,
        encryption_key = $14,
        enable_integrity_check = $15,
        enable_secure_delete = $16,
        enable_access_logging = $17,
        enable_notifications = $18,
        enable_scheduled_backups = $19,
        full_backup_frequency = $20,
        full_backup_time = $21,
        full_backup_day = $22,
        incremental_frequency = $23,
        incremental_time = $24,
        incremental_interval = $25,
        maintenance_start = $26,
        maintenance_end = $27,
        enable_local_storage = $28,
        local_storage_path = $29,
        local_storage_quota = $30,
        local_cleanup_policy = $31,
        enable_cloud_storage = $32,
        cloud_provider = $33,
        cloud_bucket = $34,
        cloud_region = $35,
        cloud_access_key = $36,
        cloud_secret_key = $37,
        enable_remote_storage = $38,
        remote_protocol = $39,
        remote_host = $40,
        remote_port = $41,
        remote_path = $42,
        remote_username = $43,
        remote_password = $44,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM backup_settings LIMIT 1)
      RETURNING *
    `,
      [
        data.enableDatabaseBackup,
        data.databaseRetentionDays,
        data.databaseCompression,
        data.backupCustomers,
        data.backupBilling,
        data.backupNetwork,
        data.backupLogs,
        data.backupSettings,
        data.enableFileBackup,
        data.fileRetentionDays,
        data.backupPaths,
        data.excludePatterns,
        data.enableEncryption,
        data.encryptionKey,
        data.enableIntegrityCheck,
        data.enableSecureDelete,
        data.enableAccessLogging,
        data.enableNotifications,
        data.enableScheduledBackups,
        data.fullBackupFrequency,
        data.fullBackupTime,
        data.fullBackupDay,
        data.incrementalFrequency,
        data.incrementalTime,
        data.incrementalInterval,
        data.maintenanceStart,
        data.maintenanceEnd,
        data.enableLocalStorage,
        data.localStoragePath,
        data.localStorageQuota,
        data.localCleanupPolicy,
        data.enableCloudStorage,
        data.cloudProvider,
        data.cloudBucket,
        data.cloudRegion,
        data.cloudAccessKey,
        data.cloudSecretKey,
        data.enableRemoteStorage,
        data.remoteProtocol,
        data.remoteHost,
        data.remotePort,
        data.remotePath,
        data.remoteUsername,
        data.remotePassword,
      ],
    )

    revalidatePath("/settings/backup")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error updating backup settings:", error)
    return { success: false, error: "Failed to update backup settings" }
  }
}

export async function getBackupSettings() {
  try {
    const result = await db.query("SELECT * FROM backup_settings LIMIT 1")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error fetching backup settings:", error)
    return { success: false, error: "Failed to fetch backup settings" }
  }
}

// Backup Job Actions
export async function createBackupJob(data: any) {
  try {
    const result = await db.query(
      `
      INSERT INTO backup_jobs (
        backup_type, 
        description,
        status,
        started_at,
        storage_location,
        estimated_size
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)
      RETURNING *
    `,
      [data.type, data.description, "running", "local", "0 MB"],
    )

    revalidatePath("/settings/backup")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error creating backup job:", error)
    return { success: false, error: "Failed to create backup job" }
  }
}

export async function getBackupHistory() {
  try {
    const result = await db.query(`
      SELECT 
        id,
        backup_type,
        description,
        status,
        started_at,
        completed_at,
        file_size,
        storage_location,
        error_message,
        EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds
      FROM backup_jobs
      ORDER BY started_at DESC
      LIMIT 50
    `)
    return { success: true, data: result.rows }
  } catch (error) {
    console.error("Error fetching backup history:", error)
    return { success: false, error: "Failed to fetch backup history" }
  }
}

export async function restoreFromBackup(backupId: string) {
  try {
    // In a real implementation, this would trigger the restore process
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const result = await db.query(
      `
      INSERT INTO backup_restore_logs (
        backup_job_id,
        status,
        started_at,
        restore_type
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
      RETURNING *
    `,
      [backupId, "completed", "full"],
    )

    revalidatePath("/settings/backup")
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error restoring from backup:", error)
    return { success: false, error: "Failed to restore from backup" }
  }
}

export async function deleteBackup(backupId: string) {
  try {
    await db.query("DELETE FROM backup_jobs WHERE id = $1", [backupId])
    revalidatePath("/settings/backup")
    return { success: true }
  } catch (error) {
    console.error("Error deleting backup:", error)
    return { success: false, error: "Failed to delete backup" }
  }
}

// Test Connection Actions
export async function testBackupConnection(type: string) {
  try {
    // Simulate connection test
    await new Promise((resolve) => setTimeout(resolve, 2000))

    switch (type) {
      case "local":
        // Test local storage access
        return { success: true, message: "Local storage connection successful" }
      case "cloud":
        // Test cloud storage connection
        return { success: true, message: "Cloud storage connection successful" }
      case "remote":
        // Test remote server connection
        return { success: true, message: "Remote server connection successful" }
      default:
        return { success: false, error: "Unknown connection type" }
    }
  } catch (error) {
    console.error("Error testing backup connection:", error)
    return { success: false, error: "Connection test failed" }
  }
}

// Backup Statistics
export async function getBackupStatistics() {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_backups,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_backups,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_backups,
        SUM(CASE WHEN file_size IS NOT NULL THEN CAST(REGEXP_REPLACE(file_size, '[^0-9.]', '', 'g') AS NUMERIC) ELSE 0 END) as total_size_mb,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
      FROM backup_jobs
      WHERE started_at >= CURRENT_DATE - INTERVAL '30 days'
    `)
    return { success: true, data: result.rows[0] }
  } catch (error) {
    console.error("Error fetching backup statistics:", error)
    return { success: false, error: "Failed to fetch backup statistics" }
  }
}

// Cleanup old backups
export async function cleanupOldBackups() {
  try {
    const settings = await getBackupSettings()
    if (!settings.success) {
      return { success: false, error: "Failed to get backup settings" }
    }

    const retentionDays = settings.data.database_retention_days || 30

    const result = await db.query(
      `
      DELETE FROM backup_jobs 
      WHERE started_at < CURRENT_DATE - INTERVAL '$1 days'
      AND status = 'completed'
    `,
      [retentionDays],
    )

    return { success: true, message: `Cleaned up ${result.rowCount} old backups` }
  } catch (error) {
    console.error("Error cleaning up old backups:", error)
    return { success: false, error: "Failed to cleanup old backups" }
  }
}

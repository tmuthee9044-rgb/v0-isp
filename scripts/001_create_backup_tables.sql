-- Backup-related tables (continuing from previous script)

-- 6. backup_file_inventory
CREATE TABLE IF NOT EXISTS backup_file_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_job_id UUID,
    file_path VARCHAR(1000),
    file_type VARCHAR(50),
    file_size BIGINT,
    file_hash VARCHAR(255),
    is_encrypted BOOLEAN DEFAULT false,
    compression_ratio NUMERIC,
    last_modified TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. backup_jobs
CREATE TABLE IF NOT EXISTS backup_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    backup_path VARCHAR(1000),
    file_size VARCHAR(50),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    checksum VARCHAR(255),
    compression_ratio NUMERIC,
    encryption_used BOOLEAN DEFAULT false,
    storage_location VARCHAR(255),
    local_path VARCHAR(1000),
    remote_path VARCHAR(1000),
    cloud_path VARCHAR(1000),
    includes_database BOOLEAN DEFAULT true,
    includes_files BOOLEAN DEFAULT true,
    includes_config BOOLEAN DEFAULT true,
    includes_logs BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. backup_restore_logs
CREATE TABLE IF NOT EXISTS backup_restore_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_job_id UUID,
    restore_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    restored_by VARCHAR(255),
    restore_location VARCHAR(1000),
    restored_components TEXT[],
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. backup_schedules
CREATE TABLE IF NOT EXISTS backup_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    backup_type VARCHAR(50),
    cron_expression VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    storage_locations TEXT[],
    backup_components JSONB,
    retention_policy JSONB,
    total_runs INTEGER DEFAULT 0,
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    average_duration_minutes NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. backup_settings
CREATE TABLE IF NOT EXISTS backup_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enable_database_backup BOOLEAN DEFAULT true,
    enable_file_backup BOOLEAN DEFAULT true,
    enable_scheduled_backups BOOLEAN DEFAULT true,
    enable_local_storage BOOLEAN DEFAULT true,
    enable_remote_storage BOOLEAN DEFAULT false,
    enable_cloud_storage BOOLEAN DEFAULT false,
    enable_encryption BOOLEAN DEFAULT false,
    enable_notifications BOOLEAN DEFAULT true,
    enable_integrity_check BOOLEAN DEFAULT true,
    enable_access_logging BOOLEAN DEFAULT true,
    enable_secure_delete BOOLEAN DEFAULT false,
    full_backup_frequency VARCHAR(50) DEFAULT 'weekly',
    full_backup_day VARCHAR(20) DEFAULT 'sunday',
    full_backup_time TIME WITHOUT TIME ZONE DEFAULT '02:00',
    incremental_frequency VARCHAR(50) DEFAULT 'daily',
    incremental_interval INTEGER DEFAULT 1,
    incremental_time TIME WITHOUT TIME ZONE DEFAULT '03:00',
    database_retention_days INTEGER DEFAULT 30,
    file_retention_days INTEGER DEFAULT 60,
    database_compression VARCHAR(50) DEFAULT 'gzip',
    local_storage_path VARCHAR(1000) DEFAULT '/var/backups/isp',
    local_storage_quota INTEGER DEFAULT 100,
    local_cleanup_policy VARCHAR(50) DEFAULT 'oldest_first',
    remote_protocol VARCHAR(20) DEFAULT 'sftp',
    remote_host VARCHAR(255),
    remote_port INTEGER DEFAULT 22,
    remote_username VARCHAR(255),
    remote_password TEXT,
    remote_path VARCHAR(1000),
    cloud_provider VARCHAR(50),
    cloud_region VARCHAR(100),
    cloud_bucket VARCHAR(255),
    cloud_access_key TEXT,
    cloud_secret_key TEXT,
    backup_paths TEXT,
    exclude_patterns TEXT,
    encryption_key TEXT,
    backup_customers BOOLEAN DEFAULT true,
    backup_billing BOOLEAN DEFAULT true,
    backup_network BOOLEAN DEFAULT true,
    backup_logs BOOLEAN DEFAULT false,
    backup_settings BOOLEAN DEFAULT true,
    maintenance_start TIME WITHOUT TIME ZONE DEFAULT '01:00',
    maintenance_end TIME WITHOUT TIME ZONE DEFAULT '05:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. backup_storage_locations
CREATE TABLE IF NOT EXISTS backup_storage_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    storage_type VARCHAR(50),
    connection_string TEXT,
    access_credentials JSONB,
    configuration JSONB,
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    total_capacity_gb NUMERIC,
    used_space_gb NUMERIC DEFAULT 0,
    available_space_gb NUMERIC,
    last_tested TIMESTAMP WITH TIME ZONE,
    test_status VARCHAR(50),
    test_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

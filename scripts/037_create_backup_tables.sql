-- Backup Settings Table
CREATE TABLE IF NOT EXISTS backup_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Database Backup Settings
    enable_database_backup BOOLEAN DEFAULT true,
    database_retention_days INTEGER DEFAULT 30,
    database_compression VARCHAR(20) DEFAULT 'medium',
    backup_customers BOOLEAN DEFAULT true,
    backup_billing BOOLEAN DEFAULT true,
    backup_network BOOLEAN DEFAULT true,
    backup_logs BOOLEAN DEFAULT false,
    backup_settings BOOLEAN DEFAULT true,
    
    -- File System Backup Settings
    enable_file_backup BOOLEAN DEFAULT true,
    file_retention_days INTEGER DEFAULT 14,
    backup_paths TEXT DEFAULT '/etc/config
/var/uploads
/opt/certificates',
    exclude_patterns TEXT DEFAULT '*.tmp
*.log
cache/*',
    
    -- Security Settings
    enable_encryption BOOLEAN DEFAULT true,
    encryption_key TEXT,
    enable_integrity_check BOOLEAN DEFAULT true,
    enable_secure_delete BOOLEAN DEFAULT false,
    enable_access_logging BOOLEAN DEFAULT true,
    enable_notifications BOOLEAN DEFAULT true,
    
    -- Schedule Settings
    enable_scheduled_backups BOOLEAN DEFAULT true,
    full_backup_frequency VARCHAR(20) DEFAULT 'weekly',
    full_backup_time TIME DEFAULT '02:00:00',
    full_backup_day VARCHAR(20) DEFAULT 'sunday',
    incremental_frequency VARCHAR(20) DEFAULT 'daily',
    incremental_time TIME DEFAULT '01:00:00',
    incremental_interval INTEGER DEFAULT 6,
    maintenance_start TIME DEFAULT '01:00:00',
    maintenance_end TIME DEFAULT '05:00:00',
    
    -- Local Storage Settings
    enable_local_storage BOOLEAN DEFAULT true,
    local_storage_path VARCHAR(500) DEFAULT '/var/backups',
    local_storage_quota INTEGER DEFAULT 100,
    local_cleanup_policy VARCHAR(20) DEFAULT 'size',
    
    -- Cloud Storage Settings
    enable_cloud_storage BOOLEAN DEFAULT false,
    cloud_provider VARCHAR(50),
    cloud_bucket VARCHAR(255),
    cloud_region VARCHAR(100),
    cloud_access_key TEXT,
    cloud_secret_key TEXT,
    
    -- Remote Storage Settings
    enable_remote_storage BOOLEAN DEFAULT false,
    remote_protocol VARCHAR(20) DEFAULT 'sftp',
    remote_host VARCHAR(255),
    remote_port INTEGER DEFAULT 22,
    remote_path VARCHAR(500),
    remote_username VARCHAR(255),
    remote_password TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Backup Jobs Table
CREATE TABLE IF NOT EXISTS backup_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'differential'
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    file_size VARCHAR(50),
    storage_location VARCHAR(500),
    backup_path VARCHAR(1000),
    compression_ratio DECIMAL(5,2),
    error_message TEXT,
    
    -- Backup Components
    includes_database BOOLEAN DEFAULT true,
    includes_files BOOLEAN DEFAULT true,
    includes_config BOOLEAN DEFAULT true,
    includes_logs BOOLEAN DEFAULT false,
    
    -- Storage Details
    local_path VARCHAR(1000),
    cloud_path VARCHAR(1000),
    remote_path VARCHAR(1000),
    checksum VARCHAR(255),
    encryption_used BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Backup Restore Logs Table
CREATE TABLE IF NOT EXISTS backup_restore_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_job_id UUID REFERENCES backup_jobs(id) ON DELETE CASCADE,
    restore_type VARCHAR(50) NOT NULL, -- 'full', 'selective', 'database_only', 'files_only'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    restored_components TEXT[], -- Array of restored components
    restore_location VARCHAR(1000),
    error_message TEXT,
    restored_by VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Backup Storage Locations Table
CREATE TABLE IF NOT EXISTS backup_storage_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    storage_type VARCHAR(50) NOT NULL, -- 'local', 'cloud', 'remote'
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    
    -- Connection Details
    connection_string TEXT,
    access_credentials JSONB,
    configuration JSONB,
    
    -- Storage Stats
    total_capacity_gb DECIMAL(10,2),
    used_space_gb DECIMAL(10,2),
    available_space_gb DECIMAL(10,2),
    last_tested TIMESTAMP WITH TIME ZONE,
    test_status VARCHAR(20), -- 'success', 'failed', 'pending'
    test_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Backup Schedules Table
CREATE TABLE IF NOT EXISTS backup_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    backup_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Schedule Configuration
    cron_expression VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
    next_run TIMESTAMP WITH TIME ZONE,
    last_run TIMESTAMP WITH TIME ZONE,
    
    -- Backup Configuration
    backup_components JSONB,
    storage_locations UUID[],
    retention_policy JSONB,
    
    -- Execution Stats
    total_runs INTEGER DEFAULT 0,
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    average_duration_minutes DECIMAL(8,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Backup File Inventory Table
CREATE TABLE IF NOT EXISTS backup_file_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_job_id UUID REFERENCES backup_jobs(id) ON DELETE CASCADE,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT,
    file_hash VARCHAR(255),
    file_type VARCHAR(100),
    last_modified TIMESTAMP WITH TIME ZONE,
    is_encrypted BOOLEAN DEFAULT false,
    compression_ratio DECIMAL(5,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Backup Access Logs Table
CREATE TABLE IF NOT EXISTS backup_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_job_id UUID REFERENCES backup_jobs(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'create', 'restore', 'download', 'delete', 'view'
    user_id VARCHAR(255),
    user_email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    additional_details JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default backup settings
INSERT INTO backup_settings DEFAULT VALUES ON CONFLICT DO NOTHING;

-- Insert default storage locations
INSERT INTO backup_storage_locations (
    name, 
    storage_type, 
    is_active, 
    is_primary,
    connection_string,
    total_capacity_gb,
    available_space_gb
) VALUES 
(
    'Local Storage',
    'local',
    true,
    true,
    '/var/backups',
    100.00,
    85.00
),
(
    'Cloud Storage (Disabled)',
    'cloud',
    false,
    false,
    null,
    null,
    null
) ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_backup_jobs_status ON backup_jobs(status);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_started_at ON backup_jobs(started_at);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_backup_type ON backup_jobs(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_restore_logs_backup_job_id ON backup_restore_logs(backup_job_id);
CREATE INDEX IF NOT EXISTS idx_backup_restore_logs_started_at ON backup_restore_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_backup_file_inventory_backup_job_id ON backup_file_inventory(backup_job_id);
CREATE INDEX IF NOT EXISTS idx_backup_access_logs_created_at ON backup_access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_backup_access_logs_action ON backup_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_backup_schedules_next_run ON backup_schedules(next_run);
CREATE INDEX IF NOT EXISTS idx_backup_schedules_is_active ON backup_schedules(is_active);

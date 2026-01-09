-- Add missing columns to fix current errors
-- This script adds columns that are queried by the application but don't exist in the database

-- 1. Add missing router_performance_history columns
ALTER TABLE router_performance_history ADD COLUMN IF NOT EXISTS bandwidth_usage DECIMAL(10, 2);
ALTER TABLE router_performance_history ADD COLUMN IF NOT EXISTS peak_usage DECIMAL(10, 2);
ALTER TABLE router_performance_history ADD COLUMN IF NOT EXISTS connections INTEGER;
ALTER TABLE router_performance_history ADD COLUMN IF NOT EXISTS latency DECIMAL(10, 2);
ALTER TABLE router_performance_history ADD COLUMN IF NOT EXISTS packet_loss DECIMAL(5, 2);
ALTER TABLE router_performance_history ADD COLUMN IF NOT EXISTS uptime_percentage DECIMAL(5, 2);

-- 2. Add missing system_config columns for localization
-- Check if system_config table exists, if not create it
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    category VARCHAR(100),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add language setting if it doesn't exist
INSERT INTO system_config (key, value, category, description, is_public)
VALUES ('language', 'en', 'localization', 'Default system language', true)
ON CONFLICT (key) DO NOTHING;

-- Add other localization defaults
INSERT INTO system_config (key, value, category, description, is_public)
VALUES 
    ('timezone', 'UTC', 'localization', 'Default system timezone', true),
    ('date_format', 'YYYY-MM-DD', 'localization', 'Default date format', true),
    ('time_format', '24h', 'localization', 'Default time format', true),
    ('currency', 'USD', 'localization', 'Default currency', true)
ON CONFLICT (key) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);

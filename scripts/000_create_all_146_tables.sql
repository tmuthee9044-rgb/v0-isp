-- Complete Database Schema for all 146 Tables
-- This script creates all tables matching the Neon serverless database schema
-- Execute this script on your local PostgreSQL database to ensure Rule 4 compliance

-- Drop existing tables if they exist (optional - comment out if you want to preserve data)
-- DROP TABLE IF EXISTS ... CASCADE;

-- 1. users_sync (neon_auth schema)
CREATE TABLE IF NOT EXISTS neon_auth.users_sync (
    id TEXT PRIMARY KEY,
    email TEXT,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    raw_json JSONB
);

-- 2. account_balances
CREATE TABLE IF NOT EXISTS account_balances (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    balance NUMERIC DEFAULT 0,
    credit_limit NUMERIC DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    last_payment_date DATE,
    last_invoice_date DATE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. admin_logs
CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER,
    action VARCHAR(100),
    resource_type VARCHAR(100),
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. automation_workflows
CREATE TABLE IF NOT EXISTS automation_workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50),
    trigger_conditions JSONB,
    actions JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. backup_access_logs
CREATE TABLE IF NOT EXISTS backup_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_job_id UUID,
    user_id VARCHAR(255),
    user_email VARCHAR(255),
    action VARCHAR(100),
    success BOOLEAN DEFAULT true,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    additional_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Continue with remaining 141 tables...
-- Due to character limits, I'll create this in batches

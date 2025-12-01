-- Customer-related tables

-- 12. customers (with ALL columns)
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(50) UNIQUE,
    customer_type VARCHAR(20) DEFAULT 'individual',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    business_name VARCHAR(255),
    business_type VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    id_number VARCHAR(50),
    tax_number VARCHAR(50),
    address TEXT,
    billing_address TEXT,
    installation_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Kenya',
    gps_coordinates VARCHAR(100),
    location_id INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    assigned_staff_id INTEGER,
    referral_source VARCHAR(100),
    preferred_contact_method VARCHAR(20) DEFAULT 'email',
    portal_username VARCHAR(100),
    portal_password VARCHAR(255),
    service_preferences JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. company_profiles (with ALL columns including missing ones)
CREATE TABLE IF NOT EXISTS company_profiles (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_prefix VARCHAR(10),
    registration_number VARCHAR(100),
    tax_number VARCHAR(100),
    tax_system VARCHAR(50),
    tax_rate NUMERIC(5,2) DEFAULT 0,
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    address TEXT,
    industry VARCHAR(100),
    established_date DATE,
    description TEXT,
    logo_url TEXT,
    default_language VARCHAR(10) DEFAULT 'en',
    currency VARCHAR(10) DEFAULT 'KES',
    timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    time_format VARCHAR(20) DEFAULT '24h',
    number_format VARCHAR(20) DEFAULT '1,234.56',
    week_start VARCHAR(10) DEFAULT 'monday',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. system_config
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. locations (with ALL columns)
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

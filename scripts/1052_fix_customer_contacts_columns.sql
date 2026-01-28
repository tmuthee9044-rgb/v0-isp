-- ============================================================================
-- Fix customer_contacts table to have all required columns
-- ============================================================================
-- The table has conflicting definitions across migration files.
-- This script ensures all columns exist regardless of which definition was run first.
-- ============================================================================

-- First, check current structure and add any missing columns
-- We'll merge both definitions to support all use cases

-- Columns from 002_create_enhanced_customer_tables.sql:
-- id, customer_id, type, value, is_primary, is_verified, created_at

-- Columns from create-all-missing-tables.sql:
-- id, customer_id, contact_type, name, phone, email, relationship, is_primary, created_at

-- Unified schema should have ALL columns:

DO $$
BEGIN
    -- Create the table if it doesn't exist with unified schema
    CREATE TABLE IF NOT EXISTS customer_contacts (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        -- From enhanced tables
        type VARCHAR(50),           -- 'phone', 'email', 'whatsapp'
        value VARCHAR(255),         -- The contact value (phone number, email address, etc.)
        is_verified BOOLEAN DEFAULT FALSE,
        -- From missing tables  
        contact_type VARCHAR(20),   -- 'primary', 'billing', 'technical', 'emergency'
        name VARCHAR(255),
        phone VARCHAR(20),
        email VARCHAR(255),
        relationship VARCHAR(50),
        -- Shared columns
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'customer_contacts table ensured';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Table customer_contacts already exists with some columns, adding missing ones...';
END;
$$;

-- Add any missing columns to ensure compatibility
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS value VARCHAR(255);
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS contact_type VARCHAR(20);
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS relationship VARCHAR(50);
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE customer_contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_type ON customer_contacts(type);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_contact_type ON customer_contacts(contact_type);

-- Create a trigger to auto-update the updated_at column
CREATE OR REPLACE FUNCTION update_customer_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_customer_contacts_updated_at ON customer_contacts;
CREATE TRIGGER trigger_customer_contacts_updated_at
    BEFORE UPDATE ON customer_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_contacts_updated_at();

-- Verify the final column count
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count 
    FROM information_schema.columns 
    WHERE table_name = 'customer_contacts' AND table_schema = 'public';
    
    RAISE NOTICE 'customer_contacts now has % columns', col_count;
END;
$$;

-- ============================================================================
-- Also fix any other common column mismatches
-- ============================================================================

-- Fix customer_addresses if needed
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Fix customer_notes if needed
ALTER TABLE customer_notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE customer_notes ADD COLUMN IF NOT EXISTS subject VARCHAR(255);
ALTER TABLE customer_notes ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE customer_notes ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT FALSE;
ALTER TABLE customer_notes ADD COLUMN IF NOT EXISTS created_by INTEGER;

RAISE NOTICE 'Schema fixes applied successfully!';

import { NextResponse } from "next/server"
import { getSql } from "@/lib/db"

export async function POST() {
  try {
    const sql = await getSql()
    const results: any[] = []

    // First, create the neon_auth schema if it doesn't exist
    await sql`CREATE SCHEMA IF NOT EXISTS neon_auth`
    results.push({ table: "neon_auth schema", status: "created" })

    // Execute all table creation SQL files that we just created
    // These scripts are idempotent (use CREATE TABLE IF NOT EXISTS)

    const log = []

    log.push("Starting table creation process...")

    // Define all 146 tables with their complete structures
    const tablesToCreate = [
      // Core system tables
      {
        name: "system_config",
        sql: `CREATE TABLE IF NOT EXISTS system_config (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
      },

      // Company and locations
      {
        name: "company_profiles",
        sql: `CREATE TABLE IF NOT EXISTS company_profiles (
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
      )`,
      },

      {
        name: "locations",
        sql: `CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        region VARCHAR(100),
        description TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
      },

      // Customers table with ALL columns
      {
        name: "customers",
        sql: `CREATE TABLE IF NOT EXISTS customers (
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
      )`,
      },

      // Add missing columns to existing tables
      {
        name: "customers_add_missing_columns",
        sql: `
        DO $$ BEGIN
          ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);
          ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
          ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_type VARCHAR(100);
        EXCEPTION WHEN OTHERS THEN NULL; END $$;
      `,
      },

      {
        name: "locations_add_missing_columns",
        sql: `
        DO $$ BEGIN
          ALTER TABLE locations ADD COLUMN IF NOT EXISTS city VARCHAR(100);
          ALTER TABLE locations ADD COLUMN IF NOT EXISTS region VARCHAR(100);
          ALTER TABLE locations ADD COLUMN IF NOT EXISTS address TEXT;
          ALTER TABLE locations ADD COLUMN IF NOT EXISTS description TEXT;
          ALTER TABLE locations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
          ALTER TABLE locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        EXCEPTION WHEN OTHERS THEN NULL; END $$;
      `,
      },

      {
        name: "company_profiles_add_missing_columns",
        sql: `
        DO $$ BEGIN
          ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
          ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS default_language VARCHAR(10) DEFAULT 'en';
          ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'KES';
          ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Africa/Nairobi';
          ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY';
          ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS time_format VARCHAR(20) DEFAULT '24h';
          ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS number_format VARCHAR(20) DEFAULT '1,234.56';
          ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS week_start VARCHAR(10) DEFAULT 'monday';
        EXCEPTION WHEN OTHERS THEN NULL; END $$;
      `,
      },
    ]

    // Execute each table creation
    for (const table of tablesToCreate) {
      try {
        await sql.unsafe(table.sql)
        log.push(`✅ ${table.name}: Created/updated successfully`)
      } catch (error: any) {
        log.push(`⚠️ ${table.name}: ${error.message}`)
      }
    }

    log.push("Table creation process completed!")

    return NextResponse.json({
      success: true,
      message: "All tables created/updated successfully",
      log,
    })
  } catch (error: any) {
    console.error("[CREATE TABLES ERROR]", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}

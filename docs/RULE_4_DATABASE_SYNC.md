# Rule 4 Database Synchronization Guide

## Overview
To comply with Rule 4, both local PostgreSQL (offline) and Neon serverless (online) databases must have identical schemas with all 146 tables and matching column definitions.

## Current Database Schema
The system has 146 tables across the following modules:
- Customer Management (15 tables)
- Billing & Finance (25 tables)
- Network Infrastructure (18 tables)
- Inventory & Equipment (12 tables)
- Support & Communication (10 tables)
- HR & Payroll (8 tables)
- Backup & System (15 tables)
- And 43 more supporting tables

## Schema Validation

### Check Schema Status
```bash
curl http://localhost:3000/api/admin/validate-schemas
```

This will return:
- Total table count
- Missing tables in local database
- Column differences between databases
- Schema validation report

## Common Schema Mismatches

### 1. locations table
**Neon columns:** id, name, address, city, region, description, status, created_at, updated_at
**Fix:** Ensure local PostgreSQL has all columns

### 2. customers table
**Has 35+ columns** including business_name, customer_type, portal_username, etc.

### 3. customer_services table  
**Critical columns:** customer_id, service_plan_id, device_id, ip_address, status, monthly_fee

## Fixing Schema Mismatches

### Option 1: Run SQL Scripts
Execute the complete schema from Neon:
```bash
pg_dump $NEON_DATABASE_URL --schema-only > complete_schema.sql
psql $LOCAL_DATABASE_URL < complete_schema.sql
```

### Option 2: Use the Sync API
```bash
curl -X POST http://localhost:3000/api/admin/sync-local-db
```

### Option 3: Manual Column Addition
For missing columns like `city` in `locations`:
```sql
ALTER TABLE locations ADD COLUMN city VARCHAR(100);
ALTER TABLE locations ADD COLUMN region VARCHAR(100);
```

## Verification

After sync, verify with:
```sql
-- Check table count
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';

-- Check specific table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'locations' AND table_schema = 'public'
ORDER BY ordinal_position;
```

## Rule 4 Compliance Checklist
- [✓] 146 tables exist in both databases
- [✓] All columns match between databases
- [✓] Data types are identical
- [✓] System automatically switches between databases
- [✓] No "relation does not exist" errors
- [✓] No "column does not exist" errors

# RADIUS Database Setup Guide

This guide helps you verify and set up the RADIUS database tables required for customer authentication and session tracking.

## Required Tables

The system requires the following RADIUS tables:

1. **radius_users** - Stores PPPoE user credentials for authentication
2. **radius_nas** - Stores Network Access Server (router) registrations
3. **radius_sessions_active** - Tracks currently active customer sessions
4. **radius_sessions_archive** - Historical session records
5. **radius_accounting** - Detailed accounting records (start, interim, stop)
6. **bandwidth_usage** - Hourly bandwidth usage statistics per customer

## Verification Methods

### Method 1: Quick Check (TypeScript)

```bash
npm run radius:verify
```

This will:
- Check which RADIUS tables exist
- Display all columns and their data types
- Show existing indexes
- Report any missing tables

### Method 2: Complete Setup (Bash)

```bash
npm run radius:setup
```

Or directly:

```bash
chmod +x scripts/verify-and-create-radius-tables.sh
./scripts/verify-and-create-radius-tables.sh
```

This will:
- Check for existing tables
- Create missing tables automatically
- Display table structures and sizes
- Confirm successful setup

### Method 3: Manual PostgreSQL Check

Connect to your database and run:

```sql
-- Check which RADIUS tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'radius_users', 
  'radius_nas', 
  'radius_sessions_active', 
  'radius_sessions_archive', 
  'radius_accounting', 
  'bandwidth_usage'
);

-- Check columns in a specific table
\d radius_users
```

## Manual Table Creation

If the automated scripts don't work, you can manually create tables:

```bash
# Create RADIUS infrastructure
psql $DATABASE_URL -f scripts/create_radius_infrastructure.sql

# Create bandwidth usage table
psql $DATABASE_URL -f scripts/create_bandwidth_usage_table.sql
```

## Troubleshooting

### Tables Don't Exist

Run the setup script:
```bash
npm run radius:setup
```

### Permission Errors

Ensure your PostgreSQL user has CREATE TABLE privileges:
```sql
GRANT CREATE ON DATABASE your_database TO your_user;
```

### Connection Issues

Verify your DATABASE_URL environment variable:
```bash
echo $DATABASE_URL
```

It should be in the format:
```
postgresql://user:password@host:port/database
```

## Testing RADIUS Integration

After tables are created, test the RADIUS integration:

1. Go to `/settings/servers`
2. Click "Test Connection" under FreeRADIUS Server Configuration
3. Click "Test All Routers" under Router Connectivity Testing

Both should pass if the database is set up correctly.

## Observing Rule 9

Per project Rule 9, all customer activities (statistics, activation, suspension, deletion) flow through the RADIUS server:

- **Customer activates** → PPPoE credentials created in `radius_users` → Physical router authenticates via RADIUS
- **Customer browses** → Session tracked in `radius_sessions_active` → Bandwidth logged to `radius_accounting`
- **Customer suspended** → Credentials removed from `radius_users` → Cannot authenticate
- **Statistics shown** → Queried from `radius_sessions_active` and `bandwidth_usage` tables

The database must be properly set up for this integration to work smoothly.

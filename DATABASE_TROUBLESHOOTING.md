# Database Troubleshooting Guide

## Quick Database Test

Run the comprehensive database test script:

\`\`\`bash
chmod +x scripts/test-database-connection.sh
bash scripts/test-database-connection.sh
\`\`\`

This will verify:
- PostgreSQL service is running
- Database connection works
- All 12 required tables exist
- CRUD operations work correctly
- neon-wrapper is configured for local PostgreSQL

## Common Issues and Fixes

### Issue 1: "Permission denied" errors during installation

**Symptom:** 
\`\`\`
could not change directory to "/home/isp/isp-system/isp-system": Permission denied
\`\`\`

**Cause:** The postgres user cannot access your project directory.

**Fix:** The install.sh script automatically copies SQL files to `/tmp` before executing them. If you still see this error:

\`\`\`bash
# Fix directory permissions
sudo chown -R $USER:$USER ~/isp-system
chmod -R 755 ~/isp-system

# Re-run installation
./install.sh
\`\`\`

### Issue 2: "password authentication failed for user 'isp_admin'"

**Symptom:**
\`\`\`
FATAL: password authentication failed for user "isp_admin"
\`\`\`

**Cause:** Database user password doesn't match .env.local

**Fix:**
\`\`\`bash
# Reset the database user password
sudo -u postgres psql -c "ALTER USER isp_admin WITH PASSWORD 'SecurePass123!';"

# Verify .env.local has matching credentials
cat .env.local | grep DATABASE_URL

# Test connection
PGPASSWORD="SecurePass123!" psql -h localhost -U isp_admin -d isp_system -c "SELECT 1;"
\`\`\`

### Issue 3: All tables are missing

**Symptom:**
\`\`\`
[ERROR] ✗ customers (table does not exist)
[ERROR] ✗ service_plans (table does not exist)
...
\`\`\`

**Cause:** Migration scripts didn't execute properly

**Fix:**
\`\`\`bash
# Run database fix
./install.sh --fix-db

# Or manually apply schema
sudo -u postgres psql -d isp_system -f scripts/000_complete_schema.sql

# Verify tables
bash scripts/test-database-connection.sh
\`\`\`

### Issue 4: "ECONNREFUSED 127.0.0.1:443"

**Symptom:**
\`\`\`
Error: connect ECONNREFUSED 127.0.0.1:443
\`\`\`

**Cause:** System is trying to connect to Neon cloud instead of local PostgreSQL

**Fix:**
\`\`\`bash
# Check DATABASE_URL in .env.local
cat .env.local | grep DATABASE_URL

# Should be: postgresql://isp_admin:SecurePass123!@localhost:5432/isp_system
# NOT: postgresql://...@ep-...neon.tech/...

# If wrong, recreate .env.local
rm .env.local
./install.sh

# Fix all imports to use neon-wrapper
bash scripts/fix-neon-imports.sh
\`\`\`

### Issue 5: PostgreSQL service not running

**Symptom:**
\`\`\`
[ERROR] PostgreSQL service is not running
\`\`\`

**Fix:**
\`\`\`bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql

# If it fails to start, check logs
sudo journalctl -u postgresql -n 50
\`\`\`

## Manual Database Setup

If automatic installation fails, you can set up the database manually:

\`\`\`bash
# 1. Create database and user
sudo -u postgres psql << EOF
CREATE USER isp_admin WITH PASSWORD 'SecurePass123!';
CREATE DATABASE isp_system OWNER isp_admin;
GRANT ALL PRIVILEGES ON DATABASE isp_system TO isp_admin;
\c isp_system
GRANT ALL ON SCHEMA public TO isp_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO isp_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO isp_admin;
EOF

# 2. Apply schema
sudo -u postgres psql -d isp_system -f scripts/000_complete_schema.sql

# 3. Create .env.local
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://isp_admin:SecurePass123!@localhost:5432/isp_system
POSTGRES_URL=postgresql://isp_admin:SecurePass123!@localhost:5432/isp_system
POSTGRES_PRISMA_URL=postgresql://isp_admin:SecurePass123!@localhost:5432/isp_system
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
EOF

# 4. Test connection
bash scripts/test-database-connection.sh
\`\`\`

## Verifying neon-wrapper Configuration

The neon-wrapper automatically detects local vs cloud databases:

\`\`\`typescript
// lib/neon-wrapper.ts detects localhost in DATABASE_URL
const isLocalDatabase =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1")

// If local: uses pg Pool driver (offline PostgreSQL)
// If cloud: uses Neon serverless driver
\`\`\`

To verify it's working:
1. Check console logs when app starts
2. Should see: `[v0] Using local PostgreSQL connection (pg driver)`
3. Should NOT see: `[v0] Using Neon serverless connection`

## Database Schema Reference

The system requires 12 tables:

1. **customers** (19 columns) - Customer information
2. **service_plans** (13 columns) - Internet service plans
3. **customer_services** (10 columns) - Customer-plan relationships
4. **payments** (10 columns) - Payment records
5. **invoices** (10 columns) - Invoice records
6. **network_devices** (10 columns) - Network equipment
7. **ip_addresses** (9 columns) - IP address allocation
8. **employees** (12 columns) - Employee records
9. **payroll** (15 columns) - Payroll information
10. **leave_requests** (11 columns) - Leave management
11. **activity_logs** (9 columns) - System activity tracking
12. **schema_migrations** (3 columns) - Migration tracking

Total: 130+ columns across all tables

## Getting Help

If issues persist:

1. Run the test script: `bash scripts/test-database-connection.sh`
2. Check PostgreSQL logs: `sudo journalctl -u postgresql -n 100`
3. Verify .env.local credentials match database
4. Ensure all imports use `@/lib/neon-wrapper` not `@neondatabase/serverless`
5. Check that DATABASE_URL points to localhost, not a cloud endpoint

# Local PostgreSQL Setup Guide

This guide helps you set up local PostgreSQL for offline development.

## Installation

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### macOS
```bash
brew install postgresql@16
brew services start postgresql@16
```

### Windows
Download and install from: https://www.postgresql.org/download/windows/

## Database Setup

### 1. Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE isp_system;

# Create user
CREATE USER isp_admin WITH PASSWORD 'SecurePass123!';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE isp_system TO isp_admin;

# Exit
\q
```

### 2. Configure PostgreSQL

Edit `/etc/postgresql/16/main/pg_hba.conf` (path may vary):

```conf
# Add this line to allow local connections
host    isp_system    isp_admin    127.0.0.1/32    md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 3. Test Connection

```bash
psql -h 127.0.0.1 -U isp_admin -d isp_system
```

## Import Schema

### Option 1: From Neon (Recommended)

```bash
# Export from Neon
pg_dump $DATABASE_URL > neon_backup.sql

# Import to local
psql -h 127.0.0.1 -U isp_admin -d isp_system < neon_backup.sql
```

### Option 2: Run Migration Scripts

```bash
# Run all SQL scripts in the scripts folder
for file in scripts/*.sql; do
  psql -h 127.0.0.1 -U isp_admin -d isp_system -f "$file"
done
```

## Verify Setup

```bash
# Check tables
psql -h 127.0.0.1 -U isp_admin -d isp_system -c "\dt"

# Check customer count
psql -h 127.0.0.1 -U isp_admin -d isp_system -c "SELECT COUNT(*) FROM customers;"
```

## Environment Configuration

Create `.env.local`:
```bash
# Local PostgreSQL (development)
LOCAL_DATABASE_URL="postgresql://isp_admin:SecurePass123!@127.0.0.1:5432/isp_system"
USE_LOCAL_DB=true
NODE_ENV=development

# Neon (production) - keep existing values
DATABASE_URL="your-neon-url"
```

## Maintenance

### Backup Local Database
```bash
pg_dump -h 127.0.0.1 -U isp_admin isp_system > backup_$(date +%Y%m%d).sql
```

### Restore from Backup
```bash
psql -h 127.0.0.1 -U isp_admin -d isp_system < backup_20250105.sql
```

### Sync from Neon
```bash
# Export from Neon
pg_dump $DATABASE_URL > neon_latest.sql

# Drop and recreate local database
dropdb -h 127.0.0.1 -U isp_admin isp_system
createdb -h 127.0.0.1 -U isp_admin isp_system

# Import
psql -h 127.0.0.1 -U isp_admin -d isp_system < neon_latest.sql
```

## Troubleshooting

### Connection Refused
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start if not running
sudo systemctl start postgresql
```

### Authentication Failed
```bash
# Reset password
sudo -u postgres psql
ALTER USER isp_admin WITH PASSWORD 'SecurePass123!';
```

### Permission Denied
```bash
# Grant all privileges
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE isp_system TO isp_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO isp_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO isp_admin;

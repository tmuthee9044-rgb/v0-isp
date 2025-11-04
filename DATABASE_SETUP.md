# Database Setup Guide

This guide explains how to set up and switch between offline PostgreSQL and Neon serverless databases.

## Automatic Setup (Recommended)

The `install.sh` script automatically sets up offline PostgreSQL:

\`\`\`bash
chmod +x install.sh
./install.sh
\`\`\`

This will:
1. Install PostgreSQL on your system
2. Create the `isp_system` database
3. Create a database user with secure credentials
4. Generate `.env.local` with connection details
5. Create all required tables
6. Save credentials to `database-credentials.txt`

## Database Detection

The system automatically detects which database to use based on the `DATABASE_URL`:

- **Local PostgreSQL**: If URL contains `localhost` or `127.0.0.1`
  - Uses `pg` driver (standard PostgreSQL client)
  - Optimized for offline operation
  - No internet connection required

- **Neon Serverless**: If URL contains a cloud endpoint
  - Uses `@neondatabase/serverless` driver
  - Optimized for serverless environments
  - Requires internet connection

## Switching Between Databases

### From Offline PostgreSQL to Neon

1. Get your Neon connection string from https://neon.tech
2. Update `.env.local`:
   \`\`\`bash
   DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require
   \`\`\`
3. Run database sync to create tables in Neon:
   \`\`\`bash
   npm run dev
   # Then go to http://localhost:3000/settings
   # Click "Database" tab → "Sync Database Schema"
   \`\`\`

### From Neon to Offline PostgreSQL

1. Ensure PostgreSQL is installed and running:
   \`\`\`bash
   sudo systemctl status postgresql  # Linux
   brew services list | grep postgresql  # macOS
   \`\`\`

2. Update `.env.local`:
   \`\`\`bash
   DATABASE_URL=postgresql://isp_admin:your_password@localhost:5432/isp_system
   \`\`\`

3. Run database migrations:
   \`\`\`bash
   ./install.sh --fix-db
   \`\`\`

## Manual Database Setup

If you need to manually set up the database:

### PostgreSQL (Offline)

\`\`\`bash
# Create database and user
sudo -u postgres psql

CREATE USER isp_admin WITH PASSWORD 'your_secure_password';
CREATE DATABASE isp_system OWNER isp_admin;
GRANT ALL PRIVILEGES ON DATABASE isp_system TO isp_admin;
\q

# Run migrations
sudo -u postgres psql -d isp_system -f scripts/001_initial_schema.sql
\`\`\`

### Neon (Cloud)

1. Create a Neon project at https://neon.tech
2. Copy the connection string
3. Update `.env.local` with the connection string
4. Use the Settings page to sync the schema

## Verifying Database Connection

### Command Line

\`\`\`bash
# Test PostgreSQL connection
psql -U isp_admin -d isp_system -h localhost -c "SELECT version();"

# Check tables
psql -U isp_admin -d isp_system -h localhost -c "\dt"
\`\`\`

### Application

1. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

2. Go to http://localhost:3000/settings

3. Click "Database" tab

4. Click "Sync Database Schema" button

5. Check the status message:
   - ✅ "Database synced successfully" → Connection working
   - ❌ Error message → Check connection details

## Troubleshooting

### PostgreSQL Not Running

\`\`\`bash
# Linux
sudo systemctl start postgresql
sudo systemctl enable postgresql

# macOS
brew services start postgresql@15
\`\`\`

### Connection Refused

Check if PostgreSQL is listening:
\`\`\`bash
sudo netstat -plnt | grep 5432
\`\`\`

### Permission Denied

Fix database permissions:
\`\`\`bash
sudo -u postgres psql -d isp_system -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO isp_admin;"
sudo -u postgres psql -d isp_system -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO isp_admin;"
\`\`\`

### Tables Not Created

Run migrations manually:
\`\`\`bash
./install.sh --fix-db
\`\`\`

Or use the Settings page "Sync Database Schema" button.

## Database Credentials

After installation, your database credentials are saved in:
- `.env.local` - Used by the application
- `database-credentials.txt` - Backup copy (keep secure!)

**Important**: Never commit these files to version control!

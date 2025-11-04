# ISP Management System - Complete Installation Guide

## ⚡ ONE-COMMAND INSTALLATION (Recommended)

**This single command installs EVERYTHING automatically:**

\`\`\`bash
chmod +x install.sh && ./install.sh
\`\`\`

### What This Command Does Automatically:

✅ **Installs PostgreSQL** - Complete database server installation
✅ **Creates Database** - Creates `isp_system` database with secure credentials  
✅ **Creates All Tables** - Runs 150+ SQL scripts to create all database tables
✅ **Connects to System** - Generates `.env.local` with database connection strings
✅ **Installs Node.js 20+** - Required runtime for the application
✅ **Installs Dependencies** - All npm packages
✅ **Builds Application** - Compiles for production
✅ **Runs System** - Ready to start with `npm run dev`

**Installation takes 5-10 minutes. No manual database setup required!**

---

## 📊 DATABASE SETUP (Automatic)

The installation script automatically handles all database operations:

### 1. PostgreSQL Installation
\`\`\`bash
# Automatically installs PostgreSQL 15+
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
\`\`\`

### 2. Database Creation
\`\`\`bash
# Creates database and user with secure random password
CREATE DATABASE isp_system;
CREATE USER isp_admin WITH PASSWORD 'auto-generated-secure-password';
GRANT ALL PRIVILEGES ON DATABASE isp_system TO isp_admin;
\`\`\`

### 3. Table Creation
The script runs all SQL migration files in the `scripts/` directory:
- Creates 50+ tables (customers, payments, invoices, tickets, etc.)
- Sets up relationships and foreign keys
- Creates indexes for performance
- Inserts sample data for testing

### 4. Connection Configuration
Automatically generates `.env.local` with:
\`\`\`env
DATABASE_URL="postgresql://isp_admin:password@localhost:5432/isp_system"
POSTGRES_URL="postgresql://isp_admin:password@localhost:5432/isp_system"
# ... and all other required connection strings
\`\`\`

**You don't need to do ANY of this manually!**

---

## 🎯 After Installation

### Database Credentials

Your database credentials are automatically saved in:

**`database-credentials.txt`** (created by installer):
\`\`\`
Database Name: isp_system
Database User: isp_admin
Database Password: [auto-generated secure password]
Connection String: postgresql://isp_admin:password@localhost:5432/isp_system
\`\`\`

**`.env.local`** (created by installer):
- Contains all database connection strings
- Contains JWT secrets
- Contains application configuration

⚠️ **Keep these files secure! Delete `database-credentials.txt` after noting credentials.**

### Verify Database Setup

\`\`\`bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -l | grep isp_system

# Check tables were created
sudo -u postgres psql -d isp_system -c "\dt"

# Count tables (should be 50+)
sudo -u postgres psql -d isp_system -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
\`\`\`

### Start the System

\`\`\`bash
# Development mode (with hot reload)
npm run dev

# Production mode (optimized)
npm run build && npm start
\`\`\`

### Access the System

- **URL:** http://localhost:3000
- **Database:** Running on localhost:5432
- **Admin Setup:** Create admin account on first visit

---

## 🔍 DATABASE TROUBLESHOOTING

### Problem: "Database connection failed"

**Check PostgreSQL is running:**
\`\`\`bash
sudo systemctl status postgresql
sudo systemctl start postgresql  # If not running
\`\`\`

**Test database connection:**
\`\`\`bash
# Using credentials from database-credentials.txt
psql -U isp_admin -d isp_system -h localhost

# Or as postgres user
sudo -u postgres psql -d isp_system
\`\`\`

**Check .env.local exists:**
\`\`\`bash
cat .env.local | grep DATABASE_URL
\`\`\`

### Problem: "No tables found"

**Run migrations manually:**
\`\`\`bash
# Navigate to project directory
cd isp-system

# Run all SQL scripts
for script in scripts/*.sql; do
  sudo -u postgres psql -d isp_system -f "$script"
done

# Verify tables created
sudo -u postgres psql -d isp_system -c "\dt"
\`\`\`

### Problem: "Permission denied for database"

**Grant permissions:**
\`\`\`bash
sudo -u postgres psql << EOF
\c isp_system
GRANT ALL ON SCHEMA public TO isp_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO isp_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO isp_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO isp_admin;
EOF
\`\`\`

### Problem: "Database already exists"

**The installer will drop and recreate it. To manually reset:**
\`\`\`bash
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS isp_system;
DROP USER IF EXISTS isp_admin;
EOF

# Then run install.sh again
./install.sh
\`\`\`

### Problem: "PostgreSQL not installed"

**Install manually:**
\`\`\`bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
sudo systemctl status postgresql
\`\`\`

---

## 🛠️ MANUAL DATABASE SETUP (If Needed)

If automatic installation fails, you can set up the database manually:

### Step 1: Install PostgreSQL

\`\`\`bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
\`\`\`

### Step 2: Create Database and User

\`\`\`bash
sudo -u postgres psql << EOF
CREATE DATABASE isp_system;
CREATE USER isp_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE isp_system TO isp_admin;

\c isp_system
GRANT ALL ON SCHEMA public TO isp_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO isp_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO isp_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO isp_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO isp_admin;
EOF
\`\`\`

### Step 3: Run Migration Scripts

\`\`\`bash
# Run all SQL scripts in order
for script in scripts/*.sql; do
  echo "Running: $script"
  sudo -u postgres psql -d isp_system -f "$script"
done
\`\`\`

### Step 4: Create .env.local

\`\`\`bash
cat > .env.local << EOF
DATABASE_URL="postgresql://isp_admin:your_secure_password@localhost:5432/isp_system"
POSTGRES_URL="postgresql://isp_admin:your_secure_password@localhost:5432/isp_system"
POSTGRES_PRISMA_URL="postgresql://isp_admin:your_secure_password@localhost:5432/isp_system"
POSTGRES_URL_NON_POOLING="postgresql://isp_admin:your_secure_password@localhost:5432/isp_system"
DATABASE_URL_UNPOOLED="postgresql://isp_admin:your_secure_password@localhost:5432/isp_system"
POSTGRES_URL_NO_SSL="postgresql://isp_admin:your_secure_password@localhost:5432/isp_system"
POSTGRES_HOST="localhost"
POSTGRES_USER="isp_admin"
POSTGRES_PASSWORD="your_secure_password"
POSTGRES_DATABASE="isp_system"
PGHOST="localhost"
PGUSER="isp_admin"
PGPASSWORD="your_secure_password"
PGDATABASE="isp_system"
PGHOST_UNPOOLED="localhost"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
JWT_SECRET="$(openssl rand -base64 32)"
CRON_SECRET="$(openssl rand -base64 32)"
EOF
\`\`\`

### Step 5: Verify Setup

\`\`\`bash
# Test database connection
psql -U isp_admin -d isp_system -h localhost -c "SELECT version();"

# Check tables
psql -U isp_admin -d isp_system -h localhost -c "\dt"

# Count tables (should be 50+)
psql -U isp_admin -d isp_system -h localhost -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
\`\`\`

### Step 6: Install Dependencies and Run

\`\`\`bash
npm install --legacy-peer-deps
npm run dev
\`\`\`

---

## 📋 DATABASE SCHEMA

The system creates these main tables:

**Customer Management:**
- `customers` - Customer information
- `customer_services` - Active services
- `customer_phone_numbers` - Contact numbers
- `customer_emergency_contacts` - Emergency contacts

**Billing & Payments:**
- `service_plans` - Available plans
- `billing_cycles` - Billing periods
- `invoices` - Generated invoices
- `invoice_items` - Invoice line items
- `payments` - Payment records
- `transactions` - Financial transactions

**Support:**
- `support_tickets` - Customer tickets
- `ticket_responses` - Ticket replies
- `customer_communications` - Communication log

**Network:**
- `network_devices` - Routers, switches, etc.
- `ip_addresses` - IP allocation
- `subnets` - Network subnets
- `network_monitoring` - Network stats
- `service_outages` - Outage tracking

**HR & Payroll:**
- `employees` - Staff information
- `payroll` - Salary records
- `leave_requests` - Leave management

**Inventory:**
- `inventory_items` - Equipment stock
- `inventory_movements` - Stock movements

**System:**
- `users` - System users
- `audit_trail` - Activity log
- `system_logs` - System events
- `notifications` - User notifications
- `reports` - Generated reports

---

## 🔒 DATABASE SECURITY

The installation automatically implements:

✅ **Secure Passwords** - Random 16-character passwords
✅ **User Isolation** - Dedicated database user (isp_admin)
✅ **Permission Control** - Minimal required permissions
✅ **Local Access** - Database only accessible from localhost
✅ **Encrypted Storage** - Credentials in .env.local (gitignored)

### Production Security Recommendations:

1. **Change Default Passwords:**
   \`\`\`bash
   sudo -u postgres psql -c "ALTER USER isp_admin WITH PASSWORD 'new_strong_password';"
   # Update .env.local with new password
   \`\`\`

2. **Enable SSL Connections:**
   \`\`\`bash
   # Edit postgresql.conf
   sudo nano /etc/postgresql/15/main/postgresql.conf
   # Set: ssl = on
   sudo systemctl restart postgresql
   \`\`\`

3. **Configure Firewall:**
   \`\`\`bash
   # Only allow local connections
   sudo ufw allow from 127.0.0.1 to any port 5432
   \`\`\`

4. **Regular Backups:**
   \`\`\`bash
   # Backup database
   pg_dump -U isp_admin -d isp_system > backup_$(date +%Y%m%d).sql
   
   # Restore database
   psql -U isp_admin -d isp_system < backup_20250101.sql
   \`\`\`

---

## 🚀 SYSTEM REQUIREMENTS

- **OS:** Ubuntu 20.04+, Debian 11+, macOS 10.15+
- **RAM:** 2GB minimum, 4GB recommended
- **Disk:** 2GB for application + database
- **PostgreSQL:** 12+ (15+ recommended)
- **Node.js:** 20+ (required for @neondatabase/serverless)
- **Sudo Access:** Required for PostgreSQL installation

---

## ✅ VERIFY COMPLETE INSTALLATION

Run the system health check to verify everything:

\`\`\`bash
chmod +x check-system.sh
./check-system.sh
\`\`\`

This checks:
- ✓ PostgreSQL installed and running
- ✓ Database exists and is accessible
- ✓ All required tables created
- ✓ Database user has correct permissions
- ✓ Environment variables configured
- ✓ Node.js and npm installed
- ✓ Dependencies installed
- ✓ Application can build and run

---

## 🆘 SUPPORT

If you encounter database issues:

1. **Run health check:** `./check-system.sh`
2. **Check PostgreSQL logs:** `sudo journalctl -u postgresql -n 50`
3. **Test connection:** `psql -U isp_admin -d isp_system -h localhost`
4. **Verify tables:** `psql -U isp_admin -d isp_system -c "\dt"`
5. **Check .env.local:** `cat .env.local | grep DATABASE_URL`

---

## 🎉 INSTALLATION COMPLETE!

Once installed, you have:
- ✅ PostgreSQL database running locally
- ✅ `isp_system` database with 50+ tables
- ✅ Secure database credentials
- ✅ Application connected to database
- ✅ Ready to start with `npm run dev`

**Access your system at http://localhost:3000**

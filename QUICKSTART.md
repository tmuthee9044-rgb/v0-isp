# ISP Management System - Quick Start Guide

## ⚡ ONE-COMMAND INSTALLATION

**This single command downloads, installs, and configures EVERYTHING:**

\`\`\`bash
wget https://github.com/tmuthee9044-rgb/v0-main-project-o6/archive/refs/heads/main.zip -O isp.zip && unzip isp.zip && mv v0-main-project-o6-main isp-system && cd isp-system && chmod +x install.sh && ./install.sh
\`\`\`

### What This Does Automatically:

1. ⬇️ **Downloads** the project from GitHub
2. 📦 **Extracts** all files
3. 🗄️ **Installs PostgreSQL** database server
4. 🔧 **Creates Database** `isp_system` with secure credentials
5. 📊 **Creates All Tables** (50+ tables from SQL scripts)
6. 🔗 **Connects Database** to system via .env.local
7. 💻 **Installs Node.js 20+** (required runtime)
8. 📚 **Installs Dependencies** (all npm packages)
9. 🏗️ **Builds Application** for production
10. ✅ **Ready to Run!**

**Installation takes 5-10 minutes. Then run:**

\`\`\`bash
npm run dev
\`\`\`

**Open http://localhost:3000 in your browser!**

---

## 🗄️ DATABASE SETUP (Automatic)

**The installer automatically handles ALL database operations:**

### PostgreSQL Installation
\`\`\`bash
✓ Installs PostgreSQL 15+
✓ Starts PostgreSQL service
✓ Enables auto-start on boot
\`\`\`

### Database Creation
\`\`\`bash
✓ Creates database: isp_system
✓ Creates user: isp_admin
✓ Generates secure random password
✓ Grants all necessary permissions
\`\`\`

### Table Creation
\`\`\`bash
✓ Runs 150+ SQL migration scripts
✓ Creates 50+ tables (customers, payments, invoices, etc.)
✓ Sets up relationships and foreign keys
✓ Creates indexes for performance
✓ Inserts sample data for testing
\`\`\`

### Connection Configuration
\`\`\`bash
✓ Generates .env.local with database URLs
✓ Saves credentials to database-credentials.txt
✓ Configures all environment variables
✓ Tests database connection
\`\`\`

**You don't need to configure ANYTHING manually!**

---

## 📋 STEP-BY-STEP INSTALLATION (If One-Command Fails)

If the one-command installation doesn't work, follow these steps:

### Step 1: Download the Project

\`\`\`bash
wget https://github.com/tmuthee9044-rgb/v0-main-project-o6/archive/refs/heads/main.zip -O isp.zip
\`\`\`

### Step 2: Extract Files

\`\`\`bash
unzip isp.zip
mv v0-main-project-o6-main isp-system
cd isp-system
\`\`\`

### Step 3: Make Install Script Executable

\`\`\`bash
chmod +x install.sh
\`\`\`

### Step 4: Run Installation

\`\`\`bash
./install.sh
\`\`\`

**Watch the installer:**
- [1/7] Installing PostgreSQL...
- [2/7] Creating database isp_system...
- [3/7] Running 150+ SQL migration scripts...
- [4/7] Installing Node.js 20+...
- [5/7] Installing npm dependencies...
- [6/7] Building application...
- [7/7] Final verification...

### Step 5: Start the System

\`\`\`bash
npm run dev
\`\`\`

### Step 6: Access the System

Open your browser: **http://localhost:3000**

---

## ✅ VERIFY YOUR INSTALLATION

**After installation, check if everything is working:**

\`\`\`bash
# Navigate to project folder
cd isp-system

# Make check script executable
chmod +x check-system.sh

# Run system health check
./check-system.sh
\`\`\`

**This verifies:**
- ✓ PostgreSQL installed and running
- ✓ Database `isp_system` exists
- ✓ Database user `isp_admin` has permissions
- ✓ All 50+ tables created successfully
- ✓ Database connection working
- ✓ Node.js 20+ installed
- ✓ npm dependencies installed
- ✓ Environment variables configured
- ✓ Application can build and run

**If any checks fail, the script tells you exactly how to fix them!**

---

## 🗄️ DATABASE CREDENTIALS

After installation, your database credentials are saved in:

**`database-credentials.txt`:**
\`\`\`
Database Name: isp_system
Database User: isp_admin
Database Password: [auto-generated 16-char password]
Connection String: postgresql://isp_admin:password@localhost:5432/isp_system
\`\`\`

**`.env.local`:**
\`\`\`env
DATABASE_URL="postgresql://isp_admin:password@localhost:5432/isp_system"
POSTGRES_URL="postgresql://isp_admin:password@localhost:5432/isp_system"
# ... and all other required connection strings
\`\`\`

⚠️ **Keep these files secure! Delete `database-credentials.txt` after noting credentials.**

---

## 🔍 DATABASE TROUBLESHOOTING

### Check PostgreSQL is Running

\`\`\`bash
sudo systemctl status postgresql
sudo systemctl start postgresql  # If not running
\`\`\`

### Check Database Exists

\`\`\`bash
sudo -u postgres psql -l | grep isp_system
\`\`\`

### Check Tables Were Created

\`\`\`bash
sudo -u postgres psql -d isp_system -c "\dt"
\`\`\`

### Count Tables (Should be 50+)

\`\`\`bash
sudo -u postgres psql -d isp_system -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
\`\`\`

### Test Database Connection

\`\`\`bash
# Using credentials from database-credentials.txt
psql -U isp_admin -d isp_system -h localhost

# Or as postgres user
sudo -u postgres psql -d isp_system
\`\`\`

### Re-run Database Migrations

\`\`\`bash
cd isp-system
for script in scripts/*.sql; do
  sudo -u postgres psql -d isp_system -f "$script"
done
\`\`\`

---

## 🛠️ COMMON INSTALLATION ISSUES

### Problem: "wget: command not found"

**Install wget:**
\`\`\`bash
sudo apt update && sudo apt install -y wget unzip
\`\`\`

### Problem: "sudo: cannot execute binary file"

**Fix sudo as root:**
\`\`\`bash
su -
apt update && apt install --reinstall sudo
chmod +x /usr/bin/sudo
usermod -aG sudo $(whoami)
exit
# Log out and log back in
\`\`\`

### Problem: "Database connection failed"

**Check PostgreSQL:**
\`\`\`bash
sudo systemctl status postgresql
sudo systemctl start postgresql
\`\`\`

**Check .env.local exists:**
\`\`\`bash
cat .env.local | grep DATABASE_URL
\`\`\`

### Problem: "No tables found"

**Run migrations manually:**
\`\`\`bash
cd isp-system
for script in scripts/*.sql; do
  sudo -u postgres psql -d isp_system -f "$script"
done
\`\`\`

### Problem: "Node.js version too old"

**The installer automatically installs Node.js 20+. If it fails:**
\`\`\`bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Should show v20.x.x
\`\`\`

### Problem: "Port 3000 already in use"

**Use different port:**
\`\`\`bash
PORT=3001 npm run dev
\`\`\`

---

## 📊 WHAT GETS INSTALLED

### Database Components:
- **PostgreSQL 15+** - Database server
- **isp_system** - Main database
- **isp_admin** - Database user
- **50+ Tables** - Complete schema
- **Sample Data** - Test data for development

### Application Components:
- **Node.js 20+** - JavaScript runtime
- **npm packages** - All dependencies
- **Next.js app** - Built and ready
- **.env.local** - Environment config
- **database-credentials.txt** - DB credentials

---

## 🚀 AFTER INSTALLATION

### Start the System

\`\`\`bash
# Development mode (with hot reload)
cd isp-system
npm run dev

# Production mode (optimized)
npm run build
npm start
\`\`\`

### Access the System

- **URL:** http://localhost:3000
- **Database:** localhost:5432
- **Admin Setup:** Create admin account on first visit

### Database Access

\`\`\`bash
# Connect to database
psql -U isp_admin -d isp_system -h localhost

# View tables
\dt

# View table structure
\d customers

# Query data
SELECT * FROM customers;
\`\`\`

---

## 🔒 SECURITY NOTES

The installation automatically implements:

✅ **Secure Passwords** - Random 16-character database password
✅ **User Isolation** - Dedicated database user (not postgres)
✅ **Local Access** - Database only accessible from localhost
✅ **Encrypted Storage** - Credentials in .env.local (gitignored)
✅ **Permission Control** - Minimal required database permissions

**After installation:**
1. Note database credentials from `database-credentials.txt`
2. Delete `database-credentials.txt` after saving credentials
3. Change default admin password on first login
4. Keep `.env.local` secure (never commit to git)

---

## 💻 SYSTEM REQUIREMENTS

- **OS:** Ubuntu 20.04+, Debian 11+, Linux Mint 20+
- **RAM:** 2GB minimum (4GB recommended)
- **Disk:** 2GB free space
- **Ports:** 3000 (web), 5432 (database)
- **Internet:** Required for initial installation only
- **Sudo Access:** Required for PostgreSQL installation

---

## 🎉 INSTALLATION COMPLETE!

Once installed, you have:

✅ **PostgreSQL** running locally on port 5432
✅ **Database** `isp_system` with 50+ tables
✅ **Secure Credentials** auto-generated and saved
✅ **Application** connected to database
✅ **Ready to Run** with `npm run dev`

**Start the system:**
\`\`\`bash
cd isp-system
npm run dev
\`\`\`

**Open http://localhost:3000 and start managing your ISP!**

---

## 🆘 NEED HELP?

### Fix Missing Database Tables/Columns

If you get errors like "relation does not exist" or "column does not exist", run this command while your app is running:

\`\`\`bash
# Start the app first
npm run dev

# In another terminal, run the database fix
curl -X POST http://localhost:3000/api/fix-database-schema
\`\`\`

**Or visit in your browser:** http://localhost:3000/api/fix-database-schema

This will automatically:
- Create missing `inventory_movements` table
- Create missing `invoice_items` table  
- Add `quantity_received` column to `purchase_order_items`
- Add `created_at` column to `account_balances`
- Verify all fixes were applied successfully

**Check database status:**
\`\`\`bash
curl http://localhost:3000/api/fix-database-schema
\`\`\`

### Run System Health Check

\`\`\`bash
cd isp-system
./check-system.sh
\`\`\`

### Check Installation Logs
The installer shows detailed logs. Look for error messages.

### Verify Database
\`\`\`bash
# Check PostgreSQL
sudo systemctl status postgresql

# Check database
sudo -u postgres psql -l | grep isp_system

# Check tables
sudo -u postgres psql -d isp_system -c "\dt"
\`\`\`

### Manual Database Setup
If automatic setup fails, see `INSTALL.md` for manual database setup instructions.

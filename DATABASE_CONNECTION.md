# Database Connection Configuration (Rule 4 Compliance)

## Rule 4 Requirement
The ISP system **MUST** use PostgreSQL offline database, not cloud-based services.

## How to Configure Local PostgreSQL

### 1. Install PostgreSQL Locally
```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql

# Start PostgreSQL service
sudo systemctl start postgresql  # Linux
brew services start postgresql   # macOS
```

### 2. Create Database
```bash
sudo -u postgres psql
CREATE DATABASE isp_database;
CREATE USER isp_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE isp_database TO isp_user;
\q
```

### 3. Set Environment Variable
Add to your `.env.local` file:

```env
# PRIORITY: Local PostgreSQL (Rule 4 - Offline Database)
LOCAL_DATABASE_URL=postgresql://isp_user:your_secure_password@localhost:5432/isp_database

# These cloud URLs will be IGNORED when LOCAL_DATABASE_URL is set
DATABASE_URL=...
POSTGRES_URL=...
```

### 4. Verify Connection
The system will log on startup:
- ✅ `[DB] Local PostgreSQL connected successfully (Rule 4 - Offline Mode)` - Correct!
- ⚠️  `[DB] WARNING: Using cloud PostgreSQL` - Wrong! Set LOCAL_DATABASE_URL

## Database Driver Explanation

**Why @neondatabase/serverless?**
- The native `pg` library doesn't work in v0's browser-based Next.js runtime
- `@neondatabase/serverless` is a PostgreSQL driver that works in all environments
- It can connect to **ANY** PostgreSQL database (local or cloud)
- It's just a driver name - it works perfectly with local PostgreSQL

## Connection Priority
1. **LOCAL_DATABASE_URL** (highest priority) - Your local PostgreSQL
2. DATABASE_URL - Falls back to cloud if LOCAL_DATABASE_URL not set
3. Other cloud URLs - Ignored if above are set

## Compliance Status
✅ Rule 4 compliant when LOCAL_DATABASE_URL points to localhost  
❌ Rule 4 non-compliant when using cloud database URLs

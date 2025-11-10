# Dual Database Migration Guide

This guide explains how to migrate all API routes to support both PostgreSQL offline and Neon serverless databases (Rule 4 compliance).

## Overview

The ISP Management System supports dual database connectivity:
- **Local PostgreSQL** (127.0.0.1:5432) for offline/development
- **Neon Serverless** for production/cloud deployment

## Current Status

- ✅ `lib/db.ts` - Dual database system configured
- ⚠️ 200+ API routes - Need migration from direct Neon imports
- ✅ Migration script - Ready to run

## Migration Process

### Step 1: Run the Migration Script

\`\`\`bash
npm run migrate:dual-db
\`\`\`

This will automatically:
1. Find all API routes and actions using direct Neon imports
2. Replace `import { neon } from "@neondatabase/serverless"` with `import { getSql } from "@/lib/db"`
3. Update `const sql = neon(process.env.DATABASE_URL!)` to `const sql = await getSql()`
4. Make handler functions async if needed
5. Add "use server" directives where missing

### Step 2: Verify the Migration

After running the script, check the summary output:
\`\`\`
📊 Migration Summary
====================================
Total files checked: 341
✅ Successfully migrated: 289
⏭️  Skipped (already migrated): 52
❌ Errors: 0
====================================
\`\`\`

### Step 3: Test the System

1. **Test with Local PostgreSQL:**
   \`\`\`bash
   # Set environment to development
   export NODE_ENV=development
   export USE_LOCAL_DB=true
   
   # Start the dev server
   npm run dev
   \`\`\`

2. **Test with Neon Serverless:**
   \`\`\`bash
   # Set environment to production
   export NODE_ENV=production
   
   # Start the server
   npm run build
   npm start
   \`\`\`

## Database Configuration

### Local PostgreSQL Setup

The system connects to local PostgreSQL with these default credentials:
- **Host:** 127.0.0.1
- **Port:** 5432
- **Database:** isp_system
- **Username:** isp_admin
- **Password:** SecurePass123!

To use custom credentials, set:
\`\`\`bash
export LOCAL_DATABASE_URL="postgresql://user:password@127.0.0.1:5432/database"
\`\`\`

### Neon Serverless Setup

Neon connection is configured via environment variables (already set in your project):
- `DATABASE_URL`
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`

## How It Works

### Automatic Detection

The `lib/db.ts` module automatically detects which database to use:

\`\`\`typescript
// Development environment
if (NODE_ENV === "development" || USE_LOCAL_DB === "true") {
  // Tries local PostgreSQL first
  // Falls back to Neon if unavailable
}

// Production environment
else {
  // Tries Neon first
  // Falls back to local PostgreSQL if unavailable
}
\`\`\`

### Connection Caching

- Singleton pattern prevents multiple connections
- Connection is cached and reused across requests
- Health checks ensure connection validity

### Activity Logging

All database operations are logged with timestamps:
\`\`\`
[DB 2025-01-05T10:30:00.000Z] INITIALIZING: {"type":"PostgreSQL (Local)","environment":"development"}
[DB 2025-01-05T10:30:00.100Z] CONNECTED: {"type":"PostgreSQL (Local)","status":"success"}
\`\`\`

## Troubleshooting

### Migration Errors

If the migration script reports errors:

1. **Check file permissions:**
   \`\`\`bash
   chmod +x scripts/migrate-all-routes-to-dual-db.js
   \`\`\`

2. **Review error messages:**
   The script will show which files failed and why

3. **Manual migration:**
   For files that fail automatic migration, update manually:
   \`\`\`typescript
   // Before
   import { neon } from "@neondatabase/serverless"
   const sql = neon(process.env.DATABASE_URL!)
   
   // After
   import { getSql } from "@/lib/db"
   const sql = await getSql()
   \`\`\`

### Connection Issues

**Local PostgreSQL not connecting:**
\`\`\`bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -h 127.0.0.1 -U isp_admin -d isp_system
\`\`\`

**Neon not connecting:**
\`\`\`bash
# Verify environment variables
echo $DATABASE_URL
\`\`\`

## Benefits

After migration, your system will:
- ✅ Work offline with local PostgreSQL
- ✅ Work online with Neon serverless
- ✅ Automatically detect and switch between databases
- ✅ Provide fallback if primary database is unavailable
- ✅ Log all database activity for debugging
- ✅ Maintain fast performance with connection caching

## Next Steps

1. Run the migration: `npm run migrate:dual-db`
2. Test both database connections
3. Deploy to production with confidence
4. Monitor logs for any connection issues

## Support

If you encounter issues:
1. Check the debug logs in the browser console
2. Review the database connection logs
3. Verify environment variables are set correctly
4. Ensure PostgreSQL is running (for local development)

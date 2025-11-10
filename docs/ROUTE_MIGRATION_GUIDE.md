# Route Migration Guide: Dual Database System

## Overview

This guide explains how to migrate API routes from direct Neon imports to the dual database system that supports both Neon serverless and local PostgreSQL.

## Migration Pattern

### Before (Direct Neon Import)
\`\`\`typescript
import { neon } from "@neondatabase/serverless"
const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  const result = await sql`SELECT * FROM customers`
  return NextResponse.json(result)
}
\`\`\`

### After (Dual Database System)
\`\`\`typescript
import { getSql } from "@/lib/db"

export async function GET() {
  const sql = await getSql()  // Automatically detects and connects to available database
  const result = await sql`SELECT * FROM customers`
  return NextResponse.json(result)
}
\`\`\`

## Key Changes

1. **Import Statement**: Replace `import { neon } from "@neondatabase/serverless"` with `import { getSql } from "@/lib/db"`

2. **SQL Initialization**: Replace `const sql = neon(process.env.DATABASE_URL!)` with `const sql = await getSql()`

3. **Async Requirement**: The `getSql()` function is async, so it must be called with `await`

## Benefits

- **Automatic Detection**: System automatically detects which database is available
- **Environment-Based**: Uses Neon in production, local PostgreSQL in development
- **Fallback Support**: Automatically falls back to alternative database if primary is unavailable
- **Activity Logging**: All database operations are logged for audit trails
- **Connection Pooling**: Optimized connection management for both databases

## Routes Migrated

### Critical Routes (Completed)
- ✅ `/api/auth/login` - Authentication
- ✅ `/api/customers` - Customer management
- ✅ `/api/dashboard/metrics` - Dashboard metrics

### Remaining Routes (200+)
All other API routes need to follow the same migration pattern. Use the migration script to identify routes that need updating:

\`\`\`bash
npm run migrate:check-routes
\`\`\`

## Testing

After migration, test each route to ensure:
1. Database connection works in both environments
2. Queries execute correctly
3. Error handling works properly
4. Activity logging captures operations

## Troubleshooting

If you encounter issues:
1. Check `/api/database/health` endpoint for database status
2. Review logs in the database activity log
3. Verify environment variables are set correctly
4. Ensure both databases have matching schemas

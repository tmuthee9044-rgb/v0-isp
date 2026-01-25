# Smart Database Connection Guide

## Overview

The ISP Management System uses a **smart database connector** that automatically detects whether to use **Neon Serverless** or **Local PostgreSQL** based on your `DATABASE_URL`.

## How It Works

The system checks the hostname in your `DATABASE_URL`:

- **Contains `neon.tech`** → Uses Neon Serverless driver
- **Contains `localhost` or `127.0.0.1`** → Uses local PostgreSQL (pg) driver
- **Other hosts** → Throws an error

## Configuration

### Local Development

\`\`\`env
# .env.local
DATABASE_URL=postgresql://isp_admin:SecurePass123!@localhost:5432/isp_system
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
\`\`\`

### Production (Neon)

\`\`\`env
# Vercel Environment Variables
DATABASE_URL=postgresql://username:password@ep-xxx.neon.tech/dbname?sslmode=require
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
\`\`\`

## Usage Examples

### Basic Query

\`\`\`typescript
import sql from "@/lib/db";

// Works with both Neon and local PostgreSQL
const users = await sql("SELECT * FROM customers WHERE status = $1", ["active"]);
\`\`\`

### API Route Example

\`\`\`typescript
import sql from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await sql(
      "SELECT COUNT(*) as count FROM customers WHERE status = $1",
      ["active"]
    );
    
    return NextResponse.json({ count: result[0]?.count || 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
\`\`\`

### Transaction Example

\`\`\`typescript
import sql from "@/lib/db";

// Only works with local PostgreSQL (Neon doesn't support this pattern)
if (sql.transaction) {
  await sql.transaction(async (tx) => {
    await tx("INSERT INTO customers (name, email) VALUES ($1, $2)", ["John", "john@example.com"]);
    await tx("INSERT INTO activity_logs (action, details) VALUES ($1, $2)", ["customer_created", "John"]);
  });
}
\`\`\`

### Server Action Example

\`\`\`typescript
"use server";

import sql from "@/lib/db";

export async function createCustomer(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  try {
    const result = await sql(
      "INSERT INTO customers (name, email, status) VALUES ($1, $2, $3) RETURNING id",
      [name, email, "active"]
    );
    
    return { success: true, id: result[0].id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
\`\`\`

## Benefits

✅ **No manual switching** - Automatically detects database type  
✅ **Unified API** - Same code works for both databases  
✅ **Zero configuration** - Just set DATABASE_URL  
✅ **Clear logging** - Console shows which database is being used  
✅ **Type-safe** - Full TypeScript support  

## Troubleshooting

### "Could not connect to database"

**Check your DATABASE_URL:**
\`\`\`bash
echo $DATABASE_URL
\`\`\`

**For local PostgreSQL:**
- Ensure PostgreSQL is running: `sudo systemctl status postgresql`
- Verify credentials: `psql -U isp_admin -d isp_system`

**For Neon:**
- Check your Neon dashboard for correct connection string
- Ensure `?sslmode=require` is appended

### "Unknown database host"

Your DATABASE_URL doesn't contain `neon.tech`, `localhost`, or `127.0.0.1`.

**Fix:** Update your DATABASE_URL to use one of the supported hosts.

## Migration from Old System

If you have existing code using `@neondatabase/serverless` directly:

**Before:**
\`\`\`typescript
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
\`\`\`

**After:**
\`\`\`typescript
import sql from "@/lib/db";
// That's it! The webpack alias handles the rest
\`\`\`

All 200+ files with direct imports are automatically redirected to use the smart connector via webpack aliasing in `next.config.mjs`.

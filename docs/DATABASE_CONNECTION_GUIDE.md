# Database Connection Guide: Neon Serverless & Offline PostgreSQL

This guide explains how the ISP Management System supports both **Neon Serverless Database** (cloud) and **Offline PostgreSQL** (local) with automatic detection and seamless switching.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How It Works](#how-it-works)
3. [Configuration Examples](#configuration-examples)
4. [Code Examples](#code-examples)
5. [Switching Between Databases](#switching-between-databases)
6. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The system uses a **smart wrapper** (`lib/neon-wrapper.ts`) that automatically detects which database to use based on the `DATABASE_URL` environment variable:

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application Code                     │
│                                                              │
│  import { sql } from '@neondatabase/serverless'             │
│  (automatically aliased to lib/neon-wrapper.ts)             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              lib/neon-wrapper.ts (Smart Router)             │
│                                                              │
│  Detects DATABASE_URL and chooses the right driver:         │
│  • localhost/127.0.0.1 → PostgreSQL Driver (pg)            │
│  • Cloud URL → Neon Serverless Driver                       │
└──────────────────┬────────────────────────────────┬─────────┘
                   │                                │
                   ▼                                ▼
    ┌──────────────────────────┐    ┌──────────────────────────┐
    │   PostgreSQL (Offline)   │    │   Neon Serverless (Cloud)│
    │   Port: 5432             │    │   HTTPS Connection       │
    │   Local Network          │    │   Internet Required      │
    └──────────────────────────┘    └──────────────────────────┘
```

---

## How It Works

### 1. Automatic Detection

The neon-wrapper checks your `DATABASE_URL` and automatically selects the appropriate driver:

```typescript
// lib/neon-wrapper.ts (simplified)
const databaseUrl = process.env.DATABASE_URL || '';
const isLocalPostgres = 
  databaseUrl.includes('localhost') || 
  databaseUrl.includes('127.0.0.1');

if (isLocalPostgres) {
  // Use standard PostgreSQL driver (pg)
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: databaseUrl });
  // Return pg-compatible interface
} else {
  // Use Neon serverless driver
  const { neon } = require('@neondatabase/serverless');
  return neon(databaseUrl);
}
```

### 2. Webpack Module Aliasing

The `next.config.mjs` automatically redirects all imports:

```javascript
// next.config.mjs
webpack: (config) => {
  config.resolve.alias['@neondatabase/serverless'] = 
    path.resolve('./lib/neon-wrapper.ts');
  return config;
}
```

This means **you never need to change your import statements** - they work for both databases!

---

## Configuration Examples

### Option 1: Offline PostgreSQL (Local Development)

**Environment Variables (.env.local):**

```bash
# Offline PostgreSQL Configuration
DATABASE_URL=postgresql://isp_admin:SecurePass123!@localhost:5432/isp_system
POSTGRES_URL=postgresql://isp_admin:SecurePass123!@localhost:5432/isp_system
POSTGRES_PRISMA_URL=postgresql://isp_admin:SecurePass123!@localhost:5432/isp_system

# Optional: PostgreSQL connection details (for scripts)
PGHOST=localhost
PGPORT=5432
PGUSER=isp_admin
PGPASSWORD=SecurePass123!
PGDATABASE=isp_system
```

**When to use:**
- Local development without internet
- Testing and debugging
- Faster queries (no network latency)
- Full control over database

**Setup:**
```bash
# Run the installation script
./install.sh

# Or manually set up PostgreSQL
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
createdb isp_system
```

---

### Option 2: Neon Serverless (Cloud Production)

**Environment Variables (.env.local):**

```bash
# Neon Serverless Configuration
DATABASE_URL=postgresql://user:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
POSTGRES_URL=postgresql://user:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
POSTGRES_PRISMA_URL=postgresql://user:password@ep-cool-darkness-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require

# Neon-specific variables
PGHOST=ep-cool-darkness-123456.us-east-2.aws.neon.tech
PGUSER=user
PGPASSWORD=password
PGDATABASE=neondb
```

**When to use:**
- Production deployment
- Serverless environments (Vercel, AWS Lambda)
- Automatic scaling needed
- No server maintenance

**Setup:**
1. Create a Neon account at https://neon.tech
2. Create a new project
3. Copy the connection string
4. Add to your environment variables

---

## Code Examples

### Example 1: Basic Query (Works with Both Databases)

```typescript
// app/api/customers/route.ts
import { sql } from '@neondatabase/serverless';

export async function GET() {
  try {
    // This works with BOTH PostgreSQL and Neon!
    const result = await sql`
      SELECT id, name, email, status 
      FROM customers 
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return Response.json({ 
      customers: result.rows || result,
      count: result.rowCount || result.length 
    });
  } catch (error) {
    console.error('Database error:', error);
    return Response.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
```

### Example 2: Parameterized Query

```typescript
// app/api/customers/[id]/route.ts
import { sql } from '@neondatabase/serverless';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = parseInt(params.id);

    // Parameterized query - safe from SQL injection
    const result = await sql`
      SELECT * FROM customers 
      WHERE id = ${customerId}
    `;

    const customer = result.rows?.[0] || result[0];

    if (!customer) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }

    return Response.json({ customer });
  } catch (error) {
    console.error('Database error:', error);
    return Response.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}
```

### Example 3: Transaction (PostgreSQL Only)

```typescript
// app/api/payments/process/route.ts
import { sql } from '@neondatabase/serverless';

export async function POST(request: Request) {
  const { customerId, amount, paymentMethod } = await request.json();

  try {
    // Start transaction
    await sql`BEGIN`;

    // Insert payment record
    const paymentResult = await sql`
      INSERT INTO payments (customer_id, amount, payment_method, status, payment_date)
      VALUES (${customerId}, ${amount}, ${paymentMethod}, 'completed', NOW())
      RETURNING id
    `;

    const paymentId = paymentResult.rows?.[0]?.id || paymentResult[0]?.id;

    // Update customer balance
    await sql`
      UPDATE customers 
      SET balance = balance - ${amount},
          last_payment_date = NOW()
      WHERE id = ${customerId}
    `;

    // Log activity
    await sql`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
      VALUES (${customerId}, 'payment_processed', 'payment', ${paymentId}, 
              ${JSON.stringify({ amount, method: paymentMethod })})
    `;

    // Commit transaction
    await sql`COMMIT`;

    return Response.json({ 
      success: true, 
      paymentId,
      message: 'Payment processed successfully' 
    });
  } catch (error) {
    // Rollback on error
    await sql`ROLLBACK`;
    console.error('Payment processing error:', error);
    return Response.json({ error: 'Payment failed' }, { status: 500 });
  }
}
```

### Example 4: Server Action with Database

```typescript
// app/actions/customer-actions.ts
'use server';

import { sql } from '@neondatabase/serverless';
import { revalidatePath } from 'next/cache';

export async function createCustomer(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;

  try {
    const result = await sql`
      INSERT INTO customers (name, email, phone, status, created_at)
      VALUES (${name}, ${email}, ${phone}, 'active', NOW())
      RETURNING id, name, email
    `;

    const customer = result.rows?.[0] || result[0];

    // Revalidate the customers page
    revalidatePath('/customers');

    return { 
      success: true, 
      customer,
      message: 'Customer created successfully' 
    };
  } catch (error) {
    console.error('Error creating customer:', error);
    return { 
      success: false, 
      error: 'Failed to create customer' 
    };
  }
}
```

### Example 5: Using with React Server Components

```typescript
// app/dashboard/page.tsx
import { sql } from '@neondatabase/serverless';

async function getMetrics() {
  const result = await sql`
    SELECT 
      COUNT(*) as total_customers,
      COUNT(*) FILTER (WHERE status = 'active') as active_customers,
      SUM(balance) as total_balance
    FROM customers
  `;

  return result.rows?.[0] || result[0];
}

export default async function DashboardPage() {
  const metrics = await getMetrics();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Total Customers</h3>
          <p className="text-3xl font-bold">{metrics.total_customers}</p>
        </div>
        
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Active Customers</h3>
          <p className="text-3xl font-bold">{metrics.active_customers}</p>
        </div>
        
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Total Balance</h3>
          <p className="text-3xl font-bold">KES {metrics.total_balance}</p>
        </div>
      </div>
    </div>
  );
}
```

---

## Switching Between Databases

### From Offline PostgreSQL to Neon Serverless

1. **Export your data:**
   ```bash
   pg_dump -U isp_admin isp_system > backup.sql
   ```

2. **Create Neon database and import:**
   ```bash
   psql -h your-neon-host.neon.tech -U your-user -d neondb < backup.sql
   ```

3. **Update .env.local:**
   ```bash
   # Replace localhost URL with Neon URL
   DATABASE_URL=postgresql://user:pass@your-neon-host.neon.tech/neondb?sslmode=require
   ```

4. **Restart your application:**
   ```bash
   npm run dev
   ```

### From Neon Serverless to Offline PostgreSQL

1. **Export from Neon:**
   ```bash
   pg_dump -h your-neon-host.neon.tech -U your-user neondb > backup.sql
   ```

2. **Set up local PostgreSQL:**
   ```bash
   ./install.sh
   ```

3. **Import data:**
   ```bash
   psql -U isp_admin -d isp_system < backup.sql
   ```

4. **Update .env.local:**
   ```bash
   DATABASE_URL=postgresql://isp_admin:SecurePass123!@localhost:5432/isp_system
   ```

5. **Restart your application:**
   ```bash
   npm run dev
   ```

---

## Troubleshooting

### Issue 1: "ECONNREFUSED 127.0.0.1:443"

**Cause:** The system is trying to use Neon serverless driver for a localhost URL.

**Solution:**
```bash
# Check your DATABASE_URL
echo $DATABASE_URL

# It should contain "localhost" or "127.0.0.1" for offline PostgreSQL
# If it contains a cloud URL, update .env.local:
DATABASE_URL=postgresql://isp_admin:SecurePass123!@localhost:5432/isp_system

# Restart the dev server
npm run dev
```

### Issue 2: "password authentication failed for user 'isp_admin'"

**Cause:** PostgreSQL user password doesn't match .env.local

**Solution:**
```bash
# Reset the password in PostgreSQL
sudo -u postgres psql -c "ALTER USER isp_admin WITH PASSWORD 'SecurePass123!';"

# Or run the installation script to fix it
./install.sh --fix-db
```

### Issue 3: "relation 'customers' does not exist"

**Cause:** Database tables haven't been created

**Solution:**
```bash
# Run migrations
./install.sh

# Or manually create tables
psql -U isp_admin -d isp_system -f scripts/000_complete_schema.sql
```

### Issue 4: Module aliasing not working

**Cause:** Next.js config not loaded or cached build

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
npm install

# Restart dev server
npm run dev
```

### Issue 5: Slow queries on Neon

**Cause:** Cold start or network latency

**Solution:**
- Use connection pooling (Neon automatically provides this)
- Enable Neon's autoscaling
- Consider caching frequently accessed data
- Use React Server Components to reduce client-side queries

---

## Best Practices

### 1. Always Use Parameterized Queries

✅ **Good:**
```typescript
const result = await sql`SELECT * FROM customers WHERE id = ${customerId}`;
```

❌ **Bad (SQL Injection Risk):**
```typescript
const result = await sql`SELECT * FROM customers WHERE id = ${customerId}`;
```

### 2. Handle Both Result Formats

```typescript
// The wrapper normalizes results, but be defensive
const result = await sql`SELECT * FROM customers`;
const customers = result.rows || result;
```

### 3. Use Transactions for Multi-Step Operations

```typescript
try {
  await sql`BEGIN`;
  // Multiple operations
  await sql`COMMIT`;
} catch (error) {
  await sql`ROLLBACK`;
  throw error;
}
```

### 4. Log Database Errors Properly

```typescript
try {
  const result = await sql`...`;
} catch (error) {
  console.error('[Database Error]', {
    message: error.message,
    query: 'SELECT ...',
    timestamp: new Date().toISOString()
  });
  // Log to activity_logs table
  await sql`INSERT INTO activity_logs (action, details) VALUES ('error', ${JSON.stringify(error)})`;
}
```

### 5. Use Environment-Specific Configurations

```typescript
// lib/db-config.ts
export const dbConfig = {
  maxConnections: process.env.NODE_ENV === 'production' ? 20 : 5,
  idleTimeout: 30000,
  connectionTimeout: 10000,
};
```

---

## Testing Database Connections

### Test Script

```bash
# Run the comprehensive database test
bash scripts/test-database-connection.sh
```

### Manual Testing

```typescript
// scripts/test-connection.ts
import { sql } from '@neondatabase/serverless';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
    
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    const row = result.rows?.[0] || result[0];
    
    console.log('✅ Connection successful!');
    console.log('Current time:', row.current_time);
    console.log('PostgreSQL version:', row.pg_version);
    
    // Test table access
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('\n📊 Available tables:', (tables.rows || tables).map(t => t.table_name));
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }
}

testConnection();
```

Run with:
```bash
npx tsx scripts/test-connection.ts
```

---

## Summary

| Feature | Offline PostgreSQL | Neon Serverless |
|---------|-------------------|-----------------|
| **Setup** | Requires local installation | Cloud-based, instant |
| **Internet** | Not required | Required |
| **Performance** | Fast (local) | Network latency |
| **Scaling** | Manual | Automatic |
| **Cost** | Free (self-hosted) | Pay-as-you-go |
| **Maintenance** | Manual updates | Managed |
| **Best For** | Development, testing | Production, serverless |

**The beauty of this system:** You write your code once, and it works with both databases automatically! 🎉

---

## Additional Resources

- [Neon Documentation](https://neon.tech/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Next.js Database Guide](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [SQL Best Practices](https://www.postgresql.org/docs/current/sql.html)

---

**Need Help?** Check the troubleshooting section or run `bash scripts/test-database-connection.sh` to diagnose issues.

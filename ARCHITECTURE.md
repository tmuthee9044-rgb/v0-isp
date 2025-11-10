# ISP Management System - Architecture Documentation

## Database Connection Architecture

### Problem Statement
The system was experiencing recurring connection errors where 200+ files were importing directly from `@neondatabase/serverless`, causing the application to attempt cloud database connections (127.0.0.1:443) instead of using the local PostgreSQL database (localhost:5432).

### Solution: Module Aliasing

We implemented a **permanent architectural solution** using Next.js webpack module aliasing to automatically redirect all database imports.

#### How It Works

1. **Webpack Alias Configuration** (`next.config.mjs`)
   \`\`\`javascript
   config.resolve.alias = {
     '@neondatabase/serverless': path.resolve(__dirname, 'lib/neon-wrapper.ts'),
   }
   \`\`\`
   - All imports to `@neondatabase/serverless` are automatically redirected to our wrapper
   - No code changes needed in 200+ files
   - Works transparently at build time

2. **Smart Database Wrapper** (`lib/neon-wrapper.ts`)
   - Detects if DATABASE_URL points to localhost or cloud
   - Uses `pg` driver for local PostgreSQL (offline support)
   - Uses `@neondatabase/serverless` for cloud databases (Neon)
   - Provides Neon-compatible API for seamless switching

3. **Benefits**
   - ✅ Zero code changes required in existing files
   - ✅ Future-proof - new files automatically use the wrapper
   - ✅ Supports both offline PostgreSQL and cloud Neon
   - ✅ Automatic driver selection based on connection string
   - ✅ Connection pooling and caching for performance

### Database Connection Flow

\`\`\`
Application Code
    ↓
import { neon } from '@neondatabase/serverless'
    ↓
[Webpack Alias Redirect]
    ↓
lib/neon-wrapper.ts
    ↓
Check DATABASE_URL
    ↓
├─ localhost? → Use pg driver (offline PostgreSQL)
└─ cloud URL? → Use @neondatabase/serverless (Neon)
\`\`\`

### Environment Variables

**Local PostgreSQL (Offline)**
\`\`\`bash
DATABASE_URL=postgresql://isp_admin:SecurePass123!@localhost:5432/isp_system
\`\`\`

**Cloud Database (Neon)**
\`\`\`bash
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require
\`\`\`

The wrapper automatically detects which driver to use based on the URL.

### Testing the Connection

Run the database test script:
\`\`\`bash
bash scripts/test-database-connection.sh
\`\`\`

This verifies:
- PostgreSQL service is running
- Database credentials are correct
- All 12 required tables exist
- CRUD operations work
- Wrapper is using the correct driver

### Troubleshooting

If you still see Neon connection errors:

1. **Check DATABASE_URL**
   \`\`\`bash
   cat .env.local | grep DATABASE_URL
   \`\`\`
   Should show `localhost` or `127.0.0.1`, not a Neon URL

2. **Restart the dev server**
   \`\`\`bash
   npm run dev
   \`\`\`
   The webpack alias only applies after restart

3. **Clear Next.js cache**
   \`\`\`bash
   rm -rf .next
   npm run dev
   \`\`\`

4. **Verify the wrapper is being used**
   Check console logs for: `[v0] Using local PostgreSQL connection (pg driver)`

### Migration from Old Architecture

**Before (Manual Fix Required)**
- 200+ files importing `@neondatabase/serverless` directly
- Each file needed manual update to use wrapper
- Error-prone and time-consuming

**After (Automatic)**
- Webpack alias handles all imports automatically
- No file modifications needed
- Transparent and maintainable

### Performance Considerations

- **Connection Pooling**: The wrapper uses pg Pool with 20 max connections
- **Caching**: Database clients are cached per connection string
- **Timeouts**: 5s connection timeout, 10s query timeout
- **Graceful Shutdown**: Pools are properly closed on SIGTERM

### Security

- Credentials stored in `.env.local` (gitignored)
- Connection pooling prevents connection exhaustion
- Query timeouts prevent long-running queries
- Transaction support with automatic rollback on errors

---

**Last Updated**: 2025-01-29
**Architecture Version**: 2.0 (Module Aliasing)
</parameter>
